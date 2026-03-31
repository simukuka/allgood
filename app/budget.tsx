import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { SkeletonBox } from "@/components/SkeletonBox";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEntranceAnimation } from "@/hooks/useEntranceAnimation";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  getMonthlyBudgetSections,
  getMonthlyStats,
  getPrimaryBalance,
  type BudgetSection,
  type MoneyInsight,
} from "@/lib/data";

/* ── Animated circular progress ─────────────────────────── */
function CircularProgress({
  percent,
  size = 180,
  strokeWidth = 14,
  color,
  bgColor,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor: string;
}) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: percent,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background ring */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: bgColor,
        }}
      />
      {/* Colored ring using two half-circles trick */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
        }}
      >
        {/* First half (0-180deg) */}
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderBottomColor: "transparent",
            borderRightColor: "transparent",
            transform: [
              {
                rotate: animValue.interpolate({
                  inputRange: [0, 50, 100],
                  outputRange: ["0deg", "180deg", "180deg"],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        />
        {/* Second half (180-360deg) */}
        {percent > 50 && (
          <Animated.View
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderBottomColor: "transparent",
              borderRightColor: "transparent",
              transform: [
                {
                  rotate: animValue.interpolate({
                    inputRange: [50, 100],
                    outputRange: ["180deg", "360deg"],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}
          />
        )}
      </View>
    </View>
  );
}

/* ── Animated bar ────────────────────────────────────────── */
function AnimatedBar({
  percent,
  color,
  bgColor,
  delay = 0,
}: {
  percent: number;
  color: string;
  bgColor: string;
  delay?: number;
}) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: percent,
      duration: 1000,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent, delay]);

  return (
    <View style={[barStyles.track, { backgroundColor: bgColor }]}>
      <Animated.View
        style={[
          barStyles.fill,
          {
            backgroundColor: color,
            width: width.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
              extrapolate: "clamp",
            }),
          },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});

const SECTION_COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function BudgetScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const { user } = useAuth();
  const t = useTranslation(preferences.language);

  const { fadeAnim, slideAnim } = useEntranceAnimation({ duration: 600 });

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [transferCount, setTransferCount] = useState(0);
  const [incomeSections, setIncomeSections] = useState<BudgetSection[]>([]);
  const [expenseSections, setExpenseSections] = useState<BudgetSection[]>([]);
  const [insights, setInsights] = useState<MoneyInsight[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      const [{ balance: bal }, stats, budgetSections] = await Promise.all([
        getPrimaryBalance(user.id),
        getMonthlyStats(user.id),
        getMonthlyBudgetSections(user.id),
      ]);
      setBalance(bal);
      setTotalSent(stats.totalSent);
      setTotalReceived(stats.totalReceived);
      setTransferCount(stats.transferCount);
      setIncomeSections(budgetSections.incomeSections);
      setExpenseSections(budgetSections.expenseSections);
      setInsights(budgetSections.insights);
      setLoading(false);
    };
    loadData();
  }, [user]);

  // Total income = balance + what was sent (net inflow estimate)
  const totalIncome = totalReceived + balance;
  const spentPercent = totalIncome > 0 ? Math.min((totalSent / totalIncome) * 100, 100) : 0;
  const savingsAmount = totalReceived - totalSent;

  const monthName = new Date().toLocaleString("en-US", { month: "long" });

  return (
    <ScreenLayout edges={["top"]}>
      <ScreenHeader
        title={t("budgetTitle")}
        right={
          <Pressable
            onPress={() => router.push("/financial-passport")}
            style={({ pressed }) => [
              styles.passportBtn,
              { backgroundColor: colors.primary + "15", opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityLabel="Financial Passport"
            accessibilityRole="button"
          >
            <Ionicons name="globe-outline" size={14} color={colors.primary} />
            <Text style={[styles.passportBtnTxt, { color: colors.primary }]}>Passport</Text>
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* ── Month heading ──────────────────── */}
          <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
            {monthName} overview
          </Text>

          {/* ── Circular Progress Hero ──────────────────── */}
          {loading ? (
            <SkeletonBox style={styles.heroCardSkeleton} />
          ) : (
            <View
              style={[
                styles.heroCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View style={styles.ringRow}>
                <CircularProgress
                  percent={spentPercent}
                  color={spentPercent > 80 ? colors.error : colors.primary}
                  bgColor={colors.border + "60"}
                />
                <View style={styles.ringCenter}>
                  <Text style={[styles.ringPercent, { color: spentPercent > 80 ? colors.error : colors.primary }]}>
                    {Math.round(spentPercent)}%
                  </Text>
                  <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>
                    sent
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: colors.error }]}>
                    ${totalSent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Sent
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: colors.success }]}>
                    ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Received
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryAmount, { color: colors.text }]}>
                    {transferCount}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Transfers
                  </Text>
                </View>
              </View>

              {/* Current balance pill */}
              <View style={[styles.balancePill, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                <Ionicons name="wallet-outline" size={13} color={colors.primary} />
                <Text style={[styles.balancePillTxt, { color: colors.primary }]}>
                  Current balance: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          )}

          {/* ── Zero state ───────────────────────── */}
          {!loading && totalSent === 0 && totalReceived === 0 && (
            <View style={[styles.zeroState, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <LinearGradient
                colors={[colors.primary + "22", colors.primary + "08"]}
                style={styles.zeroIconWrap}
              >
                <Ionicons name="bar-chart-outline" size={28} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.zeroTitle, { color: colors.text }]}>No activity yet</Text>
              <Text style={[styles.zeroSub, { color: colors.textSecondary }]}>
                Make your first transfer to see your budget insights here.
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/send")}
                style={[styles.zeroBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.zeroBtnTxt}>Send money</Text>
              </Pressable>
            </View>
          )}

          {/* ── Expense sections ──── */}
          {!loading && expenseSections.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Outgoing sections
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Real monthly breakdown from your completed transactions.
              </Text>

              <View
                style={[
                  styles.categoriesCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                {expenseSections.map((section, i) => {
                  const color = SECTION_COLORS[i % SECTION_COLORS.length];
                  return (
                    <View
                      key={section.key}
                      style={[
                        styles.catRow,
                        i > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: colors.border + "60",
                        },
                      ]}
                    >
                      <View style={styles.catHeader}>
                        <View
                          style={[
                            styles.catIconWrap,
                            { backgroundColor: color + "15" },
                          ]}
                        >
                          <Ionicons name="arrow-up-circle-outline" size={18} color={color} />
                        </View>
                        <View style={styles.catInfo}>
                          <Text style={[styles.catName, { color: colors.text }]}>
                            {section.label}
                          </Text>
                          <Text
                            style={[styles.catAmounts, { color: colors.textSecondary }]}
                          >
                            ${section.amount.toFixed(2)} this month
                          </Text>
                        </View>
                        <Text style={[styles.catPercent, { color }]}> 
                          {Math.round(section.percent)}%
                        </Text>
                      </View>
                      <AnimatedBar
                        percent={section.percent}
                        color={color}
                        bgColor={colors.border + "40"}
                        delay={i * 150}
                      />
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {!loading && incomeSections.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}> 
                  Income sections
                </Text>
              </View>
              <View
                style={[
                  styles.categoriesCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                {incomeSections.map((section, i) => {
                  const color = SECTION_COLORS[(i + 2) % SECTION_COLORS.length];
                  return (
                    <View
                      key={section.key}
                      style={[
                        styles.catRow,
                        i > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: colors.border + "60",
                        },
                      ]}
                    >
                      <View style={styles.catHeader}>
                        <View
                          style={[
                            styles.catIconWrap,
                            { backgroundColor: color + "15" },
                          ]}
                        >
                          <Ionicons name="arrow-down-circle-outline" size={18} color={color} />
                        </View>
                        <View style={styles.catInfo}>
                          <Text style={[styles.catName, { color: colors.text }]}> 
                            {section.label}
                          </Text>
                          <Text
                            style={[styles.catAmounts, { color: colors.textSecondary }]}
                          >
                            ${section.amount.toFixed(2)} this month
                          </Text>
                        </View>
                        <Text style={[styles.catPercent, { color }]}> 
                          {Math.round(section.percent)}%
                        </Text>
                      </View>
                      <AnimatedBar
                        percent={section.percent}
                        color={color}
                        bgColor={colors.border + "40"}
                        delay={i * 120}
                      />
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Income vs Expenses card ───────────────── */}
          {!loading && (
            <View
              style={[
                styles.incomeCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View style={styles.incomeHeader}>
                <LinearGradient
                  colors={colors.gradientAccent as unknown as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.incomeIconWrap}
                >
                  <Ionicons name="swap-vertical" size={20} color="#fff" />
                </LinearGradient>
                <Text style={[styles.incomeTitle, { color: colors.text }]}>
                  {t("incomeVsExpenses")}
                </Text>
              </View>

              <View style={styles.incomeBarRow}>
                <View style={styles.incomeBarItem}>
                  <View style={styles.incomeBarLabelRow}>
                    <View style={[styles.dot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.incomeBarLabel, { color: colors.textSecondary }]}>
                      Received
                    </Text>
                  </View>
                  <Text style={[styles.incomeBarAmount, { color: colors.success }]}>
                    ${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <AnimatedBar
                    percent={100}
                    color={colors.success}
                    bgColor={colors.border + "40"}
                    delay={200}
                  />
                </View>
                <View style={styles.incomeBarItem}>
                  <View style={styles.incomeBarLabelRow}>
                    <View style={[styles.dot, { backgroundColor: colors.error }]} />
                    <Text style={[styles.incomeBarLabel, { color: colors.textSecondary }]}>
                      Sent
                    </Text>
                  </View>
                  <Text style={[styles.incomeBarAmount, { color: colors.error }]}>
                    ${totalSent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <AnimatedBar
                    percent={totalReceived > 0 ? Math.min((totalSent / totalReceived) * 100, 100) : 0}
                    color={colors.error}
                    bgColor={colors.border + "40"}
                    delay={400}
                  />
                </View>
              </View>

              {savingsAmount > 0 ? (
                <View style={[styles.savingsPill, { backgroundColor: colors.success + "12" }]}>
                  <Ionicons name="trending-up" size={16} color={colors.success} />
                  <Text style={[styles.savingsText, { color: colors.success }]}>
                    ${savingsAmount.toFixed(2)} net positive this month!
                  </Text>
                </View>
              ) : totalSent > 0 ? (
                <View style={[styles.savingsPill, { backgroundColor: colors.warning + "12" }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                  <Text style={[styles.savingsText, { color: colors.warning }]}>
                    ${Math.abs(savingsAmount).toFixed(2)} more sent than received this month.
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {!loading && insights.length > 0 && (
            <View
              style={[
                styles.incomeCard,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View style={styles.incomeHeader}>
                <LinearGradient
                  colors={colors.gradientAccent as unknown as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.incomeIconWrap}
                >
                  <Ionicons name="sparkles" size={20} color="#fff" />
                </LinearGradient>
                <Text style={[styles.incomeTitle, { color: colors.text }]}> 
                  AI money insights
                </Text>
              </View>

              {insights.map((item, index) => (
                <View
                  key={`${item.title}-${index}`}
                  style={[
                    styles.insightRow,
                    index < insights.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.insightDot,
                      {
                        backgroundColor:
                          item.level === "good"
                            ? colors.success
                            : item.level === "warn"
                              ? colors.warning
                              : colors.primary,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.insightText, { color: colors.textSecondary }]}>{item.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Add funds / connect hint ─────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.connectCard,
              { backgroundColor: colors.primary + (pressed ? "18" : "10") },
            ]}
            onPress={() => router.push("/deposit")}
            accessibilityRole="button"
            accessibilityLabel="Add funds to your account"
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={[styles.connectText, { color: colors.primary }]}>
              Add funds to your account
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.connectCard,
              { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => router.push("/financial-passport")}
            accessibilityRole="button"
            accessibilityLabel="View Financial Passport"
          >
            <LinearGradient
              colors={["#7F77DD", "#D4537E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.passportIconWrap}
            >
              <Ionicons name="globe-outline" size={18} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.connectText, { color: colors.text, marginBottom: 1 }]}>
                View Financial Passport
              </Text>
              <Text style={[styles.connectSub, { color: colors.textSecondary }]}>
                Your credit history across borders
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  monthLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  heroCardSkeleton: {
    height: 280,
    borderRadius: 24,
    marginBottom: 28,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  ringRow: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
  },
  ringPercent: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  summaryDivider: {
    width: 1,
    height: 36,
    opacity: 0.5,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  balancePillTxt: {
    fontSize: 13,
    fontWeight: "600",
  },
  zeroState: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
  },
  zeroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  zeroTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  zeroSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  zeroBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  zeroBtnTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  demoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  demoBadgeTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  categoriesCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 28,
  },
  catRow: {
    padding: 16,
    gap: 10,
  },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  catAmounts: {
    fontSize: 12,
  },
  catPercent: {
    fontSize: 14,
    fontWeight: "700",
  },
  incomeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  incomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  incomeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  incomeTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  incomeBarRow: {
    gap: 16,
    marginBottom: 16,
  },
  incomeBarItem: {
    gap: 6,
  },
  insightRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 18,
  },
  incomeBarLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  incomeBarLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  incomeBarAmount: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  savingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  connectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
  },
  connectText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  connectSub: {
    fontSize: 12,
  },
  passportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  passportBtnTxt: {
    fontSize: 12,
    fontWeight: "700",
  },
  passportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
