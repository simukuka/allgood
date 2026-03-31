/**
 * Rafiki GraphQL Backend Integration
 * https://rafiki.dev/apis/graphql/backend/
 *
 * Handles all interactions with the Rafiki GraphQL API for:
 * - Creating quotes for transfers
 * - Creating incoming/outgoing payments
 * - Tracking payment status
 */

import Constants from "expo-constants";
import { Platform } from "react-native";

const RAFIKI_PROXY_URL =
  Constants.expoConfig?.extra?.rafikiProxyUrl ??
  process.env.EXPO_PUBLIC_RAFIKI_PROXY_URL ??
  (Platform.OS === "web" ? "/api/rafiki" : "");

const RAFIKI_GRAPHQL_URL =
  Constants.expoConfig?.extra?.rafikiGraphqlUrl ??
  process.env.EXPO_PUBLIC_RAFIKI_GRAPHQL_URL ??
  "";

export const isRafikiGraphqlConfigured =
  RAFIKI_PROXY_URL.trim().length > 0 || RAFIKI_GRAPHQL_URL.trim().length > 0;

export interface RafikiGraphQLError {
  message: string;
  extensions?: Record<string, unknown>;
}

export interface RafikiGraphQLResponse<T> {
  data?: T;
  errors?: RafikiGraphQLError[];
}

/**
 * Monetary amount — Rafiki uses UInt64 value strings to avoid float imprecision.
 * e.g., $12.50 USD = { value: "1250", assetCode: "USD", assetScale: 2 }
 */
export interface Amount {
  value: string;   // integer string in minor units (cents for scale=2)
  assetCode: string;
  assetScale: number;
}

export type OutgoingPaymentState =
  | "FUNDING"    // awaiting liquidity
  | "SENDING"    // ILP packets in flight
  | "SENT"       // terminal — success
  | "FAILED"     // terminal — error
  | "CANCELLED"; // terminal — cancelled by operator

/**
 * Execute a GraphQL query/mutation against the Rafiki backend
 */
