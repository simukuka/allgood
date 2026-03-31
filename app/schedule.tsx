import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getScheduledTransfers } from "@/lib/data";
import type { ScheduledTransfer } from "@/lib/database.types";
import { formatCurrency } from "@/utils/currency";

const COUNTRY_FLAGS: Record<string, string> = {
  MXN: "🇲🇽",
  BRL: "🇧🇷",
  COP: "🇨🇴",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  USD: "🇺🇸",
};

export default function ScheduleScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const { user } = useAuth();
  const t = useTranslation(preferences.language);
  const [activeTab, setActiveTab] = useState<"upcoming" | "recurring">(
    "upcoming",
  );
  const [transfers, setTransfers] = useState<ScheduledTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getScheduledTransfers(user.id);
      setTransfers(data);
    } catch {
      console.warn("Failed to load scheduled transfers");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const upcomingTransfers = transfers.filter((t) => t.frequency === "once");
  const recurringTransfers = transfers.filter((t) => t.frequency !== "once");
  const displayedTransfers =
    activeTab === "upcoming" ? upcomingTransfers : recurringTransfers;

  // If no upcoming/recurring split, show all
  const hasAnySplit =
    upcomingTransfers.length > 0 || recurringTransfers.length > 0;
  const visibleTransfers = hasAnySplit ? displayedTransfers : transfers;

  const totalMonthly = transfers.reduce((sum, t) => {
    if (t.frequency === "monthly") return sum + t.amount;
    if (t.frequency === "biweekly") return sum + t.amount * 2;
    if (t.frequency === "weekly") return sum + t.amount * 4;
    return sum + t.amount;
  }, 0);

  const formatNextDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ScreenLayout
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      footer={
        <View style={styles.footer}>
          <Button
            title={t("scheduleNew")}
            onPress={() => router.push("/(tabs)/send")}
          />
        </View>
      }
    >
      <ScreenHeader title={t("scheduleTitle")} />

      {/* Summary card */}
      <View
        style={[styles.summaryCard, { backgroundColor: colors.primary + "10" }]}
      >
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.primary }]}>
            {transfers.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            {t("activeSchedules")}
          </Text>
        </View>
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: colors.primary }]}>
            {formatCurrency(totalMonthly, "USD")}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            {t("monthlyTotal")}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.cardBg }]}>
        {(["upcoming", "recurring"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && {
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === tab ? "#fff" : colors.textSecondary,
                },
              ]}
            >
              {t(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scheduled items */}
      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {t("loading")}
            </Text>
          </View>
        ) : visibleTransfers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={40}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {t("noScheduled")}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {t("noScheduledDesc")}
            </Text>
          </View>
        ) : (
          visibleTransfers.map((item) => {
            const flag = COUNTRY_FLAGS[item.currency] || "🌍";
            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.itemTop}>
                  <Text style={styles.itemFlag}>{flag}</Text>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text }]}>
                      {item.recipient_name}
                    </Text>
                    <View style={styles.itemRow}>
                      <Ionicons
                        name="repeat"
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.itemFreq,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t(item.frequency as any)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemAmounts}>
                    <Text style={[styles.itemAmount, { color: colors.text }]}>
                      {formatCurrency(item.amount, item.currency as any)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[styles.itemBottom, { borderTopColor: colors.border }]}
                >
                  <View style={styles.nextRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[styles.nextText, { color: colors.textSecondary }]}
                    >
                      {t("nextTransfer")}: {formatNextDate(item.next_date)}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name="pause-circle-outline"
                        size={18}
                        color="#f59e0b"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.6}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    justifyContent: "center",
    gap: 0,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  summaryLabel: { fontSize: 12, fontWeight: "500" },
  summaryDivider: { width: 1, marginVertical: 4 },
  tabs: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  list: { gap: 12 },
  itemCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  itemFlag: { fontSize: 28 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  itemFreq: { fontSize: 12, fontWeight: "500" },
  itemAmounts: { alignItems: "flex-end" },
  itemAmount: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  itemConverted: { fontSize: 12 },
  itemBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nextText: { fontSize: 12, fontWeight: "500" },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: { padding: 4 },
  footer: { padding: 28, paddingBottom: 32 },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
