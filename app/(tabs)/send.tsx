import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Button } from "@/components/Button";
import { Goodi } from "@/components/Goodi";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEntranceAnimation } from "@/hooks/useEntranceAnimation";
import { useStaggerAnimation } from "@/hooks/useStaggerAnimation";
import { useTextScale } from "@/hooks/useTextScale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getRecentContacts, getTrustedContacts } from "@/lib/data";
import type { Contact } from "@/lib/database.types";
import { hapticLight } from "@/lib/haptics";
import { isWalletAddress } from "@/lib/rafiki";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,15}$/;

const STEP_LABELS = ["Recipient", "Amount", "Confirm"];

export default function SendScreen() {
  const colors = useThemeColors();
  const fs = useTextScale();
  const { preferences } = useApp();
  const { user } = useAuth();
  const t = useTranslation(preferences.language);
  const [method, setMethod] = useState<"email" | "phone" | "wallet">("email");
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [trustedContacts, setTrustedContacts] = useState<Contact[]>([]);

  // Animations
  const { anims: contactAnims, start: startContactAnims } = useStaggerAnimation(
    {
      count: 5,
      staggerDelay: 80,
      tension: 120,
      friction: 10,
      autoStart: false,
    },
  );
  const { fadeAnim, slideAnim } = useEntranceAnimation({
    duration: 500,
    slideDistance: 20,
    useSpring: true,
    onComplete: startContactAnims,
  });

  const loadContacts = useCallback(async () => {
    if (!user) return;
    const [recent, trusted] = await Promise.all([
      getRecentContacts(user.id, 5),
      getTrustedContacts(user.id),
    ]);
    setContacts(recent);
    setTrustedContacts(trusted.slice(0, 4));
  }, [user]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const isValid = useMemo(() => {
    if (!value.trim()) return false;
    if (method === "email") return EMAIL_REGEX.test(value.trim());
    if (method === "phone") return PHONE_REGEX.test(value.trim());
    return isWalletAddress(value.trim());
  }, [method, value]);

  const showError = touched && value.trim().length > 0 && !isValid;

  const displayContacts = contacts.map((c) => ({
    flag: c.flag_emoji || "👤",
    code: c.country_code || "",
    name: c.contact_name,
    email: c.contact_email,
    phone: c.contact_phone,
  }));

  return (
    <ScreenLayout
      edges={["top"]}
      horizontalPadding={24}
      bottomPadding={140}
      overlay={<Goodi screen="send" />}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={[styles.title, { color: colors.text, fontSize: fs(24) }]}>
          {t("sendMoney")}
        </Text>

        <LinearGradient
          colors={colors.gradientAccent as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroTitle}>Send and receive with confidence</Text>
          <Text style={styles.heroSub}>Real contacts, trusted paths, and clear tracking on every transfer.</Text>
          <View style={styles.heroPillsRow}>
            <View style={styles.heroPill}><Text style={styles.heroPillTxt}>Fast</Text></View>
            <View style={styles.heroPill}><Text style={styles.heroPillTxt}>Secure</Text></View>
            <View style={styles.heroPill}><Text style={styles.heroPillTxt}>No hidden fees</Text></View>
          </View>
        </LinearGradient>

        {/* ── Step Progress ─────────────────────────── */}
        <View style={styles.stepRow}>
          {STEP_LABELS.map((label, i) => (
            <View key={i} style={styles.stepItem}>
              <View style={styles.stepDotRow}>
                {i > 0 && (
                  <View
                    style={[
                      styles.stepLine,
                      {
                        backgroundColor:
                          i <= 0 ? colors.primary : colors.border,
                      },
                    ]}
                  />
                )}
                <LinearGradient
                  colors={
                    i === 0
                      ? (colors.gradientAccent as unknown as [string, string])
                      : ([colors.border, colors.border] as [string, string])
                  }
                  style={[
                    styles.stepCircle,
                    i === 0 && {
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 4,
                    },
                  ]}
                >
                  {i === 0 ? (
                    <Text style={styles.stepCircleText}>1</Text>
                  ) : (
                    <Text
                      style={[
                        styles.stepCircleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </LinearGradient>
                {i < 2 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: i === 0 ? colors.primary : colors.textSecondary,
                    fontWeight: i === 0 ? "700" : "500",
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={[styles.question, { color: colors.text, fontSize: fs(18) }]}
        >
          {t("whoSending")}
        </Text>

        {/* ── Method Toggle ─────────────────────────── */}
        <View
          style={[
            styles.methodToggle,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {(["email", "phone", "wallet"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.methodBtn,
                method === m && {
                  backgroundColor: colors.primary + "15",
                },
              ]}
              onPress={() => {
                hapticLight();
                setMethod(m);
              }}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: method === m }}
              accessibilityLabel={
                m === "email"
                  ? "Send by email"
                  : m === "phone"
                    ? "Send by phone number"
                    : "Send by wallet address"
              }
            >
              <Ionicons
                name={
                  m === "email"
                    ? "mail-outline"
                    : m === "phone"
                      ? "call-outline"
                      : "wallet-outline"
                }
                size={18}
                color={method === m ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodLabel,
                  {
                    color: method === m ? colors.primary : colors.text,
                  },
                ]}
              >
                {m === "wallet" ? "Wallet" : t(m)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Input ──────────────────────────────────── */}
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.cardBg,
              borderColor: showError ? colors.error : colors.border,
            },
          ]}
        >
          <Ionicons
            name={
              method === "email"
                ? "mail"
                : method === "phone"
                  ? "call"
                  : "wallet"
            }
            size={18}
            color={showError ? colors.error : colors.textSecondary}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={
              method === "email"
                ? t("enterEmail")
                : method === "phone"
                  ? t("enterPhone")
                  : "Enter wallet address (e.g. $rafiki.example.alice)"
            }
            placeholderTextColor={colors.textSecondary}
            value={value}
            onChangeText={setValue}
            onBlur={() => setTouched(true)}
            keyboardType={method === "phone" ? "phone-pad" : "default"}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={
              method === "email"
                ? "Recipient email address"
                : method === "phone"
                  ? "Recipient phone number"
                  : "Recipient wallet address"
            }
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={() => setValue("")}
              accessibilityRole="button"
              accessibilityLabel="Clear input"
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {showError && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {method === "email"
              ? t("invalidEmail")
              : method === "phone"
                ? t("invalidPhone")
                : "Please enter a valid wallet address."}
          </Text>
        )}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[
              styles.quickActionCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => router.push("/deposit")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons name="arrow-down-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickActionTitle, { color: colors.text }]}>Receive</Text>
              <Text style={[styles.quickActionSub, { color: colors.textSecondary }]}>Top up or collect funds</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => router.push("/trusted-contacts" as never)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickActionTitle, { color: colors.text }]}>Trusted</Text>
              <Text style={[styles.quickActionSub, { color: colors.textSecondary }]}>Manage safe recipients</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
            onPress={() => router.push("/request")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons name="git-compare-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickActionTitle, { color: colors.text }]}>Request</Text>
              <Text style={[styles.quickActionSub, { color: colors.textSecondary }]}>Ask contacts to pay you</Text>
            </View>
          </TouchableOpacity>
        </View>

        {trustedContacts.length > 0 && (
          <>
            <Text style={[styles.recentTitle, { color: colors.text, marginTop: 8 }]}>Trusted contacts</Text>
            <View style={styles.recentRow}>
              {trustedContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.recentItem}
                  onPress={() => {
                    hapticLight();
                    setValue(contact.contact_email || contact.contact_phone || "");
                    setMethod(contact.contact_email ? "email" : "phone");
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.recentAvatar,
                      { backgroundColor: colors.success + "16" },
                    ]}
                  >
                    <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                  </View>
                  <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                    {contact.contact_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Recent Contacts ────────────────────────── */}
        <Text style={[styles.recentTitle, { color: colors.text }]}> 
          {t("recentContacts")}
        </Text>
        {displayContacts.length > 0 ? (
        <View style={styles.recentRow}>
          {displayContacts.map((c, i) => (
            <Animated.View
              key={i}
              style={{
                opacity: contactAnims[i] || 1,
                transform: [
                  {
                    scale: (
                      contactAnims[i] || new Animated.Value(1)
                    ).interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                  {
                    translateY: (
                      contactAnims[i] || new Animated.Value(1)
                    ).interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.recentItem}
                onPress={() => {
                  hapticLight();
                    const contactValue = c.email || c.phone || "";
                    if (!contactValue) return;
                    setValue(contactValue);
                    setMethod(c.email ? "email" : "phone");
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Send to ${c.name}`}
              >
                <View
                  style={[
                    styles.recentAvatar,
                    { backgroundColor: colors.primary + "12" },
                  ]}
                >
                  <Text style={styles.recentFlag}>{c.flag}</Text>
                </View>
                <Text style={[styles.recentName, { color: colors.text }]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        ) : (
          <View
            style={[
              styles.emptyContactsCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyContactsTitle, { color: colors.text }]}>No recent contacts yet</Text>
            <Text style={[styles.emptyContactsDesc, { color: colors.textSecondary }]}>Your real recipients will appear here after your first transfer.</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title={t("continue")}
            onPress={() => {
              setTouched(true);
              if (!isValid) return;
              router.push({
                pathname: "/send-amount",
                params: { recipient: value.trim(), method },
              });
            }}
            disabled={!isValid}
          />
        </View>
      </Animated.View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroSub: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  heroPillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  heroPill: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroPillTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  /* Steps */
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
  },
  stepDotRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  stepLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  /* Method */
  question: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  methodToggle: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  methodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  methodLabel: { fontSize: 15, fontWeight: "600" },
  /* Input */
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
  },
  errorText: { fontSize: 13, marginTop: -16, marginBottom: 12 },
  quickActionsRow: {
    gap: 10,
    marginBottom: 24,
  },
  quickActionCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 72,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
    marginRight: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  quickActionSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  /* Contacts */
  recentTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  recentRow: { flexDirection: "row", gap: 20, marginBottom: 32 },
  emptyContactsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 32,
  },
  emptyContactsTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyContactsDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  recentItem: { alignItems: "center" },
  recentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  recentFlag: { fontSize: 24 },
  recentName: { fontSize: 13, fontWeight: "600" },
  footer: { marginTop: 8 },
});
