import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const NOTIF_KEYS = {
  push: "@allgood:notif_push",
  transfers: "@allgood:notif_transfers",
  promotions: "@allgood:notif_promotions",
};
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Goodi } from "@/components/Goodi";
import { ScreenLayout } from "@/components/ScreenLayout";
import type {
  Language,
  TextSize,
  ThemeColor,
  ThemePreference,
} from "@/contexts/AppContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTextScale } from "@/hooks/useTextScale";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  getBiometricPreference,
  getBiometricType,
  isBiometricAvailable,
  setBiometricPreference,
} from "@/lib/biometrics";
import { hapticLight } from "@/lib/haptics";
import { isRafikiConfigured } from "@/lib/rafiki";
import { fontSizes, fontWeights, radii, spacing } from "@/constants/theme";

// ─── Cycle helpers ──────────────────────────────────────────────────────────

function cycleLanguage(current: Language): Language {
  const order: Language[] = ["en", "es", "pt"];
  return order[(order.indexOf(current) + 1) % order.length];
}

function cycleTheme(current: ThemePreference): ThemePreference {
  const order: ThemePreference[] = ["system", "light", "dark"];
  return order[(order.indexOf(current) + 1) % order.length];
}

function cycleTextSize(current: TextSize): TextSize {
  const order: TextSize[] = ["small", "medium", "large"];
  return order[(order.indexOf(current) + 1) % order.length];
}

function cycleThemeColor(current: ThemeColor): ThemeColor {
  const order: ThemeColor[] = ["teal", "blue", "coral"];
  return order[(order.indexOf(current) + 1) % order.length];
}

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "EN 🇺🇸",
  es: "ES 🇪🇸",
  pt: "PT 🇧🇷",
};

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const THEME_COLOR_HEX: Record<ThemeColor, string> = {
  teal: "#10b981",
  blue: "#3b82f6",
  coral: "#f97316",
};

const ICON_BG: Record<string, string> = {
  language: "#7F77DD",
  appearance: "#3b82f6",
  textSize: "#f97316",
  themeColor: "#ec4899",
  biometric: "#10b981",
  password: "#6366f1",
  twoFactor: "#8b5cf6",
  pushNotif: "#06b6d4",
  transferAlerts: "#14b8a6",
  promotions: "#a3a3a3",
  rafikiStatus: "#7F77DD",
  helpCenter: "#0ea5e9",
  contactUs: "#6366f1",
  bugReport: "#ef4444",
  rate: "#f59e0b",
  share: "#7F77DD",
  signOut: "#ef4444",
};

// ─── Animated row ────────────────────────────────────────────────────────────

interface RowProps {
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  valueText?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  isDestructive?: boolean;
  isLast?: boolean;
  borderColor: string;
}

function SettingsRow({
  iconName,
  iconBg,
  label,
  valueText,
  onPress,
  rightElement,
  showChevron = true,
  isDestructive = false,
  isLast = false,
  borderColor,
}: RowProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, { damping: 20, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  }, [scale]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={label}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? colors.overlay : "transparent" },
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons
            name={iconName}
            size={17}
            color="#fff"
          />
        </View>

        {/* Label */}
        <Text
          style={[
            styles.rowLabel,
            {
              color: isDestructive ? colors.error : colors.text,
              flex: 1,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>

        {/* Right side */}
        {rightElement ?? (
          <View style={styles.rowRight}>
            {valueText !== undefined && (
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                {valueText}
              </Text>
            )}
            {showChevron && (
              <Ionicons
                name="chevron-forward"
                size={15}
                color={colors.textTertiary}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        )}
      </Pressable>

      {/* Divider */}
      {!isLast && (
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
      )}
    </Animated.View>
  );
}

// ─── Section card wrapper ────────────────────────────────────────────────────

interface SectionCardProps {
  children: React.ReactNode;
  cardBg: string;
  borderColor: string;
}

function SectionCard({ children, cardBg, borderColor }: SectionCardProps) {
  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: cardBg, borderColor },
      ]}
    >
      {children}
    </View>
  );
}

