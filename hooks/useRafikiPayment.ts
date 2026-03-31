/**
 * useRafikiPayment — orchestrates the full Rafiki payment flow:
 *   1. createIncomingPayment at recipient's wallet → receiver URL
 *   2. createQuote (sender wallet + receiver URL + amount)
 *   3. createOutgoingPayment (execute the quote)
 *   4. poll until terminal state
 */

import { useCallback, useState } from "react";

import {
  Amount,
  OutgoingPayment,
  OutgoingPaymentState,
  Quote,
  createIncomingPayment,
  createOutgoingPayment,
  createQuote,
  getOutgoingPayment,
  pollPaymentStatus,
} from "@/lib/rafiki-graphql";

export type { Amount, OutgoingPayment, OutgoingPaymentState, Quote };

export interface PaymentFlowState {
  loading: boolean;
  error: string | null;
  quote: Quote | null;
  payment: OutgoingPayment | null;
}

export interface SendPaymentInput {
  /** Sender's walletAddressId in your Rafiki instance (from user profile) */
  senderWalletAddressId: string;
  /**
   * Recipient's walletAddressId in your Rafiki instance.
   * Required to create the incoming payment that generates the receiver URL.
   * If you already have the receiver URL, pass it via receiverUrl instead.
   */
  recipientWalletAddressId?: string;
  /**
   * Pre-built Open Payments incoming payment URL.
   * Use this if the recipient URL was obtained externally (e.g. from a backend).
   * Takes precedence over recipientWalletAddressId.
   */
  receiverUrl?: string;
  /** Amount to debit from sender, in minor units (cents for USD) */
  debitAmount: Amount;
  metadata?: Record<string, string>;
}

export interface UseRafikiPaymentResult {
  state: PaymentFlowState;
  sendPayment: (
    input: SendPaymentInput,
  ) => Promise<{ success: boolean; payment?: OutgoingPayment; error?: string }>;
  refreshPaymentStatus: (paymentId: string) => Promise<OutgoingPayment | null>;
  reset: () => void;
}

export function useRafikiPayment(): UseRafikiPaymentResult {
  const [state, setState] = useState<PaymentFlowState>({
    loading: false,
    error: null,
    quote: null,
    payment: null,
  });

  const sendPayment = useCallback(async (input: SendPaymentInput) => {
    setState({ loading: true, error: null, quote: null, payment: null });

    try {
      // Step 1: Get the receiver URL
      // Either use a pre-built URL or create an incoming payment at the recipient's wallet.
      let receiverUrl = input.receiverUrl;

      if (!receiverUrl) {
        if (!input.recipientWalletAddressId) {
          throw new Error(
            "Either recipientWalletAddressId or receiverUrl must be provided",
          );
        }
        const { payment: incoming, error: incomingError } =
          await createIncomingPayment({
            walletAddressId: input.recipientWalletAddressId,
            incomingAmount: input.debitAmount,
          });
        if (incomingError || !incoming) {
          throw new Error(incomingError || "Failed to create incoming payment");
        }
        receiverUrl = incoming.incomingPaymentUrl;
      }

      // Step 2: Create a quote
      const { quote, error: quoteError } = await createQuote({
        walletAddressId: input.senderWalletAddressId,
        receiver: receiverUrl,
        debitAmount: input.debitAmount,
      });
      if (quoteError || !quote) {
        throw new Error(quoteError || "Failed to create quote");
      }
      setState((prev) => ({ ...prev, quote }));

      // Step 3: Execute the outgoing payment
      const { payment, error: paymentError } = await createOutgoingPayment({
        walletAddressId: input.senderWalletAddressId,
        quoteId: quote.id,
        receiver: receiverUrl,
        metadata: input.metadata,
      });
      if (paymentError || !payment) {
        throw new Error(paymentError || "Failed to create outgoing payment");
      }
      setState((prev) => ({ ...prev, payment, loading: false }));

      // Step 4: Poll until terminal state (SENT / FAILED / CANCELLED)
      const { payment: finalPayment, error: pollError } =
        await pollPaymentStatus(payment.id);
      if (pollError || !finalPayment) {
        throw new Error(pollError || "Payment status polling failed");
      }

      setState((prev) => ({ ...prev, payment: finalPayment, loading: false }));

      return {
        success: finalPayment.state === "SENT",
        payment: finalPayment,
        error:
          finalPayment.state !== "SENT"
            ? (finalPayment.error ?? `Payment ended with state: ${finalPayment.state}`)
            : undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown payment error";
      setState((prev) => ({ ...prev, error: msg, loading: false }));
      return { success: false, error: msg };
    }
  }, []);

  const refreshPaymentStatus = useCallback(
    async (paymentId: string): Promise<OutgoingPayment | null> => {
      const { payment, error } = await getOutgoingPayment(paymentId);
      if (error) {
        setState((prev) => ({ ...prev, error }));
        return null;
      }
      if (payment) {
        setState((prev) => ({ ...prev, payment }));
      }
      return payment;
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, quote: null, payment: null });
  }, []);

  return { state, sendPayment, refreshPaymentStatus, reset };
}
