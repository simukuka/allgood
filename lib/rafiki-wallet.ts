/**
 * Rafiki wallet lifecycle helpers
 *
 * - provisionUserWallet: called on sign-up/sign-in to ensure each user has a Rafiki wallet
 * - resolveRecipientWallet: maps email / phone / wallet-address to a walletAddressId + receiver URL
 */

import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";
import {
  createIncomingPayment,
  createWalletAddress,
  getAssets,
  isRafikiGraphqlConfigured,
} from "@/lib/rafiki-graphql";

// Base URL for wallet payment pointers — set via env or app.json extra
const RAFIKI_WALLET_DOMAIN =
  Constants.expoConfig?.extra?.rafikiWalletDomain ??
  process.env.EXPO_PUBLIC_RAFIKI_WALLET_DOMAIN ??
  "";

// ─── Wallet provisioning ─────────────────────────────────────────────────────

/**
 * Ensure the user has a Rafiki wallet address provisioned.
 * - No-ops if the profile already has rafiki_wallet_address_id set.
 * - No-ops if Rafiki is not yet configured.
 * - Writes the new wallet ID back to the profile row on success.
 *
 * Call this in ensureUserBootstrap (AuthContext) after the profile is confirmed.
 */
export async function provisionUserWallet(
  userId: string,
  fullName: string,
): Promise<{ walletAddressId: string | null; error: string | null }> {
  if (!isRafikiGraphqlConfigured || !RAFIKI_WALLET_DOMAIN) {
    return { walletAddressId: null, error: null }; // silently skip — not configured yet
  }

  // Check if already provisioned
  const { data: profile, error: fetchErr } = await supabase
    .from("profiles")
    .select("rafiki_wallet_address_id")
    .eq("id", userId)
    .single();

  if (fetchErr) return { walletAddressId: null, error: fetchErr.message };
  if (profile?.rafiki_wallet_address_id) {
    return { walletAddressId: profile.rafiki_wallet_address_id, error: null };
  }

  // Find the USD asset ID in Rafiki
  const { assets, error: assetsErr } = await getAssets();
  if (assetsErr) return { walletAddressId: null, error: assetsErr };

  const usdAsset = assets.find((a) => a.code === "USD");
  if (!usdAsset) {
    return { walletAddressId: null, error: "USD asset not found in Rafiki instance" };
  }

  // Deterministic wallet URL based on userId (safe for repeated calls)
  const walletUrl = `${RAFIKI_WALLET_DOMAIN}/users/${userId}`;

  const { wallet, error: walletErr } = await createWalletAddress({
    assetId: usdAsset.id,
    publicName: fullName,
    url: walletUrl,
  });

  if (walletErr || !wallet) {
    return { walletAddressId: null, error: walletErr ?? "Failed to create wallet" };
  }

  // Persist to profile
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      rafiki_wallet_address_id: wallet.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateErr) {
    console.warn("Wallet provisioned but failed to save to profile:", updateErr.message);
    // Return the ID anyway so the current session can still use it
  }

  return { walletAddressId: wallet.id, error: null };
}

// ─── Recipient resolution ─────────────────────────────────────────────────────

export type RecipientMethod = "email" | "phone" | "wallet";

export interface ResolvedRecipient {
  /** Rafiki walletAddressId of the recipient (for createIncomingPayment) */
  walletAddressId: string;
  /** Open Payments incoming payment URL — use this as `receiver` in createQuote */
  receiverUrl: string;
  /** Internal profile id when recipient is an AllGood user */
  profileId: string | null;
  /** Recipient display name if known */
  fullName: string | null;
}

/**
 * Resolve a recipient identifier to a Rafiki walletAddressId + incoming payment URL.
 *
 * - email / phone: looks up profiles in Supabase for a matching user
 * - wallet: uses the address string directly as the walletAddressId
 *
 * Returns an error when:
 * - The recipient is not an AllGood user (email/phone)
 * - The recipient has no Rafiki wallet yet
 * - Rafiki is not configured
 */
export async function resolveRecipientWallet(
  identifier: string,
  method: RecipientMethod,
  debitAmountCents: string,
  debitAssetCode = "USD",
): Promise<{ recipient: ResolvedRecipient | null; error: string | null }> {
  if (!isRafikiGraphqlConfigured) {
    return { recipient: null, error: "Rafiki not configured" };
  }

  let recipientWalletAddressId: string | null = null;
  let recipientProfileId: string | null = null;
  let recipientFullName: string | null = null;

  if (method === "wallet") {
    // For direct wallet addresses, treat the identifier as the walletAddressId
    recipientWalletAddressId = identifier;

    const { data: walletProfile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("rafiki_wallet_address_id", identifier.trim())
      .maybeSingle();

    recipientProfileId = walletProfile?.id ?? null;
    recipientFullName = walletProfile?.full_name ?? null;
  } else {
    // Look up by email or phone in Supabase profiles
    const column = method === "email" ? "email" : "phone";
    const { data: recipientProfile, error: lookupErr } = await supabase
      .from("profiles")
      .select("id, rafiki_wallet_address_id, full_name")
      .eq(column, identifier.trim())
      .maybeSingle();

    if (lookupErr) return { recipient: null, error: lookupErr.message };

    if (!recipientProfile) {
      return {
        recipient: null,
        error: `No AllGood account found for ${method} "${identifier}". They need to sign up first.`,
      };
    }

    if (!recipientProfile.rafiki_wallet_address_id) {
      return {
        recipient: null,
        error: `Recipient's wallet is not yet active. They may need to sign in once.`,
      };
    }

    recipientWalletAddressId = recipientProfile.rafiki_wallet_address_id;
    recipientProfileId = recipientProfile.id;
    recipientFullName = recipientProfile.full_name;
  }

  // Create an incoming payment at the recipient's wallet to get the receiver URL
  const { payment: incoming, error: incomingErr } = await createIncomingPayment({
    walletAddressId: recipientWalletAddressId,
    incomingAmount: { value: debitAmountCents, assetCode: debitAssetCode, assetScale: 2 },
    // 10-minute expiry — enough time to confirm + execute
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  if (incomingErr || !incoming) {
    return {
      recipient: null,
      error: incomingErr ?? "Failed to create incoming payment for recipient",
    };
  }

  return {
    recipient: {
      walletAddressId: recipientWalletAddressId,
      receiverUrl: incoming.incomingPaymentUrl,
      profileId: recipientProfileId,
      fullName: recipientFullName,
    },
    error: null,
  };
}