// ─── Section label ───────────────────────────────────────────────────────────

function SectionLabel({ text, color }: { text: string; color: string }) {
  return (
    <Text style={[styles.sectionLabel, { color }]}>{text.toUpperCase()}</Text>
  );
}

// ─── Toast notice ────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(20, { duration: 200 });
    }
  }, [visible, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.toast, animStyle]} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={18} color="#10b981" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Profile card ─────────────────────────────────────────────────────────────

interface ProfileCardProps {
  initials: string;
  fullName: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  memberSince?: string;
  gradientColors: readonly string[];
  cardBg: string;
  borderColor: string;
  textColor: string;
  textSecondary: string;
  onEditPress: () => void;
  primary: string;
}

function ProfileCard({
  initials,
  fullName,
  email,
  phone,
  country,
  memberSince,
  gradientColors,
  cardBg,
  borderColor,
  textColor,
  textSecondary,
  onEditPress,
  primary,
}: ProfileCardProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={[
        styles.profileCard,
        { backgroundColor: cardBg, borderColor },
      ]}
    >
      {/* Avatar */}
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        style={styles.avatarCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.avatarInitials}>{initials}</Text>
      </LinearGradient>

      {/* Info */}
      <Text style={[styles.profileName, { color: textColor }]} numberOfLines={1}>
        {fullName}
      </Text>
      <Text style={[styles.profileEmail, { color: textSecondary }]} numberOfLines={1}>
        {email}
      </Text>

      {(phone || country) && (
        <View style={styles.profileMeta}>
          {phone && (
            <View style={styles.profileMetaItem}>
              <Ionicons name="call-outline" size={12} color={textSecondary} />
              <Text style={[styles.profileMetaText, { color: textSecondary }]}>
                {phone}
              </Text>
            </View>
          )}
          {country && (
            <View style={styles.profileMetaItem}>
              <Ionicons name="location-outline" size={12} color={textSecondary} />
              <Text style={[styles.profileMetaText, { color: textSecondary }]}>
                {country}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Member since badge */}
      {memberSince && (
        <View style={[styles.memberBadge, { borderColor: primary + "40", backgroundColor: primary + "12" }]}>
          <Ionicons name="ribbon-outline" size={11} color={primary} />
          <Text style={[styles.memberBadgeText, { color: primary }]}>
            Member since {memberSince}
          </Text>
        </View>
      )}

      {/* Edit button */}
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onEditPress}
          onPressIn={() => { scale.value = withSpring(0.97, { damping: 20 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 20 }); }}
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
          style={[styles.editBtn, { borderColor: primary + "50", backgroundColor: primary + "10" }]}
        >
          <Ionicons name="pencil-outline" size={14} color={primary} />
          <Text style={[styles.editBtnText, { color: primary }]}>Edit profile</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useThemeColors();
  const fs = useTextScale();
  const { preferences, setPreferences } = useApp();
  const { signOut: authSignOut, profile, resetPassword, refreshProfile } = useAuth();

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometric");

  // Notification toggles — persisted via AsyncStorage
  const [pushEnabled, setPushEnabled] = useState(true);
  const [transferAlertsEnabled, setTransferAlertsEnabled] = useState(true);
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);

  // Notice toast
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit profile modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // Load biometric state
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        const type = await getBiometricType();
        setBiometricLabel(type);
        const enabled = await getBiometricPreference();
        setBiometricEnabled(enabled);
      }
      // Load persisted notification prefs
      try {
        const [push, transfers, promos] = await AsyncStorage.multiGet([
          NOTIF_KEYS.push, NOTIF_KEYS.transfers, NOTIF_KEYS.promotions,
        ]);
        if (push[1] !== null) setPushEnabled(push[1] === "true");
        if (transfers[1] !== null) setTransferAlertsEnabled(transfers[1] === "true");
        if (promos[1] !== null) setPromotionsEnabled(promos[1] === "true");
      } catch { /* ignore — defaults already set */ }
    })();
  }, []);

  const showNotice = useCallback((message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  const handleSignOut = () => {
    hapticLight();
    authSignOut(); // state clears immediately — no await needed
    router.replace("/"); // root index.tsx detects user===null → redirects to onboarding
  };

  const openURL = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else showNotice("Could not open the link on this device.");
    } catch {
      showNotice("Could not open the link on this device.");
    }
  };

  const handleShare = async () => {
    hapticLight();
    try {
      await Share.share({
        message:
          "Check out AllGood — the app built for immigrants to send money home, build credit, and learn the financial system. No SSN required. allgood.app",
      });
    } catch {
      // user dismissed
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    hapticLight();
    setBiometricEnabled(value);
    await setBiometricPreference(value);
  };

  const openEditModal = () => {
    hapticLight();
    setEditName(profile?.full_name ?? "");
    setEditPhone(profile?.phone ?? "");
    setEditCountry(profile?.country ?? "");
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim() || profile.full_name,
          phone: editPhone.trim() || null,
          country: editCountry.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      setEditModalVisible(false);
      await refreshProfile(); // update profile card immediately
      showNotice("Profile updated successfully.");
    } catch (e: unknown) {
      showNotice(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setEditSaving(false);
    }
  };

  // Derived profile data
  const fullName = profile?.full_name || "AllGood User";
  const email = profile?.email || "";
  const phone = profile?.phone ?? null;
  const country = profile?.country ?? null;
  const initials = fullName
    .split(" ")
    .map((w: string) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AG";

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ScreenLayout
      topPadding={spacing.xl}
      horizontalPadding={spacing.lg}
      overlay={<Goodi screen="settings" />}
    >
      {/* Page title */}
      <Text style={[styles.pageTitle, { color: colors.text, fontSize: fs(28) }]}>
        Settings
      </Text>

      {/* ── Profile card ─────────────────────────── */}
      <ProfileCard
        initials={initials}
        fullName={fullName}
        email={email}
        phone={phone}
        country={country}
        memberSince={memberSince ?? undefined}
        gradientColors={colors.gradientAccent}
        cardBg={colors.cardBg}
        borderColor={colors.border}
        textColor={colors.text}
        textSecondary={colors.textSecondary}
        primary={colors.primary}
        onEditPress={openEditModal}
      />

      {/* ── Personalization ──────────────────────── */}
      <SectionLabel text="Personalization" color={colors.textSecondary} />
      <SectionCard cardBg={colors.cardBg} borderColor={colors.border}>
        <SettingsRow
          iconName="language-outline"
          iconBg={ICON_BG.language}
          label="Language"
          valueText={LANGUAGE_LABELS[preferences.language]}
          borderColor={colors.border}
          onPress={() => {
            hapticLight();
            setPreferences({ language: cycleLanguage(preferences.language) });
          }}
        />
        <SettingsRow
          iconName="sunny-outline"
          iconBg={ICON_BG.appearance}
          label="Appearance"
          valueText={THEME_LABELS[preferences.theme]}
          borderColor={colors.border}
          onPress={() => {
            hapticLight();
            setPreferences({ theme: cycleTheme(preferences.theme) });
          }}
        />
        <SettingsRow
          iconName="text-outline"
          iconBg={ICON_BG.textSize}
          label="Text size"
          valueText={TEXT_SIZE_LABELS[preferences.textSize]}
          borderColor={colors.border}
          onPress={() => {
            hapticLight();
            setPreferences({ textSize: cycleTextSize(preferences.textSize) });
          }}
        />
        <SettingsRow
          iconName="color-palette-outline"
          iconBg={ICON_BG.themeColor}
          label="Theme color"
          borderColor={colors.border}
          showChevron={false}
          isLast
          onPress={() => {
            hapticLight();
            setPreferences({ themeColor: cycleThemeColor(preferences.themeColor) });
          }}
          rightElement={
            <View style={styles.colorDots}>
              {(["teal", "blue", "coral"] as ThemeColor[]).map((c) => (
                <View
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: THEME_COLOR_HEX[c] },
                    preferences.themeColor === c && styles.colorDotActive,
                  ]}
                />
              ))}
            </View>
          }
        />
      </SectionCard>

      {/* ── Security & Privacy ───────────────────── */}
      <SectionLabel text="Security & Privacy" color={colors.textSecondary} />
      <SectionCard cardBg={colors.cardBg} borderColor={colors.border}>
        {biometricAvailable && (
          <SettingsRow
            iconName="finger-print-outline"
            iconBg={ICON_BG.biometric}
            label={biometricLabel}
            borderColor={colors.border}
            showChevron={false}
            onPress={() => handleBiometricToggle(!biometricEnabled)}
            rightElement={
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{
                  false: colors.border,
                  true: colors.primary + "80",
                }}
                thumbColor={biometricEnabled ? colors.primary : colors.textTertiary}
                accessibilityLabel={`${biometricLabel} toggle`}
              />
            }
          />
        )}
        <SettingsRow
          iconName="lock-closed-outline"
          iconBg={ICON_BG.password}
          label="Change password"
          borderColor={colors.border}
          onPress={async () => {
            hapticLight();
            if (!profile?.email) {
              showNotice("No email on file. Please contact support.");
              return;
            }
            const { error } = await resetPassword(profile.email);
            if (error) {
              showNotice(`Could not send reset email: ${error}`);
            } else {
              showNotice(`Reset link sent to ${profile.email}. Check your inbox.`);
            }
          }}
        />
        <SettingsRow
          iconName="shield-checkmark-outline"
          iconBg={ICON_BG.twoFactor}
          label="Security checklist"
          valueText="Review"
          borderColor={colors.border}
          isLast
          onPress={() =>
            showNotice("Use biometric lock and password reset to keep your account secure.")
          }
        />
      </SectionCard>

      {/* ── Notifications ────────────────────────── */}
      <SectionLabel text="Notifications" color={colors.textSecondary} />
      <SectionCard cardBg={colors.cardBg} borderColor={colors.border}>
        <SettingsRow
          iconName="notifications-outline"
          iconBg={ICON_BG.pushNotif}
          label="Push notifications"
          borderColor={colors.border}
          showChevron={false}
          onPress={() => {
            const v = !pushEnabled;
            setPushEnabled(v);
            AsyncStorage.setItem(NOTIF_KEYS.push, String(v)).catch(() => {});
          }}
          rightElement={
            <Switch
              value={pushEnabled}
              onValueChange={(v) => {
                hapticLight();
                setPushEnabled(v);
                AsyncStorage.setItem(NOTIF_KEYS.push, String(v)).catch(() => {});
              }}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={pushEnabled ? colors.primary : colors.textTertiary}
              accessibilityLabel="Push notifications toggle"
            />
          }
        />
        <SettingsRow
          iconName="send-outline"
          iconBg={ICON_BG.transferAlerts}
          label="Transfer alerts"
          borderColor={colors.border}
          showChevron={false}
          onPress={() => {
            const v = !transferAlertsEnabled;
            setTransferAlertsEnabled(v);
            AsyncStorage.setItem(NOTIF_KEYS.transfers, String(v)).catch(() => {});
          }}
          rightElement={
            <Switch
              value={transferAlertsEnabled}
              onValueChange={(v) => {
                hapticLight();
                setTransferAlertsEnabled(v);
                AsyncStorage.setItem(NOTIF_KEYS.transfers, String(v)).catch(() => {});
              }}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={
                transferAlertsEnabled ? colors.primary : colors.textTertiary
              }
              accessibilityLabel="Transfer alerts toggle"
            />
          }
        />
        <SettingsRow
          iconName="megaphone-outline"
          iconBg={ICON_BG.promotions}
          label="Promotions"
          borderColor={colors.border}
          showChevron={false}
          isLast
          onPress={() => {
            const v = !promotionsEnabled;
            setPromotionsEnabled(v);
            AsyncStorage.setItem(NOTIF_KEYS.promotions, String(v)).catch(() => {});
          }}
          rightElement={
            <Switch
              value={promotionsEnabled}
              onValueChange={(v) => {
                hapticLight();
                setPromotionsEnabled(v);
                AsyncStorage.setItem(NOTIF_KEYS.promotions, String(v)).catch(() => {});
              }}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={promotionsEnabled ? colors.primary : colors.textTertiary}
              accessibilityLabel="Promotions toggle"
            />
          }
        />
      </SectionCard>

      {/* ── Payments ─────────────────────────────── */}
      <SectionLabel text="Payments" color={colors.textSecondary} />
      <SectionCard cardBg={colors.cardBg} borderColor={colors.border}>
        <SettingsRow
          iconName="earth-outline"
          iconBg="#7F77DD"
          label="Financial Passport"
          valueText="View"
          borderColor={colors.border}
          onPress={() => {
            hapticLight();
            router.push("/financial-passport");
          }}
        />
        <SettingsRow
          iconName="shield-checkmark-outline"
          iconBg={ICON_BG.biometric}
          label="Trusted contacts"
          valueText="Manage"
          borderColor={colors.border}
          onPress={() => {
            hapticLight();
            router.push("/trusted-contacts" as never);
          }}
        />
        <SettingsRow
          iconName="globe-outline"
          iconBg={ICON_BG.rafikiStatus}
          label="Rafiki / ILP status"
          showChevron={false}
          isLast
          borderColor={colors.border}
          rightElement={
            <View style={styles.rowRight}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isRafikiConfigured
                      ? colors.success
                      : colors.warning,
                  },
                ]}
              />
              <Text
                style={[
                  styles.rowValue,
                  {
                    color: isRafikiConfigured ? colors.success : colors.warning,
                  },
                ]}
              >
                {isRafikiConfigured ? "Connected" : "Needs setup"}
              </Text>
            </View>
          }
        />
      </SectionCard>

      {/* ── Support ──────────────────────────────── */}
      <SectionLabel text="Support" color={colors.textSecondary} />
      <SectionCard cardBg={colors.cardBg} borderColor={colors.border}>
        <SettingsRow
          iconName="help-circle-outline"
          iconBg={ICON_BG.helpCenter}
          label="Help Center"
          borderColor={colors.border}
          onPress={() => openURL("mailto:support@allgood.app")}
        />
        <SettingsRow
          iconName="chatbubble-outline"
          iconBg={ICON_BG.contactUs}
          label="Contact Us"
          borderColor={colors.border}
          onPress={() =>
            openURL("mailto:support@allgood.app?subject=AllGood%20Support")
          }
        />
        <SettingsRow
          iconName="bug-outline"
          iconBg={ICON_BG.bugReport}
          label="Report a problem"
          borderColor={colors.border}
          onPress={() =>
            openURL("mailto:support@allgood.app?subject=Bug%20Report")
          }
        />
        <SettingsRow
          iconName="star-outline"
          iconBg={ICON_BG.rate}
          label="Rate AllGood"
          borderColor={colors.border}
          isLast
          onPress={() =>
            showNotice(
              "Thank you! Rating is available on the App Store once we launch."
            )
          }
        />
      </SectionCard>

      {/* ── Share AllGood ─────────────────────────── */}
      <Pressable
        onPress={handleShare}
        accessibilityLabel="Share AllGood with friends and family"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.shareRow,
          {
            backgroundColor: pressed ? colors.primary + "18" : colors.cardBg,
            borderColor: colors.primary + "40",
          },
        ]}
      >
        <LinearGradient
          colors={colors.gradientAccent as [string, string, ...string[]]}
          style={styles.shareIconWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="share-social-outline" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.shareLabel, { color: colors.text, fontSize: fs(15) }]}>
            Share AllGood
          </Text>
          <Text style={[styles.shareSub, { color: colors.textSecondary, fontSize: fs(12) }]}>
            Invite friends & family — no fees, ever
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </Pressable>

      {/* ── Sign out ─────────────────────────────── */}
      <Pressable
        onPress={handleSignOut}
        accessibilityLabel="Sign out"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.signOutRow,
          {
            backgroundColor: pressed
              ? colors.error + "15"
              : colors.error + "0A",
            borderColor: colors.error + "30",
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.error }]}>
          <Ionicons name="log-out-outline" size={17} color="#fff" />
        </View>
        <Text style={[styles.signOutLabel, { color: colors.error, fontSize: fs(15) }]}>
          Sign out
        </Text>
      </Pressable>

      {/* ── Footer ───────────────────────────────── */}
      <Text style={[styles.footer, { color: colors.textTertiary, fontSize: fs(12) }]}>
        AllGood v1.0.0 · Made with ❤️ for immigrants
      </Text>

      {/* ── Edit profile modal ───────────────────── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditModalVisible(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit profile</Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Full name</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Phone</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+1 555 000 0000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Country</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editCountry}
              onChangeText={setEditCountry}
              placeholder="Mexico, Colombia, etc."
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />

            <Pressable
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveProfile}
              disabled={editSaving}
              accessibilityRole="button"
              accessibilityLabel="Save profile changes"
            >
              <Text style={styles.modalSaveBtnTxt}>
                {editSaving ? "Saving…" : "Save changes"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setEditModalVisible(false)}
              accessibilityRole="button"
            >
              <Text style={[styles.modalCancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Toast notice ─────────────────────────── */}
      <Toast message={notice ?? ""} visible={notice !== null} />
    </ScreenLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageTitle: {
    fontWeight: fontWeights.extrabold,
    letterSpacing: -0.5,
    marginBottom: spacing["2xl"],
    marginTop: spacing.sm,
  },

  // Profile card
  profileCard: {
    borderRadius: radii["2xl"],
    borderWidth: 1,
    padding: spacing["2xl"],
    alignItems: "center",
    marginBottom: spacing["2xl"],
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarInitials: {
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.bold,
    color: "#fff",
    letterSpacing: 1,
  },
  profileName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.sm,
  },
  profileMeta: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  profileMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  profileMetaText: {
    fontSize: fontSizes.xs,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  memberBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },

  // Section
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing["2xl"],
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    height: 58,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 36 + spacing.md + spacing.lg,
  },

  // Color dots
  colorDots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.45,
  },
  colorDotActive: {
    opacity: 1,
    transform: [{ scale: 1.25 }],
  },

  // Status dot
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Share row
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  shareIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  shareLabel: {
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  shareSub: {
    lineHeight: 16,
  },

  // Sign out
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    height: 58,
    marginTop: spacing.sm,
    marginBottom: spacing["2xl"],
  },
  signOutLabel: {
    fontWeight: fontWeights.semibold,
  },

  // Footer
  footer: {
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 18,
  },

  // Edit profile modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 16,
  },
  modalSaveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  modalSaveBtnTxt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  modalCancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  modalCancelTxt: {
    fontSize: 15,
    fontWeight: "500",
  },

  // Toast
  toast: {
    position: "absolute",
    bottom: 32,
    left: spacing["2xl"],
    right: spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#0f2b1a",
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: "#10b981" + "40",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  toastText: {
    color: "#d1fae5",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    flex: 1,
    lineHeight: 19,
  },
});
