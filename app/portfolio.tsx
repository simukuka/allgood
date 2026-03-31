import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useEntranceAnimation } from "@/hooks/useEntranceAnimation";
import { useThemeColors } from "@/hooks/useThemeColors";
import { LinearGradient } from "expo-linear-gradient";

/* ── Animated bar chart ───────────────────────────────────── */
function AnimatedBarChart({ data, color }: { data: number[]; color: string }) {
  const anims = useRef(data.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      50,
      anims.map((a) =>
        Animated.spring(a, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, []);
  const max = Math.max(...data);
  return (
    <View style={chartStyles.container}>
      {data.map((val, i) => {
        const pct = (val / max) * 100;
        const height = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, pct],
        });
        return (
          <Animated.View
            key={i}
            style={[
              chartStyles.bar,
              {
                height: height.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: i >= data.length - 3 ? color : color + "35",
              },
            ]}
          />
        );
      })}
    </View>
  );
}
const chartStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 5,
    height: 120,
  },
  bar: { flex: 1, borderRadius: 4, minWidth: 8 },
});

const HOLDINGS = [
  {
    icon: "trending-up",
    name: "US Stocks (S&P 500)",
    value: "$892.40",
    change: "+12.4%",
    color: "#22c55e",
  },
  {
    icon: "stats-chart",
    name: "Bonds",
    value: "$245.00",
    change: "+3.2%",
    color: "#22c55e",
  },
  {
    icon: "shield-checkmark",
    name: "High-Yield Savings",
    value: "$500.00",
    change: "+4.5%",
    color: "#22c55e",
  },
  {
    icon: "logo-bitcoin",
    name: "Crypto (BTC/ETH)",
    value: "$112.60",
    change: "-2.1%",
    color: "#ef4444",
  },
];

const PERIODS = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

