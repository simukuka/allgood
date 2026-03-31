import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { Goodi } from "@/components/Goodi";
import { MiniSparkline } from "@/components/MiniSparkline";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useEntranceAnimation } from "@/hooks/useEntranceAnimation";
import { useStaggerAnimation } from "@/hooks/useStaggerAnimation";
import { useTextScale } from "@/hooks/useTextScale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticLight } from "@/lib/haptics";

/* ── Quick stat cards ────────────────────────────────────── */
const QUICK_STATS = [
  {
    icon: "trending-up" as const,
    label: "Total Return",
    value: "+12.1%",
    color: "#22c55e",
  },
  {
    icon: "calendar" as const,
    label: "Monthly",
    value: "+$42",
    color: "#3b82f6",
  },
  {
    icon: "shield-checkmark" as const,
    label: "Risk Level",
    value: "Low",
    color: "#f59e0b",
  },
];

export default function InvestScreen() {
  const colors = useThemeColors();
  const fs = useTextScale();
  const { preferences } = useApp();
  const t = useTranslation(preferences.language);

  // Entrance animation
  const { anims: cardAnims, start: startCardAnims } = useStaggerAnimation({
    count: 6,
    staggerDelay: 100,
    tension: 100,
    friction: 10,
    autoStart: false,
  });
  const { fadeAnim, slideAnim } = useEntranceAnimation({
    duration: 400,
    slideDistance: 20,
    useSpring: true,
    onComplete: startCardAnims,
  });

  return (
    <ScreenLayout
      edges={["top"]}
      horizontalPadding={24}
      topPadding={24}
      bottomPadding={140}
      overlay={<Goodi screen="invest" />}
    >
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <Text style={[styles.title, { color: colors.text, fontSize: fs(24) }]}>
          {t("invest")}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondary, fontSize: fs(15) },
          ]}
        >
          {t("investSubtitle")}
        </Text>
      </Animated.View>

      {/* ── Portfolio Hero Card ─────────────────────── */}
      <Animated.View
        style={{
          opacity: cardAnims[0],
          transform: [
            {
              translateY: cardAnims[0].interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
            {
              scale: cardAnims[0].interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          ]}
          onPress={() => {
            hapticLight();
            router.push("/portfolio");
          }}
          accessibilityRole="button"
          accessibilityLabel="Portfolio value $1,750.00, up 12.1%. View portfolio"
        >
          <LinearGradient
            colors={colors.gradientCard as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />
            <View style={styles.heroHeader}>
              <Text style={styles.heroLabel}>{t("portfolioValue")}</Text>
              <View style={styles.heroBadge}>
                <Ionicons name="arrow-up" size={10} color="#22c55e" />
                <Text style={styles.heroBadgeText}>+12.1%</Text>
              </View>
            </View>
            <Text style={styles.heroAmount}>$1,750.00</Text>
            <View style={styles.heroChart}>
              <MiniSparkline
                color="rgba(255,255,255,0.6)"
                width={140}
                height={32}
              />
            </View>
            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterText}>
                {t("investGetStarted")} →
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* ── Quick Stats ─────────────────────────────── */}
      <View style={styles.statsRow}>
        {QUICK_STATS.map((stat, i) => (
          <Animated.View
            key={i}
            style={[
              styles.statCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              {
                opacity: cardAnims[1],
                transform: [
                  {
                    translateY: cardAnims[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: stat.color + "15" },
              ]}
            >
              <Ionicons name={stat.icon} size={16} color={stat.color} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {stat.label}
            </Text>
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
          </Animated.View>
        ))}
      </View>

      {/* ── Get Started Card ────────────────────────── */}
      <Animated.View
        style={{
          opacity: cardAnims[2],
          transform: [
            {
              translateY: cardAnims[2].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.8 },
          ]}
          onPress={() => {
            hapticLight();
            router.push("/portfolio");
          }}
          accessibilityRole="button"
          accessibilityLabel={t("investGetStarted")}
        >
          <LinearGradient
            colors={colors.gradientAccent as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name="trending-up" size={22} color="#fff" />
          </LinearGradient>
          <View style={styles.cardContent}>
            <Text
              style={[
                styles.cardTitle,
                { color: colors.text, fontSize: fs(16) },
              ]}
            >
              {t("investGetStarted")}
            </Text>
            <Text
              style={[
                styles.cardDesc,
                { color: colors.textSecondary, fontSize: fs(13) },
              ]}
            >
              {t("investGetStartedDesc")}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      </Animated.View>

      {/* ── Financial Passport Card ─────────────────── */}
      <Animated.View
        style={{
          opacity: cardAnims[3],
          transform: [
            {
              translateY: cardAnims[3].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
          ]}
          onPress={() => {
            hapticLight();
            router.push("/financial-passport");
          }}
          accessibilityRole="button"
          accessibilityLabel="Financial Passport — view your portable credit score"
        >
          <LinearGradient
            colors={["#1a0e2e", "#2d1a5c", "#3d2580"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { marginBottom: 14 }]}
          >
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />
            <View style={styles.heroHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="earth" size={16} color="#C9A84C" />
                <Text style={[styles.heroLabel, { color: "rgba(201,168,76,0.8)" }]}>
                  FINANCIAL PASSPORT
                </Text>
              </View>
              <View style={[styles.heroBadge, { backgroundColor: "#22c55e18" }]}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#22c55e" }} />
                <Text style={[styles.heroBadgeText, { color: "#86efac" }]}>Active</Text>
              </View>
            </View>
            <Text style={[styles.heroAmount, { fontSize: 42, color: "#C9A84C", letterSpacing: -2 }]}>
              742
            </Text>
            <Text style={[styles.heroFooterText, { marginBottom: 10 }]}>
              Credit score · Recognized in 6 countries →
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {["🇲🇽", "🇧🇷", "🇨🇴", "🇵🇭", "🇮🇳", "🇬🇹"].map((flag, i) => (
                <View
                  key={i}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{flag}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* ── Learning Hub Card ───────────────────────── */}
      <Animated.View
        style={{
          opacity: cardAnims[4],
          transform: [
            {
              translateY: cardAnims[4].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.8 },
          ]}
          onPress={() => {
            hapticLight();
            router.push("/learning-hub");
          }}
          accessibilityRole="button"
          accessibilityLabel={t("learningHub")}
        >
          <LinearGradient
            colors={["#8b5cf6", "#7c3aed"] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name="school-outline" size={22} color="#fff" />
          </LinearGradient>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {t("learningHub")}
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              {t("learningHubDesc")}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      </Animated.View>

      {/* ── Market Movers ───────────────────────────── */}
      <Animated.View
        style={{
          opacity: cardAnims[5],
          transform: [
            {
              translateY: cardAnims[5].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Market Snapshot
        </Text>
        <View
          style={[
            styles.marketCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {[
            { name: "S&P 500", val: "5,104.76", chg: "+0.52%", up: true },
            { name: "BTC/USD", val: "$64,230", chg: "+1.24%", up: true },
            { name: "EUR/USD", val: "1.0842", chg: "-0.12%", up: false },
          ].map((item, i, arr) => (
            <View key={i}>
              <View style={styles.marketRow}>
                <View>
                  <Text style={[styles.marketName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.marketVal, { color: colors.textSecondary }]}
                  >
                    {item.val}
                  </Text>
                </View>
                <View
                  style={[
                    styles.marketChgPill,
                    { backgroundColor: item.up ? "#22c55e15" : "#ef444415" },
                  ]}
                >
                  <Ionicons
                    name={item.up ? "caret-up" : "caret-down"}
                    size={12}
                    color={item.up ? "#22c55e" : "#ef4444"}
                  />
                  <Text
                    style={{
                      color: item.up ? "#22c55e" : "#ef4444",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {item.chg}
                  </Text>
                </View>
              </View>
              {i < arr.length - 1 && (
                <View
                  style={[
                    styles.marketDivider,
                    { backgroundColor: colors.border + "40" },
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      </Animated.View>
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
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 24 },
  /* Hero */
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  heroDecor1: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroDecor2: {
    position: "absolute",
    bottom: -30,
    left: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroBadgeText: { color: "#86efac", fontSize: 12, fontWeight: "700" },
  heroAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  heroChart: { marginBottom: 12 },
  heroFooter: {},
  heroFooterText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
  },
  /* Stats */
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
  statValue: { fontSize: 15, fontWeight: "800" },
  /* Cards */
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 20 },
  /* Market */
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  marketCard: { borderRadius: 20, borderWidth: 1, padding: 18 },
  marketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  marketName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  marketVal: { fontSize: 13 },
  marketChgPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  marketDivider: { height: 1, marginVertical: 4 },
});
