/**
 * Financial Passport Screen
 *
 * AllGood's flagship feature: your credit history travels with you across borders.
 * Designed to look and feel like an actual passport document.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  useDerivedValue,
} from "react-native-reanimated";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getRecentTransactions, getPrimaryBalance } from "@/lib/data";
import { fetchExchangeRates } from "@/lib/exchange-rates";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  fontSizes,
  fontWeights,
  radii,
  shadows,
  spacing,
} from "@/constants/theme";

// ─── Constants ───────────────────────────────────────────────

const PASSPORT_GOLD = "#C9A84C";
const PASSPORT_GOLD_LIGHT = "#E8C96A";
const PASSPORT_DARK = "#1a0e2e";
const PASSPORT_MID = "#2d1a5c";
const PASSPORT_ACCENT = "#3d2580";
const SCORE_MAX = 850;

// Compute a credit score from account activity data
function computeCreditScore({
  accountAgeMonths,
  completedTxCount,
  totalTxCount,
  balanceCents,
}: {
  accountAgeMonths: number;
  completedTxCount: number;
  totalTxCount: number;
  balanceCents: number;
}): number {
  // Base score 580, max achievable 850
  let score = 580;

  // Account age (up to +80): full points at 24+ months
  score += Math.min(80, (accountAgeMonths / 24) * 80);

  // Payment history (up to +100): ratio of completed vs total transactions
  const paymentRatio = totalTxCount > 0 ? completedTxCount / totalTxCount : 0;
  score += Math.round(paymentRatio * 100);

  // Transaction volume (up to +60): full points at 20+ transactions
  score += Math.min(60, (completedTxCount / 20) * 60);

  // Balance health (up to +30): $100 = full points
  const balanceDollars = balanceCents / 100;
  score += Math.min(30, (balanceDollars / 100) * 30);

  return Math.min(850, Math.round(score));
}
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 56; // SCREEN_PADDING_H * 2

const COUNTRIES = [
  { flag: "🇲🇽", name: "Mexico", currency: "MXN" },
  { flag: "🇧🇷", name: "Brazil", currency: "BRL" },
  { flag: "🇨🇴", name: "Colombia", currency: "COP" },
  { flag: "🇵🇭", name: "Philippines", currency: "USD" },
  { flag: "🇮🇳", name: "India", currency: "USD" },
  { flag: "🇬🇹", name: "Guatemala", currency: "USD" },
];

const BENEFITS = [
  {
    icon: "🏠",
    title: "Skip the security deposit",
    desc: "Landlords in partner countries see your history",
  },
  {
    icon: "💳",
    title: "Get approved faster",
    desc: "Lenders recognize AllGood credit scores",
  },
  {
    icon: "✈️",
    title: "Fresh start, not zero start",
    desc: "Your years of payments count everywhere",
  },
];

// ─── Helpers ─────────────────────────────────────────────────

function formatPassportNumber(userId: string): string {
  const raw = userId.replace(/-/g, "").toUpperCase().slice(0, 8);
  return `AG-${raw}`;
}

function getAccountAgeMonths(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - created.getFullYear()) * 12 +
      (now.getMonth() - created.getMonth()),
  );
}

function formatMemberSince(createdAt: string | null | undefined): string {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function scoreLabel(score: number): string {
  if (score < 580) return "Poor";
  if (score < 670) return "Fair";
  if (score < 740) return "Good";
  return "Excellent";
}

function scorePercent(score: number): number {
  return Math.min(1, Math.max(0, (score - 300) / (850 - 300)));
}

// ─── Shimmer overlay ─────────────────────────────────────────

function PassportShimmer() {
  const shimmerX = useSharedValue(-CARD_WIDTH);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withSequence(
        withDelay(
          800,
          withTiming(CARD_WIDTH * 1.5, {
            duration: 1400,
            easing: Easing.linear,
          }),
        ),
        withTiming(-CARD_WIDTH, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Animated.View style={[styles.shimmerStripe, shimmerStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255,255,255,0.08)",
            "rgba(255,255,255,0.13)",
            "rgba(255,255,255,0.08)",
            "transparent",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Passport card ───────────────────────────────────────────

interface PassportCardProps {
  fullName: string;
  idType: string | null;
  memberSince: string;
  passportNumber: string;
}

function PassportCard({
  fullName,
  idType,
  memberSince,
  passportNumber,
}: PassportCardProps) {
  const slideUp = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSpring(1, { damping: 14, stiffness: 80 });
    slideUp.value = withSpring(0, { damping: 14, stiffness: 80 });
  }, [opacity, slideUp]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideUp.value }],
  }));

  return (
    <Animated.View style={[styles.passportCardOuter, cardStyle]}>
      <LinearGradient
        colors={[PASSPORT_DARK, PASSPORT_MID, PASSPORT_ACCENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.passportCardGradient}
      >
        {/* Holographic shimmer */}
        <PassportShimmer />

        {/* Top bar: logo + label */}
        <View style={styles.passportTopBar}>
          <View style={styles.passportLogoMark}>
            <Text style={styles.passportLogoText}>AG</Text>
          </View>
          <View style={styles.passportLabelCol}>
            <Text style={styles.passportCountryLabel}>ALLGOOD NETWORK</Text>
            <Text style={styles.passportDocLabel}>FINANCIAL PASSPORT</Text>
          </View>
          <View style={styles.passportEmblem}>
            <Ionicons name="shield-checkmark" size={28} color={PASSPORT_GOLD} />
          </View>
        </View>

        {/* Decorative divider */}
        <View style={styles.passportDivider} />

        {/* MRZ-style decorative lines */}
        <View style={styles.mrzStripe}>
          <Text style={styles.mrzText}>P&lt;ALLGOOD&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</Text>
        </View>

        {/* Holder info */}
        <View style={styles.passportHolderSection}>
          <View style={styles.passportInfoGrid}>
            <View style={styles.passportInfoBlock}>
              <Text style={styles.passportFieldLabel}>HOLDER</Text>
              <Text style={styles.passportFieldValue} numberOfLines={1}>
                {fullName || "AllGood Member"}
              </Text>
            </View>
            <View style={styles.passportInfoBlock}>
              <Text style={styles.passportFieldLabel}>ID TYPE</Text>
              <Text style={styles.passportFieldValue}>
                {idType?.toUpperCase() || "ITIN"}
              </Text>
            </View>
          </View>

          <View style={styles.passportInfoGrid}>
            <View style={styles.passportInfoBlock}>
              <Text style={styles.passportFieldLabel}>MEMBER SINCE</Text>
              <Text style={styles.passportFieldValue}>{memberSince}</Text>
            </View>
            <View style={styles.passportInfoBlock}>
              <Text style={styles.passportFieldLabel}>PASSPORT NO.</Text>
              <Text style={styles.passportFieldValue}>{passportNumber}</Text>
            </View>
          </View>
        </View>

        {/* Bottom seal */}
        <View style={styles.passportSealRow}>
          <Ionicons name="globe-outline" size={14} color={PASSPORT_GOLD} />
          <Text style={styles.passportSealText}>
            INTERLEDGER PROTOCOL · VERIFIED
          </Text>
          <Ionicons name="globe-outline" size={14} color={PASSPORT_GOLD} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Animated score counter ───────────────────────────────────

