/**
 * Rafiki Migration Bridge
 *
 * Compatibility shim bridging the old REST-based payment input format to the new
 * GraphQL API types. This file only handles type adaptation — actual payment
 * execution should go through useRafikiPayment / lib/rafiki-graphql directly.
 *
 * Remove this file once all callers have been migrated to the GraphQL API.
 */

import {
  Amount,
  CreateOutgoingPaymentInput,
  CreateQuoteInput,
  OutgoingPayment,
  createOutgoingPayment,
  createQuote,
} from "@/lib/rafiki-graphql";

/** Legacy interface from old REST API */
export interface LegacyRafikiPaymentInput {
  senderUserId: string;
  senderWalletAddressId: string; // required by new API — was missing before
  recipient: string;             // now maps to `receiver` (incoming payment URL)
  recipientName: string;
  amount: number;                // in dollars (not cents)
  sourceAssetCode: string;
  destinationAssetCode: string;
  paymentMethod: "email" | "phone" | "wallet";
}

export interface LegacyRafikiPaymentResult {
  externalId: string;
  status: "completed" | "processing";
  provider: "rafiki";
}

/**
 * Convert a legacy payment request to a GraphQL quote + outgoing payment.
 *
 * NOTE: caller must supply `senderWalletAddressId` and a valid `receiver` URL
 * (Open Payments incoming payment URL). The old REST fields `recipient` and
 * `sourceAssetCode` / `destinationAssetCode` are no longer used by the API
 * directly — asset context comes from the wallet addresses.
 */
export async function migrateLegacyPaymentToGraphQL(
  input: LegacyRafikiPaymentInput,
): Promise<{
  payment: OutgoingPayment | null;
  legacyResult: LegacyRafikiPaymentResult | null;
  error: string | null;
}> {
  try {
    const amountCents = Math.round(input.amount * 100).toString();

    const debitAmount: Amount = {
      value: amountCents,
      assetCode: input.sourceAssetCode,
      assetScale: 2,
    };

    const quoteInput: CreateQuoteInput = {
      walletAddressId: input.senderWalletAddressId,
      receiver: input.recipient, // caller must pass a proper incoming payment URL
      debitAmount,
    };

    const { quote, error: quoteError } = await createQuote(quoteInput);
    if (quoteError || !quote) {
      return { payment: null, legacyResult: null, error: quoteError || "Failed to create quote" };
    }

    const paymentInput: CreateOutgoingPaymentInput = {
      walletAddressId: input.senderWalletAddressId,
      quoteId: quote.id,
      receiver: input.recipient,
      metadata: {
        legacySenderUserId: input.senderUserId,
        recipientName: input.recipientName,
        paymentMethod: input.paymentMethod,
      },
    };

    const { payment, error: paymentError } = await createOutgoingPayment(paymentInput);
    if (paymentError || !payment) {
      return { payment: null, legacyResult: null, error: paymentError || "Failed to create payment" };
    }

    const legacyResult: LegacyRafikiPaymentResult = {
      externalId: payment.id,
      status: payment.state === "SENT" ? "completed" : "processing",
      provider: "rafiki",
    };

    return { payment, legacyResult, error: null };
  } catch (err: unknown) {
    return {
      payment: null,
      legacyResult: null,
      error: err instanceof Error ? err.message : "Unknown error during payment migration",
    };
  }
}

/**
 * Estimate the destination amount given a source amount using the quote API.
 * Returns `estimatedExchangeRate` as a number (Rafiki's native type).
 */
export async function estimateDestinationAmount(
  sourceAmount: number,
  sourceAssetCode: string,
  senderWalletAddressId: string,
  receiver: string, // incoming payment URL at destination
): Promise<{
  estimatedSendCents: number | null;
  estimatedReceiveCents: number | null;
  exchangeRate: number | null;
  error: string | null;
}> {
  try {
    const amountCents = Math.round(sourceAmount * 100).toString();

    const quoteInput: CreateQuoteInput = {
      walletAddressId: senderWalletAddressId,
      receiver,
      debitAmount: { value: amountCents, assetCode: sourceAssetCode, assetScale: 2 },
    };

    const { quote, error } = await createQuote(quoteInput);
    if (error || !quote) {
      return { estimatedSendCents: null, estimatedReceiveCents: null, exchangeRate: null, error: error || "Failed to get quote" };
    }

    return {
      estimatedSendCents: parseInt(quote.debitAmount.value, 10),
      estimatedReceiveCents: parseInt(quote.receiveAmount.value, 10),
      exchangeRate: quote.estimatedExchangeRate,
      error: null,
    };
  } catch (err: unknown) {
    return {
      estimatedSendCents: null,
      estimatedReceiveCents: null,
      exchangeRate: null,
      error: err instanceof Error ? err.message : "Unknown error estimating amount",
    };
  }
}
