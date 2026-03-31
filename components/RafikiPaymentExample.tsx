/**
 * Example: Using Rafiki GraphQL for Send Flows
 *
 * This is a reference implementation showing how to integrate the new
 * Rafiki GraphQL API into payment flows. Copy patterns from here into
 * your actual screens.
 *
 * File: components/RafikiPaymentExample.tsx
 */

import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { radii, spacing } from "@/constants/theme";
import { useRafikiPayment } from "@/hooks/useRafikiPayment";
import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticError, hapticSuccess } from "@/lib/haptics";

interface RafikiPaymentExampleProps {
  senderUserId: string;
  recipientWallet: string; // ILP address like '$recipient.example.com'
  recipientName: string;
  sendAmount: number; // in USD
  receiveAssetCode: "MXN" | "BRL" | "COP" | "EUR"; // destination currency
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

/**
 * Example component showing the complete Rafiki payment flow
 */
export function RafikiPaymentExample({
  senderUserId,
  recipientWallet,
  recipientName,
  sendAmount,
  receiveAssetCode,
  onSuccess,
  onError,
}: RafikiPaymentExampleProps) {
  const colors = useThemeColors();
  const { state, sendPayment, reset } = useRafikiPayment();
  const [exchangeRate, setExchangeRate] = useState<string | null>(null);
  const [estimatedReceive, setEstimatedReceive] = useState<number | null>(null);

  /**
   * Step 1: Fetch live exchange rate to show user
   */
  useEffect(() => {
    fetchExchangeRate();
  }, [sendAmount, receiveAssetCode]);

  const fetchExchangeRate = async () => {
    try {
      // This would use the migration bridge for now
      // In the future, call createQuote directly
      const amountInCents = Math.round(sendAmount * 100);

      // For demo, we'd import and call:
      // const { quote } = await createQuote({...})
      // setExchangeRate(quote.estimatedExchangeRate)
      // setEstimatedReceive(parseInt(quote.receiveAmount) / 100)

      // Placeholder values
      setExchangeRate("20.50");
      setEstimatedReceive(sendAmount * 20.5);
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
    }
  };

  /**
   * Step 2: Execute the complete payment flow
   */
  const handleInitiatePayment = async () => {
    try {
      const result = await sendPayment({
        senderWalletAddressId: senderUserId, // caller should pass the real walletAddressId
        receiverUrl: recipientWallet,         // must be an Open Payments incoming payment URL
        debitAmount: {
          value: Math.round(sendAmount * 100).toString(),
          assetCode: "USD",
          assetScale: 2,
        },
        metadata: {
          recipientName,
          sendMethod: "app",
          timestamp: new Date().toISOString(),
        },
      });

      if (result.success && result.payment) {
        hapticSuccess();
        onSuccess?.(result.payment.id);
      } else if (result.error) {
        hapticError();
        onError?.(result.error);
      }
    } catch (error: any) {
      hapticError();
      onError?.(error?.message ?? "Unknown error");
    }
  };

  // Show loading state while fetching quote
  if (state.loading && !state.payment) {
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.md,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.text }}>
          Processing payment...
        </Text>
      </View>
    );
  }

  // Show exchange rate and estimated receive amount
  return (
    <View
      style={{
        backgroundColor: colors.cardBg,
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}
    >
      {/* Exchange Rate Display */}
      {exchangeRate && (
        <View
          style={{
            marginBottom: spacing.md,
            paddingBottom: spacing.md,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
          }}
        >
          <Text
            style={{ color: colors.textSecondary, marginBottom: spacing.xs }}
          >
            Exchange Rate
          </Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
            1 USD = {exchangeRate} {receiveAssetCode}
          </Text>
        </View>
      )}

      {/* Amount Preview */}
      <View style={{ marginBottom: spacing.md }}>
        <View style={{ marginBottom: spacing.sm }}>
          <Text
            style={{ color: colors.textSecondary, marginBottom: spacing.xs }}
          >
            You send
          </Text>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>
            ${sendAmount.toFixed(2)} USD
          </Text>
        </View>

        <Text
          style={{
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: spacing.sm,
          }}
        >
          ↓
        </Text>

        <View>
          <Text
            style={{ color: colors.textSecondary, marginBottom: spacing.xs }}
          >
            {recipientName} receives
          </Text>
          {estimatedReceive ? (
            <Text
              style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}
            >
              {estimatedReceive.toFixed(2)} {receiveAssetCode}
            </Text>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      </View>

      {/* Error Display */}
      {state.error && (
        <View
          style={{
            marginBottom: spacing.md,
            padding: spacing.md,
            backgroundColor: colors.error + "20",
            borderRadius: radii.md,
          }}
        >
          <Text style={{ color: colors.error, fontSize: 14 }}>
            {state.error}
          </Text>
        </View>
      )}

      {/* Status Display */}
      {state.payment && (
        <View
          style={{
            marginBottom: spacing.md,
            padding: spacing.md,
            backgroundColor: colors.success + "20",
            borderRadius: radii.md,
          }}
        >
          <Text
            style={{
              color: colors.success,
              fontWeight: "600",
              marginBottom: spacing.xs,
            }}
          >
            Payment Status: {state.payment.state}
          </Text>
          <Text style={{ color: colors.success, fontSize: 12 }}>
            ID: {state.payment.id}
          </Text>
        </View>
      )}

      {/* Send Button */}
      <Button
        title="Send Money"
        onPress={handleInitiatePayment}
        disabled={state.loading}
      />

      {/* Reset Button */}
      {state.payment && (
        <Button
          title="Send Another"
          variant="outline"
          onPress={reset}
          showArrow={false}
        />
      )}
    </View>
  );
}

/**
 * Integration example within a send confirmation screen:
 *
 * export function SendConfirmScreen() {
 *   const params = useLocalSearchParams<SendParams>();
 *
 *   return (
 *     <ScreenLayout>
 *       <ScreenHeader title="Confirm Transfer" />
 *
 *       <RafikiPaymentExample
 *         senderUserId={user.id}
 *         recipientWallet={params.wallet}
 *         recipientName={params.name}
 *         sendAmount={parseFloat(params.amount)}
 *         receiveAssetCode="MXN"
 *         onSuccess={(paymentId) => {
 *           // Create transaction record, redirect to success screen
 *           router.push({ pathname: '/transfer-status', params: { id: paymentId } })
 *         }}
 *         onError={(error) => {
 *           showToast({ type: 'error', message: error })
 *         }}
 *       />
 *     </ScreenLayout>
 *   );
 * }
 */
