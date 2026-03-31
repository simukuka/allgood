import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Goodi } from "@/components/Goodi";
import { ScreenLayout } from "@/components/ScreenLayout";
import { SkeletonBox } from "@/components/SkeletonBox";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useEntranceAnimation } from "@/hooks/useEntranceAnimation";
import { useStaggerAnimation } from "@/hooks/useStaggerAnimation";
import { useTextScale } from "@/hooks/useTextScale";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
    getMonthlyChange,
    getMonthlyStats,
    getPrimaryBalance,
    getRecentTransactions,
} from "@/lib/data";
import type { Transaction } from "@/lib/database.types";
import { hapticLight } from "@/lib/haptics";
import {
    type CurrencyCode,
    formatCurrency,
    formatSignedAmount,
} from "@/utils/currency";

export default function HomeScreen() {
  const colors = useThemeColors();
  const fs = useTextScale();
  const { userName, preferences } = useApp();
  const { user } = useAuth();
  const t = useTranslation(preferences.language);

  // Real data state
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [monthlyChange, setMonthlyChange] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({ totalSent: 0, totalReceived: 0, transferCount: 0, avgTransfer: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animated counter for balance
  const displayBalance = useAnimatedCounter(isLoading ? 0 : balance, 1400);

  // Stagger quick-action animations
  const { anims: quickAnims, start: startQuickAnims } = useStaggerAnimation({
    count: 4,
    staggerDelay: 100,
    tension: 100,
    friction: 10,
    autoStart: false,
  });

  // Entrance animation
  const { fadeAnim, slideAnim } = useEntranceAnimation({
    duration: 500,
    useSpring: true,
    onComplete: startQuickAnims,
  });

  // Notification bell pulse
  const bellPulse = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setLoadError(false);
    try {
      const [bal, change, txs, stats] = await Promise.all([
        getPrimaryBalance(user.id),
        getMonthlyChange(user.id),
        getRecentTransactions(user.id, 5),
        getMonthlyStats(user.id),
      ]);
      setBalance(bal.balance);
      setCurrency(bal.currency as CurrencyCode);
      setMonthlyChange(change);
      setTransactions(txs);
      setMonthlyStats(stats);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Entrance animations
  useEffect(() => {
    // Pulse the notification bell
    const bellLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bellPulse, {
          toValue: 1.2,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bellPulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    bellLoop.start();
    return () => bellLoop.stop();
  }, []);

  const h = new Date().getHours();
  const greeting =
    h < 12 ? t("goodMorning") : h < 18 ? t("goodAfternoon") : t("goodEvening");

  const QUICK_ACTIONS = [
    {
      icon: "arrow-up" as const,
      label: t("send"),
      route: "/(tabs)/send" as const,
    },
    {
      icon: "add-circle-outline" as const,
      label: "Add funds",
      route: "/deposit" as const,
    },
    {
      icon: "arrow-down" as const,
      label: t("request"),
      route: "/request" as const,
    },
    { icon: "card" as const, label: t("cards"), route: "/cards" as const },
  ];

  return (
    <ScreenLayout
      edges={["top"]}
      horizontalPadding={24}
      bottomPadding={140}
      overlay={<Goodi screen="home" />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <Text
          style={[
            styles.greeting,
            { color: colors.textSecondary, fontSize: fs(14) },
          ]}
        >
          {greeting}
        </Text>
        <View style={styles.nameRow}>
          <Text
            style={[styles.userName, { color: colors.text, fontSize: fs(28) }]}
          >
            {userName}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={[styles.bellBtn, { backgroundColor: colors.cardBg }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            accessibilityHint="You have unread notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
            <Animated.View
              style={[
                styles.bellDot,
                {
                  backgroundColor: colors.error,
                  transform: [{ scale: bellPulse }],
                },
              ]}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.balanceCardWrap}>
        <LinearGradient
          colors={colors.gradientCard as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.balanceCard, styles.balanceCardShadow]}
        >
          {/* Decorative circles */}
          <View style={styles.balanceDecor1} />
          <View style={styles.balanceDecor2} />
          <Text style={[styles.balanceLabel, { fontSize: fs(12) }]}>
            {t("totalBalance")}
          </Text>
          {isLoading ? (
            <SkeletonBox
              width={180}
              height={44}
              borderRadius={12}
              style={{ marginVertical: 4 }}
            />
          ) : (
            <Text style={[styles.balanceAmount, { fontSize: fs(40) }]}>
              {formatCurrency(displayBalance, currency)}
            </Text>
          )}
          <View style={styles.changeRow}>
            <View
              style={[
                styles.changePill,
                {
                  backgroundColor:
                    monthlyChange >= 0
                      ? "rgba(16,185,129,0.2)"
                      : "rgba(239,68,68,0.2)",
                },
              ]}
            >
              <Ionicons
                name={
                  monthlyChange >= 0 ? "arrow-up-circle" : "arrow-down-circle"
                }
                size={14}
                color={monthlyChange >= 0 ? "#34d399" : "#f87171"}
              />
              <Text
                style={[
                  styles.balanceChange,
                  { color: monthlyChange >= 0 ? "#34d399" : "#f87171" },
                ]}
              >
                {formatSignedAmount(monthlyChange)} {t("thisMonth")}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((a, i) => (
          <Animated.View
            key={i}
            style={{
              flex: 1,
              opacity: quickAnims[i],
              transform: [
                {
                  translateY: quickAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
                {
                  scale: quickAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <Pressable
              style={({ pressed }) => [
                styles.quickBtn,
                { backgroundColor: colors.cardBg },
                pressed && { transform: [{ scale: 0.92 }], opacity: 0.8 },
              ]}
              onPress={() => {
                hapticLight();
                router.push(a.route);
              }}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <LinearGradient
                colors={colors.gradientAccent as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickIconWrap}
              >
                <Ionicons name={a.icon} size={18} color="#fff" />
              </LinearGradient>
              <Text style={[styles.quickLabel, { color: colors.text }]}>
                {a.label}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.budgetCard,
          {
            backgroundColor: colors.primary + "10",
            borderColor: colors.primary + "30",
          },
        ]}
        onPress={() => router.push("/budget")}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("budgetTracker")}
        accessibilityHint="Opens your budget tracker"
      >
        <View
          style={[
            styles.budgetIconWrap,
            { backgroundColor: colors.primary + "20" },
          ]}
        >
          <Ionicons name="wallet-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.budgetText}>
          <Text style={[styles.budgetTitle, { color: colors.text }]}>
            {t("budgetTracker")}
          </Text>
          <Text style={[styles.budgetDesc, { color: colors.textSecondary }]}>
            {t("budgetDesc")}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* ── Spending Insights ─────────────────────── */}
      <View
        style={[
          styles.insightsCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <View style={styles.insightsHeader}>
          <Text style={[styles.insightsTitle, { color: colors.text }]}>
            {t("spendingInsights" as any)}
          </Text>
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              router.push("/budget");
            }}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={t("viewBudget" as any)}
          >
            <Text style={[styles.insightsLink, { color: colors.primary }]}>
              {t("viewBudget" as any)}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.insightsRow}>
          {[
            {
              label: "Sent this month",
              value: monthlyStats.totalSent > 0 ? `$${monthlyStats.totalSent.toFixed(0)}` : "$0",
              icon: "arrow-up-circle-outline" as const,
              color: "#f59e0b",
            },
            {
              label: "Avg transfer",
              value: monthlyStats.avgTransfer > 0 ? `$${monthlyStats.avgTransfer.toFixed(0)}` : "$0",
              icon: "trending-up-outline" as const,
              color: "#3b82f6",
            },
            {
              label: "Transfers",
              value: String(monthlyStats.transferCount),
              icon: "receipt-outline" as const,
              color: "#10b981",
            },
          ].map((item, i) => (
            <View key={i} style={styles.insightItem}>
              <View
                style={[
                  styles.insightIconWrap,
                  { backgroundColor: item.color + "15" },
                ]}
              >
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <Text style={[styles.insightValue, { color: colors.text }]}>
                {item.value}
              </Text>
              <Text
                style={[styles.insightLabel, { color: colors.textSecondary }]}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── This Month Summary ─────────────────────── */}
      <View
        style={[
          styles.savingsCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <View style={styles.savingsHeader}>
          <View
            style={[
              styles.savingsIconWrap,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.savingsTitle, { color: colors.text }]}>
              This Month
            </Text>
            <Text style={[styles.savingsDesc, { color: colors.textSecondary }]}>
              {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            </Text>
          </View>
          {monthlyStats.transferCount > 0 && (
            <View
              style={[styles.onTrackBadge, { backgroundColor: colors.primary + "15" }]}
            >
              <Text style={[styles.onTrackText, { color: colors.primary }]}>
                {monthlyStats.transferCount} sent
              </Text>
            </View>
          )}
        </View>
        <View style={styles.savingsProgressWrap}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <View>
              <Text style={[{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }]}>Sent</Text>
              <Text style={[styles.savingsCurrent, { color: colors.text }]}>
                {formatCurrency(monthlyStats.totalSent, "USD")}
              </Text>
            </View>
            {monthlyStats.totalReceived > 0 && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }]}>Received</Text>
                <Text style={[styles.savingsCurrent, { color: "#10b981" }]}>
                  +{formatCurrency(monthlyStats.totalReceived, "USD")}
                </Text>
              </View>
            )}
          </View>
          {monthlyStats.transferCount === 0 && (
            <Text style={[{ fontSize: 13, color: colors.textSecondary }]}>
              No transfers yet this month. Tap Send to get started.
            </Text>
          )}
        </View>
      </View>

      {/* ── Financial Passport promo ─────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.passportPromoCard,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => {
          hapticLight();
          router.push("/financial-passport");
        }}
        accessibilityRole="button"
        accessibilityLabel="Financial Passport — tap to view"
        accessibilityHint="Opens your Financial Passport"
      >
        <LinearGradient
          colors={["#1a0e2e", "#2d1a5c", "#3d2580"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.passportPromoGradient}
        >
          {/* Decorative orbs */}
          <View style={styles.passportOrb1} />
          <View style={styles.passportOrb2} />

          <View style={styles.passportPromoLeft}>
            <View style={styles.passportPromoIconWrap}>
              <Ionicons name="earth" size={22} color="#C9A84C" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.passportPromoBadgeRow}>
                <View style={styles.passportPromoBadge}>
                  <Text style={styles.passportPromoBadgeText}>NEW</Text>
                </View>
                <Text style={styles.passportPromoTitle}>Financial Passport</Text>
              </View>
              <Text style={styles.passportPromoSub}>
                Your credit history crosses borders
              </Text>
            </View>
          </View>

          <View style={styles.passportPromoRight}>
            <Text style={styles.passportPromoScore}>742</Text>
            <Text style={styles.passportPromoScoreLabel}>Credit Score</Text>
            <Ionicons name="chevron-forward-circle" size={20} color="rgba(201,168,76,0.8)" style={{ marginTop: 6 }} />
          </View>
        </LinearGradient>
      </Pressable>

      {/* ── Tip of the Day ─────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.tipCard,
          {
            borderColor: "#8b5cf6" + "30",
            backgroundColor: "#8b5cf6" + "08",
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => {
          hapticLight();
          router.push("/learning-hub");
        }}
        accessibilityRole="button"
        accessibilityLabel={t("tipOfDay" as any)}
        accessibilityHint="Opens the Learning Hub"
      >
        <LinearGradient
          colors={["#8b5cf6", "#7c3aed"]}
          style={styles.tipIconWrap}
        >
          <Ionicons name="bulb" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tipBadge, { color: "#8b5cf6" }]}>
            {t("tipOfDay" as any)}
          </Text>
          <Text style={[styles.tipTitle, { color: colors.text }]}>
            {t("tipTitle" as any)}
          </Text>
          <Text
            style={[styles.tipDesc, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {t("tipDesc" as any)}
          </Text>
        </View>
        <Ionicons
          name="arrow-forward-circle"
          size={20}
          color="#8b5cf6"
          style={{ alignSelf: "center" }}
        />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t("recentActivity")}
      </Text>

      {/* Error banner */}
      {loadError && (
        <TouchableOpacity
          style={[
            styles.errorBanner,
            {
              backgroundColor: colors.error + "12",
              borderColor: colors.error + "30",
            },
          ]}
          onPress={loadData}
          activeOpacity={0.7}
        >
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={[styles.errorBannerText, { color: colors.error }]}>
            {t("connectionError")}
          </Text>
          <Text style={[styles.retryText, { color: colors.primary }]}>
            {t("retry")}
          </Text>
        </TouchableOpacity>
      )}

      <View
        style={[
          styles.activityContainer,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        {isLoading ? (
          <View style={{ padding: 16, gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <SkeletonBox width={44} height={44} borderRadius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBox width="60%" height={14} />
                  <SkeletonBox width="40%" height={12} />
                </View>
                <SkeletonBox width={60} height={14} />
              </View>
            ))}
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={32}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {t("noTransactions")}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {t("noTransactionsDesc")}
            </Text>
          </View>
        ) : (
          transactions.map((tx, i) => {
            const isSender = tx.sender_id === user?.id;
            const amount = isSender ? -tx.amount : tx.amount;
            const initials = tx.recipient_name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const timeDiff = Date.now() - new Date(tx.created_at).getTime();
            const hours = Math.floor(timeDiff / 3600000);
            const timeStr =
              hours < 1
                ? "now"
                : hours < 24
                  ? `${hours}h`
                  : `${Math.floor(hours / 24)}d`;

            return (
              <TouchableOpacity
                key={tx.id}
                style={[
                  styles.activityRow,
                  i < transactions.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border + "60",
                  },
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${tx.recipient_name} ${formatSignedAmount(amount)}`}
                onPress={() =>
                  router.push({
                    pathname: "/transaction-detail",
                    params: {
                      id: tx.id,
                      sender_id: tx.sender_id,
                      recipient_name: tx.recipient_name,
                      amount: String(tx.amount),
                      currency: tx.currency,
                      converted_amount:
                        tx.converted_amount != null
                          ? String(tx.converted_amount)
                          : "",
                      converted_currency: tx.converted_currency || "",
                      exchange_rate:
                        tx.exchange_rate != null
                          ? String(tx.exchange_rate)
                          : "",
                      fee: String(tx.fee),
                      status: tx.status,
                      type: tx.type,
                      note: tx.note || "",
                      created_at: tx.created_at,
                      completed_at: tx.completed_at || "",
                      recipient_email: tx.recipient_email || "",
                      recipient_phone: tx.recipient_phone || "",
                    },
                  })
                }
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {initials}
                  </Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityName, { color: colors.text }]}>
                    {tx.recipient_name}
                  </Text>
                  <Text
                    style={[
                      styles.activityDesc,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {isSender ? t("sentTo") : t("received")} · {timeStr}{" "}
                    {t("ago")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.activityAmount,
                    { color: amount >= 0 ? colors.success : colors.error },
                  ]}
                >
                  {formatSignedAmount(amount)}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textSecondary}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  userName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  bellDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  balanceCardWrap: {
    marginBottom: 28,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 28,
    overflow: "hidden",
  },
  balanceCardShadow: {},
  balanceDecor1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  balanceDecor2: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 10,
    letterSpacing: 1.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1.5,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  balanceChange: { fontSize: 13, fontWeight: "600" },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
  budgetCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  budgetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetText: { flex: 1 },
  budgetTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  budgetDesc: { fontSize: 13, lineHeight: 18 },

  // Spending Insights
  insightsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  insightsTitle: { fontSize: 15, fontWeight: "700" },
  insightsLink: { fontSize: 12, fontWeight: "600" },
  insightsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  insightItem: {
    alignItems: "center",
    gap: 6,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  insightValue: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  insightLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  // Savings Goal
  savingsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  savingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  savingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  savingsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  savingsDesc: { fontSize: 12 },
  onTrackBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  onTrackText: { fontSize: 10, fontWeight: "700" },
  savingsProgressWrap: { gap: 8 },
  savingsProgressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  savingsProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  savingsAmounts: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  savingsCurrent: { fontSize: 13, fontWeight: "700" },
  savingsTarget: { fontSize: 12 },

  // Financial Passport promo
  passportPromoCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#7F77DD",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  passportPromoGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    overflow: "hidden",
  },
  passportOrb1: {
    position: "absolute",
    top: -24,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(127,119,221,0.18)",
  },
  passportOrb2: {
    position: "absolute",
    bottom: -20,
    left: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(201,168,76,0.1)",
  },
  passportPromoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  passportPromoIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(201,168,76,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
  },
  passportPromoBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
  },
  passportPromoBadge: {
    backgroundColor: "#C9A84C",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  passportPromoBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1a0e2e",
    letterSpacing: 0.5,
  },
  passportPromoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  passportPromoSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  passportPromoRight: {
    alignItems: "center",
    paddingLeft: 14,
  },
  passportPromoScore: {
    fontSize: 26,
    fontWeight: "800",
    color: "#C9A84C",
    letterSpacing: -1,
  },
  passportPromoScoreLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  // Tip of the Day
  tipCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 28,
  },
  tipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  tipBadge: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  tipTitle: { fontSize: 14, fontWeight: "700", marginBottom: 3 },
  tipDesc: { fontSize: 12, lineHeight: 18 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  activityContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700" },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  activityDesc: { fontSize: 13 },
  activityAmount: { fontSize: 15, fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
