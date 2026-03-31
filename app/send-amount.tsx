import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEntranceAnimation } from "@/hooks/useEntranceAnimation";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
    clearRateCache,
    getExchangeRate,
    getRateLockRemaining,
} from "@/lib/exchange-rates";
import { getPrimaryBalance } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { type CurrencyCode, formatCurrency } from "@/utils/currency";
import { validateAmount } from "@/utils/currency";

export default function SendAmountScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const { user, profile } = useAuth();
  const t = useTranslation(preferences.language);
  const { recipient, method } = useLocalSearchParams<{
    recipient: string;
    method?: "email" | "phone" | "wallet";
  }>();
  const [amount, setAmount] = useState("");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [sourceCurrency, setSourceCurrency] = useState<CurrencyCode>("USD");
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>("MXN");

  // Entrance animation
  const { fadeAnim, slideAnim } = useEntranceAnimation();

  // Load user's balance
  useEffect(() => {
    if (!user) return;
    getPrimaryBalance(user.id).then(({ balance, currency }) => {
      setAvailableBalance(balance);
      setSourceCurrency((currency as CurrencyCode) || "USD");
    });
  }, [user]);

  useEffect(() => {
    const methodValue = method || "email";
    const recipientValue = (recipient || "").trim();

    if (!recipientValue || methodValue === "wallet") {
      setTargetCurrency("MXN");
      return;
    }

    const lookupColumn = methodValue === "phone" ? "phone" : "email";
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("currency")
          .eq(lookupColumn, recipientValue)
          .maybeSingle();

        const recipientCurrency = (data?.currency as CurrencyCode) || "MXN";
        setTargetCurrency(recipientCurrency);
      } catch {
        setTargetCurrency("MXN");
      }
    })();
  }, [recipient, method]);

  // Live exchange rate state
  const [exchangeRate, setExchangeRate] = useState(17.15);
  const [isLiveRate, setIsLiveRate] = useState(false);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateLockSeconds, setRateLockSeconds] = useState(0);

  const loadRate = useCallback(async () => {
    setRateLoading(true);
    try {
      const { rate, isLive } = await getExchangeRate(sourceCurrency, targetCurrency);
      setExchangeRate(parseFloat(rate.toFixed(4)));
      setIsLiveRate(isLive);
      setRateLockSeconds(Math.floor(getRateLockRemaining()));
    } catch {
      // Keep fallback rate
    } finally {
      setRateLoading(false);
    }
  }, [sourceCurrency, targetCurrency]);

  useEffect(() => {
    loadRate();
  }, [loadRate]);

  // Countdown timer for rate lock
  useEffect(() => {
    if (rateLockSeconds <= 0) return;
    const interval = setInterval(() => {
      const remaining = Math.floor(getRateLockRemaining());
      setRateLockSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        loadRate(); // Auto-refresh when lock expires
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLockSeconds, loadRate]);

  const handleRefreshRate = () => {
    clearRateCache();
    loadRate();
  };

  const numAmount = parseFloat(amount) || 0;
  const converted = (numAmount * exchangeRate).toFixed(2);
  const amountCheck = validateAmount(numAmount);
  const insufficientFunds = numAmount > 0 && numAmount > availableBalance;
  const canProceed = numAmount > 0 && amountCheck.valid && !insufficientFunds;

  return (
    <ScreenLayout
      footer={
        <View style={styles.footer}>
          <Button
            title={t("reviewTransfer")}
            onPress={() =>
              router.push({
                pathname: "/send-confirm",
                params: {
                  recipient: recipient || "maria@email.com",
                  method: method || "email",
                  amount: numAmount.toFixed(2),
                  converted,
                  rate: exchangeRate.toString(),
                  currency: sourceCurrency,
                  convertedCurrency: targetCurrency,
                },
              })
            }
            disabled={!canProceed}
          />
        </View>
      }
    >
      <ScreenHeader title={t("sendMoney")} />

      <View style={styles.steps}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.stepItem}>
            {i > 1 && (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor: i <= 2 ? colors.primary : colors.border,
                  },
                ]}
              />
            )}
            <LinearGradient
              colors={
                i <= 2
                  ? (colors.gradientAccent as unknown as [string, string])
                  : ([colors.border, colors.border] as [string, string])
              }
              style={[
                styles.stepCircle,
                i === 2 && {
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                },
              ]}
            >
              <Text
                style={[
                  styles.stepCircleText,
                  i > 2 && { color: colors.textSecondary },
                ]}
              >
                {i}
              </Text>
            </LinearGradient>
            {i < 3 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: i < 2 ? colors.primary : colors.border },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <View style={styles.balanceRow}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Available balance</Text>
        <Text style={[styles.balanceValue, { color: availableBalance > 0 ? colors.text : colors.error }]}>
          {formatCurrency(availableBalance, sourceCurrency)}
        </Text>
      </View>

      <Text style={[styles.question, { color: colors.text }]}>
        {t("sendAmount")}
      </Text>

      <View style={styles.amountWrap}>
        <Text style={[styles.currency, { color: colors.primary }]}>{sourceCurrency === "USD" ? "$" : sourceCurrency + " "}</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.text }]}
          placeholder="0.00"
          placeholderTextColor={colors.border}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />
      </View>

      {numAmount > 0 && !amountCheck.valid && amountCheck.errorKey && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t(amountCheck.errorKey as any)}
        </Text>
      )}
      {insufficientFunds && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          Insufficient funds. Your balance is {formatCurrency(availableBalance, sourceCurrency)}.
        </Text>
      )}

      {numAmount > 0 && (
        <View
          style={[
            styles.breakdown,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.breakdownRow}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              {t("youSend")}
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {formatCurrency(numAmount, sourceCurrency)}
            </Text>
          </View>
          <View
            style={[styles.divider, { backgroundColor: colors.border + "60" }]}
          />
          <View style={styles.breakdownRow}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              {t("exchangeRate")}
            </Text>
            <View style={styles.rateValueRow}>
              {rateLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>
                    1 {sourceCurrency} = {exchangeRate} {targetCurrency}
                  </Text>
                  <Pressable onPress={handleRefreshRate} hitSlop={8}>
                    <Ionicons
                      name="refresh-outline"
                      size={14}
                      color={colors.primary}
                      style={{ marginLeft: 6 }}
                    />
                  </Pressable>
                </>
              )}
            </View>
          </View>
          {!rateLoading && (
            <Text
              style={[
                styles.rateMeta,
                { color: isLiveRate ? colors.success : colors.warning },
              ]}
            >
              {isLiveRate
                ? `● ${t("liveRate")}${rateLockSeconds > 0 ? ` · ${Math.floor(rateLockSeconds / 60)}:${String(rateLockSeconds % 60).padStart(2, "0")}` : ""}`
                : `○ ${t("fallbackRate")}`}
            </Text>
          )}
          <View
            style={[styles.divider, { backgroundColor: colors.border + "60" }]}
          />
          <View style={styles.breakdownRow}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              {t("fee")}
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.primary }]}>
              {t("free")} ✓
            </Text>
          </View>
          <View
            style={[styles.divider, { backgroundColor: colors.border + "60" }]}
          />
          <View style={styles.breakdownRow}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              {t("theyReceive")}
            </Text>
            <Text style={[styles.breakdownValueBold, { color: colors.text }]}>
              {formatCurrency(parseFloat(converted), targetCurrency)}
            </Text>
          </View>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  stepItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: { flex: 1, height: 2, borderRadius: 1 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  balanceLabel: { fontSize: 13 },
  balanceValue: { fontSize: 14, fontWeight: "700" },
  question: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  currency: { fontSize: 48, fontWeight: "800", marginRight: 4 },
  amountInput: {
    fontSize: 48,
    fontWeight: "800",
    flex: 1,
    padding: 0,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 16,
  },
  breakdown: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  breakdownLabel: { fontSize: 14 },
  breakdownValue: { fontSize: 14, fontWeight: "600" },
  breakdownValueBold: { fontSize: 16, fontWeight: "800" },
  rateValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rateMeta: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
    marginBottom: -4,
  },
  divider: { height: 1, marginVertical: 12 },
  footer: { padding: 28, paddingBottom: 32 },
});