export default function PortfolioScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const t = useTranslation(preferences.language);

  const [activePeriod, setActivePeriod] = useState("1M");
  const [autoInvest, setAutoInvest] = useState(true);

  const totalValue = 1750.0;
  const totalReturn = 189.42;
  const returnPct = 12.1;

  // Entrance animations
  const { fadeAnim, slideAnim } = useEntranceAnimation();
  const valueScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.spring(valueScale, {
      toValue: 1,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const CHART_DATA_MAP: Record<string, number[]> = {
    "1W": [40, 42, 38, 45, 43, 48, 47],
    "1M": [40, 55, 45, 70, 60, 80, 75, 90, 85, 95, 88, 92],
    "3M": [30, 35, 42, 50, 55, 48, 60, 65, 72, 68, 75, 80],
    "6M": [25, 30, 35, 40, 50, 55, 45, 60, 70, 75, 80, 85],
    "1Y": [20, 25, 35, 30, 45, 50, 55, 65, 60, 70, 80, 90],
    ALL: [15, 20, 18, 25, 30, 35, 40, 50, 55, 65, 75, 85],
  };

  return (
    <ScreenLayout>
      <ScreenHeader title={t("portfolioTitle")} />

      {/* Value card */}
      <Animated.View
        style={{ transform: [{ scale: valueScale }], opacity: fadeAnim }}
      >
        <LinearGradient
          colors={colors.gradientCard as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.valueCard}
        >
          <View style={styles.valueDecor1} />
          <View style={styles.valueDecor2} />
          <Text style={styles.valueLabel}>{t("portfolioValue")}</Text>
          <Text style={styles.valueAmount}>${totalValue.toFixed(2)}</Text>
          <View style={styles.returnRow}>
            <Ionicons name="arrow-up" size={14} color="#86efac" />
            <Text style={styles.returnText}>
              +${totalReturn.toFixed(2)} ({returnPct}%)
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodBtn,
              activePeriod === p && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setActivePeriod(p)}
          >
            <Text
              style={[
                styles.periodText,
                {
                  color: activePeriod === p ? "#fff" : colors.textSecondary,
                },
              ]}
            >
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Animated Chart */}
      <Animated.View
        style={[
          styles.chartPlaceholder,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
            opacity: fadeAnim,
          },
        ]}
      >
        <AnimatedBarChart
          key={activePeriod}
          data={CHART_DATA_MAP[activePeriod] || CHART_DATA_MAP["1M"]}
          color={colors.primary}
        />
      </Animated.View>

      {/* Holdings */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("holdings").toUpperCase()}
      </Text>
      <View style={styles.holdingsList}>
        {HOLDINGS.map((h, i) => (
          <View
            key={i}
            style={[
              styles.holdingCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.holdingIcon,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name={h.icon as any} size={20} color={colors.primary} />
            </View>
            <View style={styles.holdingInfo}>
              <Text style={[styles.holdingName, { color: colors.text }]}>
                {h.name}
              </Text>
              <Text style={[styles.holdingChange, { color: h.color }]}>
                {h.change}
              </Text>
            </View>
            <Text style={[styles.holdingValue, { color: colors.text }]}>
              {h.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Auto-invest */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("autoInvest").toUpperCase()}
      </Text>
      <View
        style={[
          styles.autoCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <View style={styles.autoRow}>
          <View style={styles.autoInfo}>
            <Text style={[styles.autoTitle, { color: colors.text }]}>
              {t("autoInvest")}
            </Text>
            <Text style={[styles.autoDesc, { color: colors.textSecondary }]}>
              {t("autoInvestDesc")}
            </Text>
          </View>
          <Switch
            value={autoInvest}
            onValueChange={setAutoInvest}
            trackColor={{ false: colors.border, true: colors.primary + "80" }}
            thumbColor={autoInvest ? colors.primary : "#ccc"}
          />
        </View>
        {autoInvest && (
          <View style={[styles.autoDetails, { borderTopColor: colors.border }]}>
            <View style={styles.autoDetailRow}>
              <Text
                style={[
                  styles.autoDetailLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {t("weeklyAmount")}
              </Text>
              <Text style={[styles.autoDetailVal, { color: colors.text }]}>
                $25.00
              </Text>
            </View>
            <View style={styles.autoDetailRow}>
              <Text
                style={[
                  styles.autoDetailLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {t("nextInvestment")}
              </Text>
              <Text style={[styles.autoDetailVal, { color: colors.text }]}>
                Jul 7, 2025
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Risk level */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("riskLevel").toUpperCase()}
      </Text>
      <View
        style={[
          styles.riskCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <View style={styles.riskBarContainer}>
          {["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"].map(
            (c, i) => (
              <View
                key={i}
                style={[
                  styles.riskSegment,
                  {
                    backgroundColor: c,
                    opacity: i <= 1 ? 1 : 0.3,
                  },
                ]}
              />
            ),
          )}
        </View>
        <Text style={[styles.riskLabel, { color: colors.text }]}>
          {t("moderate")} — {t("moderateDesc")}
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  valueCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  valueDecor1: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  valueDecor2: {
    position: "absolute",
    bottom: -30,
    left: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  valueLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 6 },
  valueAmount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 8,
  },
  returnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  returnText: { color: "#86efac", fontSize: 13, fontWeight: "600" },
  periodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  periodText: { fontSize: 13, fontWeight: "600" },
  chartPlaceholder: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 28,
    height: 160,
    justifyContent: "flex-end",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  holdingsList: { gap: 10, marginBottom: 28 },
  holdingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  holdingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  holdingInfo: { flex: 1 },
  holdingName: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  holdingChange: { fontSize: 12, fontWeight: "600" },
  holdingValue: { fontSize: 16, fontWeight: "700" },
  autoCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
    overflow: "hidden",
  },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  autoInfo: { flex: 1 },
  autoTitle: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  autoDesc: { fontSize: 13 },
  autoDetails: { borderTopWidth: 1, padding: 16, gap: 10 },
  autoDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  autoDetailLabel: { fontSize: 13 },
  autoDetailVal: { fontSize: 14, fontWeight: "600" },
  riskCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  riskBarContainer: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
    height: 8,
  },
  riskSegment: { flex: 1, borderRadius: 4 },
  riskLabel: { fontSize: 13, fontWeight: "500" },
});
