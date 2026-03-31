import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTextScale } from "@/hooks/useTextScale";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getTransactionById } from "@/lib/data";
import type { Transaction } from "@/lib/database.types";
import {
    type CurrencyCode,
    formatCurrency,
    formatSignedAmount,
} from "@/utils/currency";

const STATUS_CONFIG: Record<
  string,
  { icon: string; color: string; bgOpacity: string }
> = {
  completed: { icon: "checkmark-circle", color: "#22c55e", bgOpacity: "15" },
  pending: { icon: "time", color: "#f59e0b", bgOpacity: "15" },
  failed: { icon: "close-circle", color: "#ef4444", bgOpacity: "15" },
  cancelled: { icon: "ban", color: "#6b7280", bgOpacity: "15" },
};

export default function TransactionDetailScreen() {
  const colors = useThemeColors();
  const fs = useTextScale();
  const { preferences } = useApp();
  const { user } = useAuth();
  const t = useTranslation(preferences.language);
  const params = useLocalSearchParams<{
    id: string;
    sender_id?: string;
    recipient_name?: string;
    amount?: string;
    currency?: string;
    converted_amount?: string;
    converted_currency?: string;
    exchange_rate?: string;
    fee?: string;
    status?: string;
    type?: string;
    note?: string;
    created_at?: string;
    completed_at?: string;
    recipient_email?: string;
    recipient_phone?: string;
  }>();

  // If navigated with only an id (e.g. from notifications), fetch from DB
  const [fetched, setFetched] = useState<Transaction | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const isSparseParms = !params.amount && !!params.id;

  useEffect(() => {
    if (!isSparseParms) return;
    setFetchLoading(true);
    getTransactionById(params.id).then(tx => {
      setFetched(tx);
      setFetchLoading(false);
    });
  }, [params.id, isSparseParms]);

  // Resolve fields from either URL params or fetched DB row
  const tx = fetched;
  const sender_id      = tx?.sender_id    ?? params.sender_id    ?? "";
  const recipient_name = tx?.recipient_name ?? params.recipient_name ?? "Unknown";
  const recipient_email = tx?.recipient_email ?? params.recipient_email ?? null;
  const recipient_phone = tx?.recipient_phone ?? params.recipient_phone ?? null;
  const amount         = parseFloat(String(tx?.amount         ?? params.amount         ?? "0"));
  const fee            = parseFloat(String(tx?.fee            ?? params.fee            ?? "0"));
  const exchange_rate  = tx?.exchange_rate  ?? params.exchange_rate  ? parseFloat(String(tx?.exchange_rate ?? params.exchange_rate)) : null;
  const converted_amount = tx?.converted_amount ?? params.converted_amount ? parseFloat(String(tx?.converted_amount ?? params.converted_amount)) : null;
  const converted_currency = tx?.converted_currency ?? params.converted_currency ?? "";
  const currency       = (tx?.currency       ?? params.currency       ?? "USD") as CurrencyCode;
  const status         = tx?.status          ?? params.status          ?? "pending";
  const created_at     = tx?.created_at      ?? params.created_at      ?? new Date().toISOString();
  const completed_at   = tx?.completed_at    ?? params.completed_at    ?? null;
  const note           = tx?.note            ?? params.note            ?? null;

  const isSender = sender_id === user?.id;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const currencyCode = currency as CurrencyCode;
  const convertedCurrencyCode = (converted_currency || "USD") as CurrencyCode;

  const createdDate  = new Date(created_at);
  const completedDate = completed_at ? new Date(completed_at) : null;

  if (fetchLoading) {
    return (
      <ScreenLayout>
        <ScreenHeader title={t("txDetailTitle")} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenLayout>
    );
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const initials = (recipient_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenLayout>
      <ScreenHeader title={t("txDetailTitle")} />

      {/* Amount Hero */}
      <View style={styles.heroSection}>
        <View
          style={[
            styles.heroAvatar,
            { backgroundColor: colors.primary + "18" },
          ]}
        >
          <Text style={[styles.heroInitials, { color: colors.primary }]}>
            {initials}
          </Text>
        </View>
        <Text
          style={[
            styles.heroAmount,
            {
              color: isSender ? colors.error : colors.success,
              fontSize: fs(36),
            },
          ]}
        >
          {formatSignedAmount(isSender ? -amount : amount)}
        </Text>
        <Text
          style={[
            styles.heroName,
            { color: colors.textSecondary, fontSize: fs(15) },
          ]}
        >
          {isSender
            ? `${t("sentTo")} ${recipient_name}`
            : `${t("received")} ${t("from")} ${recipient_name}`}
        </Text>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusConfig.color + statusConfig.bgOpacity },
          ]}
        >
          <Ionicons
            name={statusConfig.icon as any}
            size={16}
            color={statusConfig.color}
          />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {t(`txStatus_${status}` as any)}
          </Text>
        </View>
      </View>

      {/* Details Card */}
      <View
        style={[
          styles.detailsCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.detailsTitle,
            { color: colors.text, fontSize: fs(16) },
          ]}
        >
          {t("txDetails")}
        </Text>

        <DetailRow
          label={t("amount")}
          value={formatCurrency(amount, currencyCode)}
          colors={colors}
          fs={fs}
        />

        {fee > 0 && (
          <DetailRow
            label={t("fee")}
            value={formatCurrency(fee, currencyCode)}
            colors={colors}
            fs={fs}
          />
        )}
        {fee === 0 && (
          <DetailRow
            label={t("fee")}
            value={t("free")}
            valueColor={colors.success}
            colors={colors}
            fs={fs}
          />
        )}

        {exchange_rate && (
          <DetailRow
            label={t("exchangeRate")}
            value={`1 ${currencyCode} = ${exchange_rate.toFixed(4)} ${converted_currency || ""}`}
            colors={colors}
            fs={fs}
          />
        )}

        {converted_amount && converted_currency && (
          <DetailRow
            label={t("theyReceive")}
            value={formatCurrency(converted_amount!, convertedCurrencyCode)}
            colors={colors}
            fs={fs}
          />
        )}

        <DetailRow
          label={t("txDate")}
          value={formatDate(createdDate)}
          colors={colors}
          fs={fs}
        />

        {completedDate && (
          <DetailRow
            label={t("txCompletedAt")}
            value={formatDate(completedDate)}
            colors={colors}
            fs={fs}
          />
        )}

        {(tx?.type ?? params.type) && (
          <DetailRow
            label={t("txType")}
            value={t(`txType_${tx?.type ?? params.type}` as any)}
            colors={colors}
            fs={fs}
          />
        )}

        {(recipient_email || recipient_phone) && (
          <DetailRow
            label={t("txRecipientContact")}
            value={(recipient_email || recipient_phone) ?? ""}
            colors={colors}
            fs={fs}
          />
        )}

        {note && note !== "null" && (
          <DetailRow
            label={t("addNote")}
            value={note}
            colors={colors}
            fs={fs}
            isLast
          />
        )}
      </View>

      {/* Transaction ID */}
      <View
        style={[
          styles.idCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <View style={styles.idRow}>
          <Text
            style={[
              styles.idLabel,
              { color: colors.textSecondary, fontSize: fs(12) },
            ]}
          >
            {t("transactionId")}
          </Text>
          <Text
            style={[
              styles.idValue,
              { color: colors.textSecondary, fontSize: fs(11) },
            ]}
            numberOfLines={1}
            selectable
          >
            {params.id || "—"}
          </Text>
        </View>
      </View>
    </ScreenLayout>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  colors: ReturnType<typeof useThemeColors>;
  fs: (size: number) => number;
  isLast?: boolean;
}

function DetailRow({
  label,
  value,
  valueColor,
  colors,
  fs,
  isLast,
}: DetailRowProps) {
  return (
    <View
      style={[
        styles.detailRow,
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: colors.border + "40",
        },
      ]}
    >
      <Text
        style={[
          styles.detailLabel,
          { color: colors.textSecondary, fontSize: fs(13) },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.detailValue,
          { color: valueColor || colors.text, fontSize: fs(14) },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroInitials: { fontSize: 22, fontWeight: "700" },
  heroAmount: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  heroName: { fontSize: 15, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  statusText: { fontSize: 13, fontWeight: "700" },

  detailsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },

  idCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  idLabel: { fontSize: 12, fontWeight: "600" },
  idValue: { fontSize: 11, flex: 1, textAlign: "right" },
});
