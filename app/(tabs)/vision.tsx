import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Goodi } from "@/components/Goodi";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEntranceAnimation } from "@/hooks/useEntranceAnimation";
import { useTextScale } from "@/hooks/useTextScale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticLight } from "@/lib/haptics";

const PHASES = ["Q3 2025", "Q4 2025", "Q1 2026"];
const PHASE_STATUS: ("upcoming" | "upcoming" | "upcoming")[] = [
  "upcoming",
  "upcoming",
  "upcoming",
];

const ICON_GRADIENTS: [string, string][] = [
  ["#10b981", "#059669"],
  ["#3b82f6", "#2563eb"],
  ["#f59e0b", "#d97706"],
];

const FEATURES = [
  {
    icon: "globe-outline" as const,
    titleKey: "financialPassport" as const,
    descKey: "financialPassportDesc" as const,
    bullets: ["Credit portability", "Global score", "Bank partnerships"],
  },
  {
    icon: "analytics-outline" as const,
    titleKey: "behaviorCredit" as const,
    descKey: "behaviorCreditDesc" as const,
    bullets: ["AI scoring", "Bill analysis", "Score builder"],
  },
  {
    icon: "document-text-outline" as const,
    titleKey: "taxGuidance" as const,
    descKey: "taxGuidanceDesc" as const,
    bullets: ["ITIN filing", "Tax prep", "Deduction finder"],
  },
];