function AnimatedScoreCounter({ target }: { target: number }) {
  const progress = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    progress.value = withTiming(target, {
      duration: 1800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, target]);

  // Derive the display value on the JS side via a callback
  const derived = useDerivedValue(() => Math.round(progress.value));

  // We poll the derived value via a JS-side interval approach using Reanimated's
  // runOnJS — we rely on useAnimatedStyle to sync display
  const scoreStyle = useAnimatedStyle(() => {
    runOnJS(setDisplayValue)(Math.round(progress.value));
    return {};
  });

  return (
    <>
      <Animated.View style={scoreStyle} />
      <Text style={styles.scoreNumber}>{displayValue}</Text>
    </>
  );
}

// ─── Score bar ───────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const fillWidth = useSharedValue(0);
  const pct = scorePercent(score);

  useEffect(() => {
    fillWidth.value = withDelay(
      400,
      withTiming(pct, { duration: 1600, easing: Easing.out(Easing.cubic) }),
    );
  }, [fillWidth, pct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as any,
  }));

  const colors = useThemeColors();

  return (
    <View style={styles.scoreBarSection}>
      {/* Range labels */}
      <View style={styles.scoreRangeLabels}>
        {["Poor", "Fair", "Good", "Excellent"].map((lbl) => (
          <Text
            key={lbl}
            style={[
              styles.scoreRangeLabel,
              { color: colors.textSecondary },
              lbl === scoreLabel(score) && {
                color: "#4ade80",
                fontWeight: fontWeights.bold,
              },
            ]}
          >
            {lbl}
          </Text>
        ))}
      </View>

      {/* Track */}
      <View style={[styles.scoreBarTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={fillStyle}>
          <LinearGradient
            colors={["#f59e0b", "#22c55e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scoreBarFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Credit activity item ─────────────────────────────────────

interface ActivityItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  barPct: number;
  barColor: string;
  delay?: number;
}

function ActivityItem({
  icon,
  label,
  value,
  barPct,
  barColor,
  delay = 0,
}: ActivityItemProps) {
  const barWidth = useSharedValue(0);
  const opacity = useSharedValue(0);
  const colors = useThemeColors();

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    barWidth.value = withDelay(
      delay + 200,
      withTiming(barPct, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [barWidth, opacity, delay, barPct]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%` as any,
  }));

  return (
    <Animated.View
      style={[styles.activityItem, { borderBottomColor: colors.border }, containerStyle]}
    >
      <View style={[styles.activityIcon, { backgroundColor: `${barColor}22` }]}>
        <Ionicons name={icon} size={18} color={barColor} />
      </View>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={[styles.activityLabel, { color: colors.text }]}>
            {label}
          </Text>
          <Text style={[styles.activityValue, { color: barColor }]}>
            {value}
          </Text>
        </View>
        <View style={[styles.activityBarTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[styles.activityBarFill, { backgroundColor: barColor }, barStyle]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Country pill ─────────────────────────────────────────────

function CountryPill({
  flag,
  name,
  delay,
}: {
  flag: string;
  name: string;
  delay: number;
}) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const colors = useThemeColors();

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 120 }),
    );
  }, [opacity, scale, delay]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.countryPill,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
        pillStyle,
      ]}
    >
      <Text style={styles.countryFlag}>{flag}</Text>
      <Text style={[styles.countryName, { color: colors.text }]}>{name}</Text>
    </Animated.View>
  );
}

// ─── Section wrapper with fade+slide reveal ───────────────────

function Section({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
  }, [opacity, translateY, delay]);

  const sectionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={sectionStyle}>{children}</Animated.View>;
}

// ─── Main screen ─────────────────────────────────────────────

export default function FinancialPassportScreen() {
  const colors = useThemeColors();
  const { profile, user } = useAuth();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [creditScore, setCreditScore] = useState(580);
  const [completedTxCount, setCompletedTxCount] = useState(0);
  const [totalTxCount, setTotalTxCount] = useState(0);
  const [fxRates, setFxRates] = useState<Record<string, number>>({ USD: 1 });
  const toastOp = useSharedValue(0);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    toastOp.value = withTiming(1, { duration: 220 });
    setTimeout(() => { toastOp.value = withTiming(0, { duration: 300 }); setToastMsg(null); }, 2800);
  }, [toastOp]);
  const toastStyle = useAnimatedStyle(() => ({ opacity: toastOp.value }));
  const accordionHeight = useSharedValue(0);

  const passportNumber = profile?.passport_number
    || (user?.id ? formatPassportNumber(user.id) : "AG-PENDING");
  const memberSince = formatMemberSince(profile?.created_at);
  const accountAgeMonths = getAccountAgeMonths(profile?.created_at);

  // Load real transaction data and compute credit score
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [txs, { balance }] = await Promise.all([
        getRecentTransactions(user.id, 100),
        getPrimaryBalance(user.id),
      ]);
      const completed = txs.filter((t) => t.status === "completed").length;
      setCompletedTxCount(completed);
      setTotalTxCount(txs.length);
      const score = computeCreditScore({
        accountAgeMonths,
        completedTxCount: completed,
        totalTxCount: txs.length,
        balanceCents: balance,
      });
      setCreditScore(score);
    })();
  }, [user?.id, accountAgeMonths]);

  useEffect(() => {
    fetchExchangeRates()
      .then((rates) => setFxRates(rates))
      .catch(() => setFxRates({ USD: 1 }));
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, []);

  const handleShare = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Share.share({
        title: "My AllGood Financial Passport",
        message: `I'm building my financial future with AllGood!\n\nCredit Score: ${creditScore} (${scoreLabel(creditScore)})\nPassport: ${passportNumber}\nMember since: ${memberSince}\n\nJoin me at allgood.app`,
      });
    } catch {
      // User cancelled share sheet — no-op
    }
  }, [creditScore, passportNumber, memberSince]);

  const handleExportPassport = useCallback(async () => {
    if (!user) return;
    const verificationId = `AG-${user.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const payload = {
      verificationId,
      holder: profile?.full_name || "AllGood Member",
      passportNumber,
      memberSince,
      creditScore,
      scoreBand: scoreLabel(creditScore),
      recognizedCountries: COUNTRIES.map((c) => c.name),
      exportedAt: new Date().toISOString(),
      network: "AllGood ILP Passport Network",
      note: "Present this package to partner lenders/landlords for cross-border credit continuity.",
    };

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await Share.share({
        title: "AllGood Financial Passport Package",
        message: JSON.stringify(payload, null, 2),
      });
      showToast("Passport package exported successfully.");
    } catch {
      // ignored
    }
  }, [user, profile?.full_name, passportNumber, memberSince, creditScore, showToast]);

  const toggleHowItWorks = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHowItWorksOpen((prev) => {
      const next = !prev;
      accordionHeight.value = withTiming(next ? 1 : 0, { duration: 300 });
      return next;
    });
  }, [accordionHeight]);

  const accordionStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(accordionHeight.value, [0, 1], [0, 120]),
    opacity: accordionHeight.value,
    overflow: "hidden",
  }));

  return (
    <ScreenLayout topPadding={spacing.md}>
      <ScreenHeader
        title="Financial Passport"
        onBack={handleBack}
      />

      {/* ── Passport card ── */}
      <PassportCard
        fullName={profile?.full_name ?? ""}
        idType={profile?.id_type ?? null}
        memberSince={memberSince}
        passportNumber={passportNumber}
      />

      <View style={styles.gap} />

      {/* ── Credit Score ── */}
      <Section delay={200}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.scoreTopRow}>
            <View>
              <AnimatedScoreCounter target={creditScore} />
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                Credit Score
              </Text>
            </View>
            <View style={styles.standingBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
              <Text style={styles.standingText}>{scoreLabel(creditScore).toUpperCase()} STANDING</Text>
            </View>
          </View>

          <ScoreBar score={creditScore} />

          <Text style={[styles.scoreNote, { color: colors.textSecondary }]}>
            Score updates monthly · Based on AllGood activity
          </Text>
        </View>
      </Section>

      <View style={styles.gap} />

      {/* ── Credit Building Activity ── */}
      <Section delay={350}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Credit Building Activity
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <ActivityItem
            icon="checkmark-circle"
            label="Completed transfers"
            value={totalTxCount > 0 ? `${completedTxCount}/${totalTxCount}` : "No activity yet"}
            barPct={totalTxCount > 0 ? completedTxCount / totalTxCount : 0}
            barColor="#4ade80"
            delay={400}
          />
          <ActivityItem
            icon="swap-horizontal"
            label="Total transfers"
            value={`${totalTxCount} transaction${totalTxCount !== 1 ? "s" : ""}`}
            barPct={Math.min(1, totalTxCount / 20)}
            barColor="#60a5fa"
            delay={600}
          />
          <ActivityItem
            icon="time"
            label="Account age"
            value={`${accountAgeMonths} months`}
            barPct={Math.min(1, accountAgeMonths / 60)}
            barColor="#a78bfa"
            delay={800}
          />
        </View>
      </Section>

      <View style={styles.gap} />

      {/* ── International Recognition ── */}
      <Section delay={500}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="globe" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: spacing.sm }]}>
            Recognized in
          </Text>
        </View>
        <View style={styles.countriesGrid}>
          {COUNTRIES.map((c, i) => (
            <CountryPill key={c.name} flag={c.flag} name={c.name} delay={550 + i * 80} />
          ))}
        </View>
        <Text style={[styles.moreCountriesNote, { color: colors.textSecondary }]}>
          Use your exported passport package with partner institutions in these regions.
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border, marginTop: spacing.md },
          ]}
        >
          {COUNTRIES.map((country, index) => (
            <View
              key={country.name}
              style={[
                styles.countryDetailRow,
                index < COUNTRIES.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={styles.countryFlag}>{country.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.countryDetailName, { color: colors.text }]}>{country.name}</Text>
                <Text style={[styles.countryDetailSub, { color: colors.textSecondary }]}> 
                  Local currency rate: 1 USD = {(fxRates[country.currency] || 1).toFixed(2)} {country.currency}
                </Text>
              </View>
              <View style={styles.countryReadyBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                <Text style={styles.countryReadyText}>Ready</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <View style={styles.gap} />

      {/* ── What this means ── */}
      <Section delay={650}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          What this means for you
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {BENEFITS.map((b, i) => (
            <View
              key={b.title}
              style={[
                styles.benefitRow,
                i < BENEFITS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <View style={styles.benefitText}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>
                  {b.title}
                </Text>
                <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                  {b.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <View style={styles.gap} />

      {/* ── How it works (accordion) ── */}
      <Section delay={750}>
        <Pressable
          onPress={toggleHowItWorks}
          style={[
            styles.accordionHeader,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
              borderBottomLeftRadius: howItWorksOpen ? 0 : radii.lg,
              borderBottomRightRadius: howItWorksOpen ? 0 : radii.lg,
            },
          ]}
          accessibilityLabel="How it works, toggle details"
          accessibilityRole="button"
        >
          <Text style={[styles.accordionTitle, { color: colors.text }]}>
            How it works
          </Text>
          <Ionicons
            name={howItWorksOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
        <Animated.View
          style={[
            styles.accordionBody,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
            },
            accordionStyle,
          ]}
        >
          <Text style={[styles.accordionText, { color: colors.textSecondary }]}>
            AllGood reports your payment history to a decentralized credit ledger powered by ILP.
            Partner institutions in 6+ countries can verify your score in real time.
          </Text>
        </Animated.View>
      </Section>

      <View style={styles.gap} />

      {/* ── Share Passport button ── */}
      <Section delay={850}>
        <View style={{ gap: spacing.md }}>
          <Pressable
            onPress={handleShare}
            accessibilityLabel="Share your Financial Passport"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[PASSPORT_MID, PASSPORT_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shareButton}
            >
              <Ionicons name="share-social" size={20} color={PASSPORT_GOLD} />
              <Text style={styles.shareButtonText}>Share Passport</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={handleExportPassport}
            accessibilityLabel="Export verifiable Financial Passport package"
            accessibilityRole="button"
            style={[styles.exportButton, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={[styles.exportButtonText, { color: colors.text }]}>Export verified passport package</Text>
          </Pressable>
        </View>
      </Section>

      <View style={{ height: spacing["4xl"] }} />

      {/* ── Toast ── */}
      {toastMsg && (
        <Animated.View
          style={[styles.toast, { backgroundColor: colors.cardBg, borderColor: PASSPORT_GOLD + "40" }, toastStyle]}
          pointerEvents="none"
        >
          <Ionicons name="checkmark-circle" size={16} color={PASSPORT_GOLD} />
          <Text style={[styles.toastTxt, { color: colors.text }]}>{toastMsg}</Text>
        </Animated.View>
      )}
    </ScreenLayout>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  gap: {
    height: spacing.xl,
  },

  // ── Passport card ──
  passportCardOuter: {
    borderRadius: radii["2xl"],
    overflow: "hidden",
    ...shadows.lg,
  },
  passportCardGradient: {
    borderRadius: radii["2xl"],
    padding: spacing["2xl"],
    paddingBottom: spacing.lg,
    overflow: "hidden",
  },
  shimmerStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 80,
    height: "100%",
    transform: [{ skewX: "-20deg" }],
  },
  passportTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  passportLogoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: PASSPORT_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  passportLogoText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: PASSPORT_DARK,
    letterSpacing: 1,
  },
  passportLabelCol: {
    flex: 1,
  },
  passportCountryLabel: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: PASSPORT_GOLD,
    letterSpacing: 2,
  },
  passportDocLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: "#fff",
    letterSpacing: 1.5,
  },
  passportEmblem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${PASSPORT_GOLD}55`,
    alignItems: "center",
    justifyContent: "center",
  },
  passportDivider: {
    height: 1,
    backgroundColor: `${PASSPORT_GOLD}33`,
    marginBottom: spacing.md,
  },
  mrzStripe: {
    backgroundColor: `${PASSPORT_GOLD}11`,
    borderRadius: radii.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  mrzText: {
    fontFamily: "SpaceMono",
    fontSize: fontSizes.xs - 1,
    color: `${PASSPORT_GOLD}88`,
    letterSpacing: 0.5,
  },
  passportHolderSection: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  passportInfoGrid: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  passportInfoBlock: {
    flex: 1,
  },
  passportFieldLabel: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: PASSPORT_GOLD_LIGHT,
    letterSpacing: 1.5,
    marginBottom: spacing.xs / 2,
    textTransform: "uppercase",
  },
  passportFieldValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: "#fff",
    letterSpacing: 0.3,
  },
  passportSealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${PASSPORT_GOLD}22`,
  },
  passportSealText: {
    fontSize: fontSizes.xs - 1,
    color: PASSPORT_GOLD,
    letterSpacing: 1.5,
    fontWeight: fontWeights.bold,
  },

  // ── Card shared ──
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.sm,
  },

  // ── Score ──
  scoreTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: fontWeights.extrabold,
    color: "#4ade80",
    lineHeight: 60,
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    marginTop: 2,
  },
  standingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(74,222,128,0.12)",
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    marginTop: spacing.sm,
  },
  standingText: {
    fontSize: fontSizes.xs - 1,
    fontWeight: fontWeights.bold,
    color: "#4ade80",
    letterSpacing: 1,
  },
  scoreBarSection: {
    marginVertical: spacing.md,
  },
  scoreRangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  scoreRangeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  scoreBarTrack: {
    height: 8,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 8,
    borderRadius: radii.full,
  },
  scoreNote: {
    fontSize: fontSizes.xs,
    marginTop: spacing.sm,
    textAlign: "center",
  },

  // ── Activity ──
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  activityLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  activityValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  activityBarTrack: {
    height: 4,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  activityBarFill: {
    height: 4,
    borderRadius: radii.full,
  },

  // ── Countries ──
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  countriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  countryDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  countryDetailName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  countryDetailSub: {
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  countryReadyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#22c55e1A",
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countryReadyText: {
    color: "#22c55e",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  countryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  countryFlag: {
    fontSize: 16,
  },
  countryName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  moreCountriesNote: {
    fontSize: fontSizes.xs,
    marginTop: spacing.sm,
    textAlign: "center",
    fontStyle: "italic",
  },

  // ── Benefits ──
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  benefitIcon: {
    fontSize: 22,
    width: 32,
    textAlign: "center",
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: fontSizes.xs,
    lineHeight: 17,
  },

  // ── Accordion ──
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.xl,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  accordionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  accordionBody: {
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  accordionText: {
    fontSize: fontSizes.sm,
    lineHeight: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  // ── Share button ──
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl - 2,
    borderRadius: radii.lg,
    ...shadows.md,
  },
  shareButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: PASSPORT_GOLD,
    letterSpacing: 0.5,
  },
  exportButton: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  exportButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },

  // ── Toast ──
  toast: {
    position: "absolute",
    bottom: 32,
    left: 28,
    right: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  toastTxt: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
});
