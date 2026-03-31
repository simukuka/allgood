import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  addFundsToChecking,
  appendTransactionNote,
  createTransaction,
  updateTransactionStatus,
} from "@/lib/data";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import { isRafikiGraphqlConfigured } from "@/lib/rafiki-graphql";
import { formatIlpErrorForDisplay } from "@/lib/rafiki-errors";
import { resolveRecipientWallet } from "@/lib/rafiki-wallet";
import { supabase } from "@/lib/supabase";
import { useRafikiPayment } from "@/hooks/useRafikiPayment";

/* ── Confetti particles ───────────────────────────────────── */
const CONFETTI_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#f97316",
];
function ConfettiParticles() {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      startX: (Math.random() - 0.5) * 300,
      startY: -(Math.random() * 200 + 50),
    })),
  ).current;

  useEffect(() => {
    particles.forEach((p, i) => {
      const delay = i * 40;
      Animated.parallel([
        Animated.timing(p.x, {
          toValue: p.startX,
          duration: 1200,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: p.startY,
          duration: 1200,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: 1200,
          delay: delay + 400,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: Math.random() * 4 - 2,
          duration: 1200,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <View style={confettiStyles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            confettiStyles.particle,
            {
              backgroundColor: p.color,
              width: Math.random() > 0.5 ? 8 : 6,
              height: Math.random() > 0.5 ? 12 : 8,
              borderRadius: Math.random() > 0.5 ? 4 : 1,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [-2, 2],
                    outputRange: ["-360deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}
const confettiStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "40%",
    left: "50%",
    width: 0,
    height: 0,
  },
  particle: { position: "absolute" },
});

export default function SendConfirmScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const { user, profile } = useAuth();
  const t = useTranslation(preferences.language);
  const params = useLocalSearchParams<{
    recipient: string;
    method?: "email" | "phone" | "wallet";
    amount: string;
    converted: string;
    rate: string;
    currency?: string;
    convertedCurrency?: string;
  }>();
  const { sendPayment } = useRafikiPayment();

  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [rafikiPaymentId, setRafikiPaymentId] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<"processing" | "completed">(
    "processing",
  );

  // Success animations
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;

  const playSuccessAnim = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 1,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleConfirm = async () => {
    if (!user) return;
    setSending(true);
    setTxError(null);

    let createdTransactionId: string | null = null;
    let transferAmount = 0;

    try {
      const paymentMethod = params.method || "email";
      const recipientRaw = params.recipient ?? "";
      transferAmount = parseFloat(params.amount ?? "0");
      const recipientName =
        paymentMethod === "email"
          ? recipientRaw.split("@")[0] || "Recipient"
          : recipientRaw;

      // Create the local transaction record first so we always have an audit trail
      const { data: txData, error: txCreateError } = await createTransaction({
        sender_id: user.id,
        recipient_id: null,
        recipient_email: paymentMethod === "email" ? recipientRaw : null,
        recipient_phone: paymentMethod === "phone" ? recipientRaw : null,
        recipient_name: recipientName,
        amount: transferAmount,
        currency: params.currency || "USD",
        converted_amount: parseFloat(params.converted ?? "0"),
        converted_currency: params.convertedCurrency || "MXN",
        exchange_rate: parseFloat(params.rate ?? "1"),
        fee: 0,
        status: "pending",
        type: "send",
        note: `payment_method:${paymentMethod}`,
      });

      if (txCreateError || !txData) {
        throw new Error(txCreateError || "Unable to create transaction.");
      }
      createdTransactionId = txData.id;

      // Attempt Rafiki GraphQL payment when configured
      if (isRafikiGraphqlConfigured) {
        // rafiki_wallet_address_id lives on the profile row (provisioned at sign-up)
        const senderWalletAddressId = profile?.rafiki_wallet_address_id ?? "";

        if (!senderWalletAddressId) {
          throw new Error(
            "Your Rafiki wallet is not yet provisioned. Please sign out and back in, or contact support.",
          );
        }

        // Amount in minor units (cents): $12.50 → 1250
        const amountCents = Math.round(
          parseFloat(params.amount ?? "0") * 100,
        ).toString();

        // Resolve the recipient to a Rafiki walletAddressId + receiver URL.
        // For email/phone this queries Supabase for their wallet ID, then creates
        // an incoming payment at their wallet. For wallet-address format it's direct.
        const { recipient: resolved, error: resolveErr } =
          await resolveRecipientWallet(
            recipientRaw,
            paymentMethod as "email" | "phone" | "wallet",
            amountCents,
          );

        if (resolveErr || !resolved) {
          await updateTransactionStatus(txData.id, "failed");
          throw new Error(resolveErr || "Could not resolve recipient wallet.");
        }

        if (resolved.profileId) {
          await supabase
            .from("transactions")
            .update({
              recipient_id: resolved.profileId,
              recipient_name: resolved.fullName || recipientName,
            })
            .eq("id", txData.id);
        }

        const result = await sendPayment({
          senderWalletAddressId,
          receiverUrl: resolved.receiverUrl,
          debitAmount: { value: amountCents, assetCode: "USD", assetScale: 2 },
          metadata: {
            transactionId: txData.id,
            recipientName,
            paymentMethod,
            ...(paymentMethod === "email" && { recipientEmail: recipientRaw }),
            ...(paymentMethod === "phone" && { recipientPhone: recipientRaw }),
          },
        });

        if (!result.success || !result.payment) {
          await updateTransactionStatus(txData.id, "failed");
          throw new Error(result.error || "Rafiki payment failed.");
        }

        await appendTransactionNote(txData.id, `rafiki_payment_id:${result.payment.id}`);

        await updateTransactionStatus(
          txData.id,
          result.payment.state === "SENT" ? "completed" : "pending",
        );

        if (result.payment.state === "SENT" && resolved.profileId) {
          await addFundsToChecking(resolved.profileId, transferAmount);
        }

        setRafikiPaymentId(result.payment.id);
        setFinalStatus(result.payment.state === "SENT" ? "completed" : "processing");
      } else {
        // Rafiki not configured — mark completed immediately (local ledger mode)
        await updateTransactionStatus(txData.id, "completed");

        if (paymentMethod !== "wallet") {
          const lookupColumn = paymentMethod === "email" ? "email" : "phone";
          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq(lookupColumn, recipientRaw)
            .maybeSingle();

          if (recipientProfile?.id) {
            await supabase
              .from("transactions")
              .update({ recipient_id: recipientProfile.id })
              .eq("id", txData.id);
            await addFundsToChecking(recipientProfile.id, transferAmount);
          }
        }

        setFinalStatus("completed");
      }

      setTransactionId(txData.id);
      setSent(true);
      hapticSuccess();
      playSuccessAnim();
    } catch (e: unknown) {
      if (createdTransactionId) {
        await updateTransactionStatus(createdTransactionId, "failed");
        if (transferAmount > 0) {
          await addFundsToChecking(user.id, transferAmount);
        }
      }

      const msg = e instanceof Error ? e.message : String(e);
      console.warn("Transaction failed:", msg);
      const mappedError = formatIlpErrorForDisplay(msg);
      setTxError(mappedError || t("transferFailed"));
      hapticError();
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <ScreenLayout
        scroll={false}
        footer={
          <View style={styles.footer}>
            <Button
              title={t("trackTransfer")}
              onPress={() =>
                router.replace({
                  pathname: "/transfer-status",
                  params: {
                    transactionId:
                      transactionId || `tx_${Date.now().toString(36)}`,
                    rafikiPaymentId: rafikiPaymentId ?? "",
                    recipient: params.recipient ?? "",
                    amount: params.amount ?? "0",
                    converted: params.converted ?? "0",
                    currency: params.currency || "USD",
                    convertedCurrency: params.convertedCurrency || "MXN",
                    status: finalStatus,
                  },
                })
              }
            />
            <Button
              title={t("backToHome")}
              onPress={() => router.replace("/(tabs)")}
              variant="outline"
              showArrow={false}
            />
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.replace("/(tabs)/send")}
            >
              <Text style={[styles.secondaryText, { color: colors.primary }]}>
                {t("sendAnother")}
              </Text>
            </Pressable>
          </View>
        }
      >
        <ConfettiParticles />
        <View style={styles.successContent}>
          <Animated.View
            style={[
              styles.successRing,
              {
                borderColor: "#22c55e30",
                transform: [{ scale: ringScale }],
                opacity: successOpacity,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.successIcon,
                styles.successShadow,
                { transform: [{ scale: successScale }] },
              ]}
            >
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                style={styles.successGradient}
              >
                <Ionicons name="checkmark" size={48} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </Animated.View>
          <Animated.View style={{ opacity: successOpacity }}>
            <Text style={[styles.successTitle, { color: colors.text }]}>
              {t("transferSent")}
            </Text>
            <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
              {t("transferSentDesc")}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
              {
                transform: [{ translateY: cardSlide }],
                opacity: successOpacity,
              },
            ]}
          >
            <Text style={[styles.summaryAmount, { color: colors.primary }]}>
              ${params.amount} USD
            </Text>
            <View
              style={[
                styles.summaryDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <Text style={[styles.summaryTo, { color: colors.textSecondary }]}>
              → {params.recipient}
            </Text>
          </Animated.View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      footer={
        <>
          {txError && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.error + "12",
                  borderColor: colors.error + "30",
                },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <View style={styles.errorContent}>
                <Text style={[styles.errorTitle, { color: colors.error }]}>
                  {t("transferFailed")}
                </Text>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {txError}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.footer}>
            <Button
              title={sending ? "..." : t("confirmTransfer")}
              onPress={handleConfirm}
              disabled={sending}
            />
          </View>
        </>
      }
    >
      <ScreenHeader title={t("confirmTitle")} />

      <View style={styles.steps}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.stepItem}>
            {i > 1 && (
              <View
                style={[styles.stepLine, { backgroundColor: colors.primary }]}
              />
            )}
            <View
              style={[styles.stepCircle, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.stepCircleText}>{i}</Text>
            </View>
            {i < 3 && (
              <View
                style={[styles.stepLine, { backgroundColor: colors.primary }]}
              />
            )}
          </View>
        ))}
      </View>

      <View style={styles.amountCenter}>
        <Text style={[styles.bigAmount, { color: colors.text }]}>
          ${params.amount}
        </Text>
        <Text style={[styles.bigCurrency, { color: colors.textSecondary }]}>
          USD
        </Text>
      </View>

      <View
        style={[
          styles.detailCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        {[
          { label: t("to"), value: params.recipient },
          { label: t("amount"), value: `$${params.amount} USD` },
          {
            label: t("theyReceive"),
            value: `$${params.converted} MXN`,
          },
          { label: t("exchangeRate"), value: `1 USD = ${params.rate} MXN` },
          { label: t("fee"), value: t("free"), highlight: true },
          {
            label: t("estimatedDelivery"),
            value: `~30 ${t("minutes")}`,
          },
        ].map((row, i) => (
          <View key={i}>
            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                {row.label}
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: row.highlight ? colors.primary : colors.text,
                  },
                ]}
              >
                {row.value}
              </Text>
            </View>
            {i < 5 && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border + "40" },
                ]}
              />
            )}
          </View>
        ))}
      </View>
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
  amountCenter: {
    alignItems: "center",
    marginBottom: 32,
  },
  bigAmount: { fontSize: 48, fontWeight: "800", letterSpacing: -2 },
  bigCurrency: { fontSize: 16, fontWeight: "600", marginTop: 4 },
  detailCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 12 },
  footer: { padding: 28, paddingBottom: 32, gap: 12 },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  successRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  successGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successShadow: {
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  successTitle: { fontSize: 28, fontWeight: "800", marginBottom: 10 },
  successDesc: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    width: "100%",
  },
  summaryAmount: { fontSize: 32, fontWeight: "800", marginBottom: 12 },
  summaryDivider: { width: 40, height: 2, borderRadius: 1, marginBottom: 12 },
  summaryTo: { fontSize: 15 },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryText: { fontSize: 16, fontWeight: "600" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 28,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
