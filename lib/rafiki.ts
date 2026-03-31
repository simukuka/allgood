/**
 * Rafiki / Interledger payment adapter.
 *
 * In production, calls should be proxied through a secure backend that holds
 * private credentials. This client uses a configurable relay endpoint.
 */

export type PaymentMethod = "email" | "phone" | "wallet";

export interface RafikiPaymentInput {
  senderUserId: string;
  recipient: string;
  recipientName: string;
  amount: number;
  sourceAssetCode: string;
  destinationAssetCode: string;
  paymentMethod: PaymentMethod;
}

export interface RafikiPaymentResult {
  externalId: string;
  status: "completed" | "processing";
  provider: "rafiki";
}

const RAFIKI_API_URL = process.env.EXPO_PUBLIC_RAFIKI_API_URL ?? "";
const RAFIKI_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_RAFIKI_PUBLISHABLE_KEY ?? "";

export const isRafikiConfigured =
  RAFIKI_API_URL.trim().length > 0 && RAFIKI_PUBLISHABLE_KEY.trim().length > 0;

export const rafikiConfigErrorMessage =
  "Rafiki payment is not configured. Add EXPO_PUBLIC_RAFIKI_API_URL and EXPO_PUBLIC_RAFIKI_PUBLISHABLE_KEY to .env.";

export function isWalletAddress(value: string): boolean {
  const v = value.trim();
  return /^\$[a-zA-Z0-9._~-]+(\.[a-zA-Z0-9._~-]+)*$/.test(v);
}

export async function sendRafikiPayment(
  input: RafikiPaymentInput,
): Promise<{ data: RafikiPaymentResult | null; error: string | null }> {
  if (!isRafikiConfigured) {
    return { data: null, error: rafikiConfigErrorMessage };
  }

  try {
    const response = await fetch(`${RAFIKI_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rafiki-key": RAFIKI_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        senderUserId: input.senderUserId,
        recipient: input.recipient,
        recipientName: input.recipientName,
        amount: Math.round(input.amount * 100),
        sourceAssetCode: input.sourceAssetCode,
        destinationAssetCode: input.destinationAssetCode,
        paymentMethod: input.paymentMethod,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof payload?.error === "string"
          ? payload.error
          : `Rafiki payment failed (${response.status}).`;
      return { data: null, error: message };
    }

    const externalId =
      typeof payload?.id === "string"
        ? payload.id
        : `rafiki_${Date.now().toString(36)}`;

    const status = payload?.status === "completed" ? "completed" : "processing";

    return {
      data: {
        externalId,
        status,
        provider: "rafiki",
      },
      error: null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error?.message ?? "Unable to connect to Rafiki payment service.",
    };
  }
}