export async function executeRafikiQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<RafikiGraphQLResponse<T>> {
  const endpoint = RAFIKI_PROXY_URL || RAFIKI_GRAPHQL_URL;

  if (!endpoint) {
    return {
      errors: [
        {
          message:
            "Rafiki endpoint not configured. Set EXPO_PUBLIC_RAFIKI_PROXY_URL or EXPO_PUBLIC_RAFIKI_GRAPHQL_URL in .env",
        },
      ],
    };
  }

  try {
    const body: Record<string, unknown> = { query };
    if (variables && Object.keys(variables).length > 0) body.variables = variables;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Try to surface the GraphQL error body for better debugging
      const errBody = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errBody ? ` — ${errBody.slice(0, 200)}` : ""}`);
    }

    return (await response.json()) as RafikiGraphQLResponse<T>;
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Unknown error connecting to Rafiki";
    // Only log at warn level — 400s during local dev (e.g. wallet provisioning) are expected
    console.warn("Rafiki GraphQL request failed:", msg);
    return { errors: [{ message: msg }] };
  }
}

// ─── Create Incoming Payment ──────────────────────────────────────────────────
// Creates a receivable payment at a wallet address you control.
// Returns the `incomingPaymentUrl` which becomes the `receiver` for quotes/payments.

export interface CreateIncomingPaymentInput {
  walletAddressId: string;  // recipient's wallet address ID in your Rafiki instance
  incomingAmount?: Amount;  // optional max amount to accept
  expiresAt?: string;       // ISO 8601, defaults to 10 minutes from now
  metadata?: Record<string, string>;
}

export interface IncomingPayment {
  id: string;
  incomingPaymentUrl: string;  // use this as `receiver` when creating a quote/payment
  walletAddressId: string;
  state: "PENDING" | "PROCESSING" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  incomingAmount: Amount | null;
  receivedAmount: Amount;
  expiresAt: string;
  createdAt: string;
}

const CREATE_INCOMING_PAYMENT_MUTATION = `
  mutation CreateIncomingPayment($input: CreateIncomingPaymentInput!) {
    createIncomingPayment(input: $input) {
      payment {
        id
        incomingPaymentUrl
        walletAddressId
        state
        incomingAmount { value assetCode assetScale }
        receivedAmount { value assetCode assetScale }
        expiresAt
        createdAt
      }
    }
  }
`;

export async function createIncomingPayment(
  input: CreateIncomingPaymentInput,
): Promise<{ payment: IncomingPayment | null; error: string | null }> {
  const response = await executeRafikiQuery<{
    createIncomingPayment: { payment: IncomingPayment };
  }>(CREATE_INCOMING_PAYMENT_MUTATION, { input });

  if (response.errors?.length) {
    return { payment: null, error: response.errors.map((e) => e.message).join("; ") };
  }
  return {
    payment: response.data?.createIncomingPayment?.payment ?? null,
    error: null,
  };
}

// ─── Create Quote ─────────────────────────────────────────────────────────────
// Get a firm exchange-rate estimate before executing the payment.
// Either debitAmount (send) or receiveAmount must be provided.

export interface CreateQuoteInput {
  walletAddressId: string;  // sender's wallet address ID in your Rafiki instance
  receiver: string;         // incoming payment URL (from createIncomingPayment)
  debitAmount?: Amount;     // how much to debit from sender — set this OR receiveAmount
  receiveAmount?: Amount;   // how much recipient gets  — set this OR debitAmount
}

export interface Quote {
  id: string;
  walletAddressId: string;
  receiver: string;
  debitAmount: Amount;
  receiveAmount: Amount;
  expiresAt: string;
  createdAt: string;
  estimatedExchangeRate: number | null;
}

const CREATE_QUOTE_MUTATION = `
  mutation CreateQuote($input: CreateQuoteInput!) {
    createQuote(input: $input) {
      quote {
        id
        walletAddressId
        receiver
        debitAmount { value assetCode assetScale }
        receiveAmount { value assetCode assetScale }
        expiresAt
        createdAt
        estimatedExchangeRate
      }
    }
  }
`;

export async function createQuote(
  input: CreateQuoteInput,
): Promise<{ quote: Quote | null; error: string | null }> {
  const response = await executeRafikiQuery<{ createQuote: { quote: Quote } }>(
    CREATE_QUOTE_MUTATION,
    { input },
  );

  if (response.errors?.length) {
    return { quote: null, error: response.errors.map((e) => e.message).join("; ") };
  }
  return { quote: response.data?.createQuote?.quote ?? null, error: null };
}

// ─── Create Outgoing Payment ──────────────────────────────────────────────────

export interface CreateOutgoingPaymentInput {
  walletAddressId: string;  // sender's wallet address ID
  quoteId: string;          // quote to execute (from createQuote)
  receiver: string;         // incoming payment URL (same as used in the quote)
  metadata?: Record<string, string>;
}

export interface OutgoingPayment {
  id: string;
  walletAddressId: string;
  state: OutgoingPaymentState;
  error: string | null;
  debitAmount: Amount;
  receiveAmount: Amount;
  sentAmount: Amount | null;
  receiver: string;
  metadata: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

const CREATE_OUTGOING_PAYMENT_MUTATION = `
  mutation CreateOutgoingPayment($input: CreateOutgoingPaymentInput!) {
    createOutgoingPayment(input: $input) {
      payment {
        id
        walletAddressId
        state
        error
        debitAmount { value assetCode assetScale }
        receiveAmount { value assetCode assetScale }
        sentAmount { value assetCode assetScale }
        receiver
        createdAt
        updatedAt
      }
    }
  }
`;

export async function createOutgoingPayment(
  input: CreateOutgoingPaymentInput,
): Promise<{ payment: OutgoingPayment | null; error: string | null }> {
  const response = await executeRafikiQuery<{
    createOutgoingPayment: { payment: OutgoingPayment };
  }>(CREATE_OUTGOING_PAYMENT_MUTATION, { input });

  if (response.errors?.length) {
    return { payment: null, error: response.errors.map((e) => e.message).join("; ") };
  }
  return {
    payment: response.data?.createOutgoingPayment?.payment ?? null,
    error: null,
  };
}

// ─── Get Outgoing Payment ─────────────────────────────────────────────────────

const GET_OUTGOING_PAYMENT_QUERY = `
  query GetOutgoingPayment($id: String!) {
    outgoingPayment(id: $id) {
      id
      walletAddressId
      state
      error
      debitAmount { value assetCode assetScale }
      receiveAmount { value assetCode assetScale }
      sentAmount { value assetCode assetScale }
      receiver
      createdAt
      updatedAt
    }
  }
`;

export async function getOutgoingPayment(
  id: string,
): Promise<{ payment: OutgoingPayment | null; error: string | null }> {
  const response = await executeRafikiQuery<{
    outgoingPayment: OutgoingPayment;
  }>(GET_OUTGOING_PAYMENT_QUERY, { id });

  if (response.errors?.length) {
    return { payment: null, error: response.errors.map((e) => e.message).join("; ") };
  }
  return { payment: response.data?.outgoingPayment ?? null, error: null };
}

// ─── Assets ───────────────────────────────────────────────────────────────────
// Query available assets to obtain the assetId needed for wallet provisioning.

export interface RafikiAsset {
  id: string;
  code: string;   // ISO 4217 currency code, e.g. "USD"
  scale: number;
}

const GET_ASSETS_QUERY = `
  query GetAssets {
    assets {
      edges {
        node {
          id
          code
          scale
        }
      }
    }
  }
`;

export async function getAssets(): Promise<{
  assets: RafikiAsset[];
  error: string | null;
}> {
  const response = await executeRafikiQuery<{
    assets: { edges: Array<{ node: RafikiAsset }> };
  }>(GET_ASSETS_QUERY);

  if (response.errors?.length) {
    return { assets: [], error: response.errors.map((e) => e.message).join("; ") };
  }
  const assets = response.data?.assets?.edges?.map((e) => e.node) ?? [];
  return { assets, error: null };
}

// ─── Create Wallet Address ────────────────────────────────────────────────────
// Provision a Rafiki wallet for a user. Typically called once on account creation.

export interface CreateWalletAddressInput {
  assetId: string;    // Rafiki asset UUID (get via getAssets())
  publicName: string; // displayed to senders (e.g., user's full name)
  url: string;        // payment pointer URL, e.g. https://ilp.example.com/alice
}

export interface WalletAddress {
  id: string;
  url: string;
  publicName: string;
  assetId: string;
  createdAt: string;
}

const CREATE_WALLET_ADDRESS_MUTATION = `
  mutation CreateWalletAddress($input: CreateWalletAddressInput!) {
    createWalletAddress(input: $input) {
      walletAddress {
        id
        url
        publicName
        asset { id }
        createdAt
      }
    }
  }
`;

export async function createWalletAddress(
  input: CreateWalletAddressInput,
): Promise<{ wallet: WalletAddress | null; error: string | null }> {
  const response = await executeRafikiQuery<{
    createWalletAddress: { walletAddress: WalletAddress & { asset: { id: string } } };
  }>(CREATE_WALLET_ADDRESS_MUTATION, { input });

  if (response.errors?.length) {
    return { wallet: null, error: response.errors.map((e) => e.message).join("; ") };
  }

  const raw = response.data?.createWalletAddress?.walletAddress;
  if (!raw) return { wallet: null, error: "No wallet returned" };

  return {
    wallet: {
      id: raw.id,
      url: raw.url,
      publicName: raw.publicName,
      assetId: raw.asset?.id ?? "",
      createdAt: raw.createdAt,
    },
    error: null,
  };
}

// ─── Poll payment until terminal state ───────────────────────────────────────

const TERMINAL_STATES: OutgoingPaymentState[] = ["SENT", "FAILED", "CANCELLED"];

export async function pollPaymentStatus(
  paymentId: string,
  maxAttempts = 60,
  delayMs = 2000,
): Promise<{ payment: OutgoingPayment | null; error: string | null }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { payment, error } = await getOutgoingPayment(paymentId);

    if (error) return { payment: null, error };
    if (!payment) return { payment: null, error: "Payment not found" };
    if (TERMINAL_STATES.includes(payment.state)) return { payment, error: null };

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    payment: null,
    error: `Payment polling timed out after ${maxAttempts} attempts`,
  };
}