export default function VisionScreen() {
  const colors = useThemeColors();
  const fs = useTextScale();
  const { preferences } = useApp();
  const t = useTranslation(preferences.language);
  const { user } = useAuth();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  };

  // Entrance animations
  const { fadeAnim, slideAnim } = useEntranceAnimation({
    duration: 500,
    slideDistance: 24,
    useSpring: true,
  });
  const lineHeight = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const dotAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Timeline line grows
    Animated.timing(lineHeight, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      useNativeDriver: false,
    }).start();

    // Dots pop in
    Animated.stagger(
      200,
      dotAnims.map((a) =>
        Animated.spring(a, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
      ),
    ).start();

    // Cards slide in staggered
    Animated.stagger(
      150,
      cardAnims.map((a) =>
        Animated.spring(a, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  return (
    <ScreenLayout
      edges={["top"]}
      horizontalPadding={24}
      topPadding={24}
      bottomPadding={140}
      overlay={<Goodi screen="vision" />}
    >
      {/* Header */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={[styles.title, { color: colors.text, fontSize: fs(24) }]}>
          {t("vision")}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondary, fontSize: fs(15) },
          ]}
        >
          {t("visionSubtitle")}
        </Text>

        {/* Roadmap label */}
        <View style={styles.roadmapHeader}>
          <View
            style={[
              styles.roadmapBadge,
              { backgroundColor: colors.primary + "12" },
            ]}
          >
            <Ionicons name="map-outline" size={14} color={colors.primary} />
            <Text style={[styles.roadmapBadgeText, { color: colors.primary }]}>
              ROADMAP
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {/* Animated vertical line */}
        <Animated.View
          style={[
            styles.timelineLine,
            {
              backgroundColor: colors.primary + "25",
              height: lineHeight.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        >
          {/* Active glow overlay */}
          <LinearGradient
            colors={[colors.primary + "60", colors.primary + "10"]}
            style={styles.lineGlow}
          />
        </Animated.View>

        {FEATURES.map((f, i) => (
          <View key={i} style={styles.timelineItem}>
            {/* Timeline dot */}
            <Animated.View
              style={[
                styles.dotContainer,
                {
                  transform: [{ scale: dotAnims[i] }],
                  opacity: dotAnims[i],
                },
              ]}
            >
              <LinearGradient
                colors={ICON_GRADIENTS[i]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.timelineDot}
              >
                <Ionicons name={f.icon} size={16} color="#fff" />
              </LinearGradient>
            </Animated.View>

            {/* Card */}
            <Animated.View
              style={[
                styles.timelineCardWrap,
                {
                  opacity: cardAnims[i],
                  transform: [
                    {
                      translateX: cardAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                    {
                      scale: cardAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => {
                  hapticLight();
                  if (i === 0) {
                    router.push("/financial-passport");
                  } else {
                    showToast(`${t(f.titleKey)} — ${t("comingSoon")}`);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={t(f.titleKey)}
              >
                {/* Phase badge */}
                <View style={styles.phaseRow}>
                  <View
                    style={[
                      styles.phaseBadge,
                      { backgroundColor: ICON_GRADIENTS[i][0] + "15" },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={10}
                      color={ICON_GRADIENTS[i][0]}
                    />
                    <Text
                      style={[
                        styles.phaseText,
                        { color: ICON_GRADIENTS[i][0] },
                      ]}
                    >
                      {PHASES[i]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: i === 0 ? "#22c55e18" : colors.primary + "12" },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: i === 0 ? "#22c55e" : ICON_GRADIENTS[i][0] },
                      ]}
                    />
                    <Text
                      style={[styles.statusText, { color: i === 0 ? "#22c55e" : colors.primary }]}
                    >
                      {i === 0 ? "Available now" : t("comingSoon")}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {t(f.titleKey)}
                </Text>

                {/* Description */}
                <Text
                  style={[styles.cardDesc, { color: colors.textSecondary }]}
                >
                  {t(f.descKey)}
                </Text>

                {/* Feature bullets */}
                <View style={styles.bulletList}>
                  {f.bullets.map((b, bi) => (
                    <View key={bi} style={styles.bulletItem}>
                      <View
                        style={[
                          styles.bulletDot,
                          { backgroundColor: ICON_GRADIENTS[i][0] },
                        ]}
                      />
                      <Text
                        style={[
                          styles.bulletText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {b}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Arrow */}
                <View style={styles.cardFooter}>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={20}
                    color={colors.primary + "50"}
                  />
                </View>
              </Pressable>
            </Animated.View>
          </View>
        ))}
      </View>

      {/* ── In-screen toast ─────────────────────── */}
      {toastMsg && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.text, opacity: toastAnim },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="information-circle" size={16} color={colors.cardBg} />
          <Text style={[styles.toastText, { color: colors.cardBg }]}>{toastMsg}</Text>
        </Animated.View>
      )}

      {/* CTA — only shown to guests */}
      {!user && (
        <View style={styles.ctaBlock}>
          <LinearGradient
            colors={["#7F77DD", "#D4537E", "#D85A30"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>Ready to take control?</Text>
            <Text style={styles.ctaSub}>
              Join thousands of immigrants building their financial future.
            </Text>
            <Pressable
              style={styles.ctaPrimary}
              onPress={() => {
                hapticLight();
                router.push("/(onboarding)/signup");
              }}
              accessibilityRole="button"
              accessibilityLabel="Create free account"
            >
              <Text style={styles.ctaPrimaryTxt}>Create free account</Text>
            </Pressable>
            <Pressable
              style={styles.ctaGhost}
              onPress={() => {
                hapticLight();
                router.push("/(onboarding)/login");
              }}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              <Text style={styles.ctaGhostTxt}>I already have an account</Text>
            </Pressable>
          </LinearGradient>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 20 },
  roadmapHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  roadmapBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roadmapBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  timeline: {
    position: "relative",
    paddingLeft: 44,
  },
  timelineLine: {
    position: "absolute",
    left: 17,
    top: 20,
    width: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  lineGlow: {
    flex: 1,
    width: "100%",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    position: "relative",
  },
  dotContainer: {
    position: "absolute",
    left: -44,
    top: 16,
    zIndex: 2,
  },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineCardWrap: {
    flex: 1,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  phaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phaseText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardDesc: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  bulletList: {
    gap: 6,
    marginBottom: 8,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  bulletText: {
    fontSize: 12,
    fontWeight: "500",
  },
  cardFooter: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  ctaBlock: {
    marginTop: 32,
    borderRadius: 24,
    overflow: "hidden",
  },
  ctaGradient: {
    padding: 28,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  ctaSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
  },
  ctaPrimary: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  ctaPrimaryTxt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7F77DD",
  },
  ctaGhost: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  ctaGhostTxt: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
    marginTop: -4,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
