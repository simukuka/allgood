import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatIlpErrorForDisplay, parseIlpError } from "@/lib/rafiki-errors";
import { getOutgoingPayment } from "@/lib/rafiki-graphql";
import { formatCurrency } from "@/utils/currency";

type TransferStep =
  | "initiated"
  | "processing"
  | "delivering"
  | "completed"
  | "failed";

const STEPS: TransferStep[] = [
  "initiated",
  "processing",
  "delivering",
  "completed",
];

const STEP_ICONS: Record<TransferStep, string> = {
  initiated: "checkmark-circle",
  processing: "swap-horizontal",
  delivering: "airplane",
  completed: "checkmark-done-circle",
  failed: "close-circle",
};

export default function TransferStatusScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const t = useTranslation(preferences.language);
  const params = useLocalSearchParams<{
    transactionId: string;
    rafikiPaymentId?: string;
    recipient: string;
    amount: string;
    converted: string;
    convertedCurrency: string;
    status: string;
    error?: string;
  }>();

  const statusFromParams = (params.status as TransferStep) || "initiated";
  const currentStatus: TransferStep =
    statusFromParams === "failed" ? "failed" : statusFromParams;
  const currentStepIndex =
    currentStatus === "failed"
      ? STEPS.length - 1
      : STEPS.indexOf(currentStatus);

  const [simulatedStep, setSimulatedStep] = useState(currentStepIndex);
  const [pollError, setPollError] = useState<string | null>(null);
  const effectiveError = params.error || pollError || "";
  const parsedError = parseIlpError(effectiveError);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;

  // Map Rafiki OutgoingPaymentState → UI step index
  function rafikiStateToStep(state: string): number {
    switch (state) {
      case "FUNDING":
        return 0; // initiated
      case "SENDING":
        return 1; // processing
      case "SENT":
        return STEPS.length - 1; // completed
      case "FAILED":
      case "CANCELLED":
        return STEPS.length - 1;
      default:
        return 0;
    }
  }

  useEffect(() => {
    if (currentStatus === "failed") {
      setSimulatedStep(STEPS.length - 1);
      return;
    }
    Animated.stagger(
      200,
      fadeAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ),
    ).start();

    Animated.timing(progressAnim, {
      toValue: simulatedStep / (STEPS.length - 1),
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [simulatedStep]);

  // Real polling when rafikiPaymentId is available; demo timer otherwise
  useEffect(() => {
    const rafikiPaymentId = params.rafikiPaymentId;

    if (currentStatus === "failed") {
      setSimulatedStep(STEPS.length - 1);
      return;
    }
    if (currentStatus === "completed") {
      setSimulatedStep(STEPS.length - 1);
      return;
    }

    if (rafikiPaymentId) {
      // Poll real Rafiki API every 3 seconds
      let cancelled = false;
      const poll = async () => {
        try {
          while (!cancelled) {
            const { payment, error } = await getOutgoingPayment(rafikiPaymentId);
            if (error && !cancelled) {
              setPollError(error);
              break;
            }
            if (payment && !cancelled) {
              const step = rafikiStateToStep(payment.state);
              setSimulatedStep(step);
              if (["SENT", "FAILED", "CANCELLED"].includes(payment.state)) {
                break;
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        } catch (error: unknown) {
          if (!cancelled) {
            const message =
              error instanceof Error ? error.message : "Unable to refresh transfer status.";
            setPollError(message);
          }
        }
      };
      poll();
      return () => {
        cancelled = true;
      };
    } else {
      // No real payment ID — demo auto-advance for UI preview
      const timer = setInterval(() => {
        setSimulatedStep((prev) => {
          if (prev >= STEPS.length - 1) {
            clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [currentStatus, params.rafikiPaymentId]);

  const isFailed = currentStatus === "failed";
  const isCompleted =
    currentStatus === "completed" || simulatedStep >= STEPS.length - 1;
  const estimatedMinutes = isCompleted
    ? 0
    : Math.max(0, (STEPS.length - 1 - simulatedStep) * 10);

  return (
    <ScreenLayout
      footer={
        <View style={styles.footer}>
          <Button
            title={t("backToHome")}
            onPress={() => router.replace("/(tabs)")}
          />
          {!isCompleted && (
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.replace("/(tabs)/send")}
            >
              <Text style={[styles.secondaryText, { color: colors.primary }]}> 
                {t("sendAnother")}
              </Text>
            </Pressable>
          )}
        </View>
      }
    >
      <ScreenHeader title={t("transferStatus")} />

      <View style={styles.amountSection}>
        <Text style={[styles.bigAmount, { color: colors.text }]}> 
          {formatCurrency(parseFloat(params.amount || "0"), "USD")}
        </Text>
        <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}> 
          → {params.recipient}
        </Text>
        {params.converted && (
          <Text style={[styles.convertedLabel, { color: colors.textSecondary }]}> 
            {formatCurrency(
              parseFloat(params.converted),
              (params.convertedCurrency as any) || "MXN",
            )}{" "}
            {params.convertedCurrency || "MXN"}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: isFailed
              ? colors.error + "15"
              : isCompleted
                ? colors.success + "15"
                : colors.primary + "15",
          },
        ]}
      >
        <Ionicons
          name={
            isFailed
              ? "close-circle"
              : isCompleted
                ? "checkmark-circle"
                : "time-outline"
          }
          size={18}
          color={
            isFailed
              ? colors.error
              : isCompleted
                ? colors.success
                : colors.primary
          }
        />
        <Text
          style={[
            styles.statusText,
            {
              color: isFailed
                ? colors.error
                : isCompleted
                  ? colors.success
                  : colors.primary,
            },
          ]}
        >
          {isFailed
            ? "Transfer failed"
            : isCompleted
              ? t("transferComplete")
              : t("transferInProgress")}
        </Text>
      </View>

      {!!effectiveError && (
        <View
          style={[
            styles.errorCard,
            {
              backgroundColor: colors.error + "12",
              borderColor: colors.error + "40",
            },
          ]}
        >
          <Text style={[styles.errorTitle, { color: colors.error }]}> 
            Payment issue
          </Text>
          <Text style={[styles.errorMessage, { color: colors.text }]}> 
            {formatIlpErrorForDisplay(effectiveError)}
          </Text>
          <Text style={[styles.errorHint, { color: colors.textSecondary }]}> 
            {parsedError.shouldRetry
              ? "You can retry this transfer."
              : "Please review recipient and amount details before retrying."}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.progressCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        {STEPS.map((step, index) => {
          const isDone = index <= simulatedStep;
          const isCurrent = index === simulatedStep;

          return (
            <Animated.View
              key={step}
              style={[
                styles.stepRow,
                {
                  opacity: fadeAnims[index],
                  transform: [
                    {
                      translateX: fadeAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
                index < STEPS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border + "40",
                },
              ]}
            >
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor: isDone
                      ? colors.primary + "18"
                      : colors.border + "30",
                  },
                ]}
              >
                <Ionicons
                  name={STEP_ICONS[step] as any}
                  size={20}
                  color={isDone ? colors.primary : colors.textSecondary}
                />
              </View>

              <View style={styles.stepInfo}>
                <Text
                  style={[
                    styles.stepTitle,
                    {
                      color: isDone ? colors.text : colors.textSecondary,
                      fontWeight: isCurrent ? "700" : "500",
                    },
                  ]}
                >
                  {t(`step_${step}` as any)}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}> 
                  {t(`step_${step}_desc` as any)}
                </Text>
              </View>

              {isDone && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              {isCurrent && !isCompleted && (
                <View
                  style={[
                    styles.currentDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </Animated.View>
          );
        })}
      </View>

      {!isCompleted && !isFailed && (
        <View
          style={[
            styles.etaCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <View style={styles.etaInfo}>
            <Text style={[styles.etaLabel, { color: colors.textSecondary }]}> 
              {t("estimatedDelivery")}
            </Text>
            <Text style={[styles.etaValue, { color: colors.text }]}> 
              ~{estimatedMinutes} {t("minutes")}
            </Text>
          </View>
        </View>
      )}

      {params.transactionId && (
        <Text style={[styles.txId, { color: colors.textSecondary }]}> 
          {t("transactionId")}: {params.transactionId.slice(0, 8)}...
        </Text>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  amountSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  bigAmount: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.5,
    marginBottom: 6,
  },
  recipientLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  convertedLabel: {
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  errorMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  progressCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 2,
    marginBottom: 20,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  etaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  etaInfo: {
    flex: 1,
  },
  etaLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  etaValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  txId: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  footer: {
    padding: 28,
    paddingBottom: 32,
    gap: 12,
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
