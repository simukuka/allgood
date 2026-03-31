/\*\*

- INTEGRATION GUIDE: Migrating send-confirm.tsx to Rafiki GraphQL
-
- This file walks through the exact steps to update your send confirmation screen
- to use the new Rafiki GraphQL backend instead of the old REST API.
-
- Target File: app/send-confirm.tsx
- Current Flow: User → REST relay → Rafiki
- New Flow: User → GraphQL backend → Rafiki (via ILP)
  \*/

// ============================================================================
// STEP 1: UPDATE IMPORTS
// ============================================================================

/\*
BEFORE (current send-confirm.tsx):

---

## import { sendRafikiPayment } from "@/lib/rafiki";

## AFTER (with GraphQL support):

import { useRafikiPayment } from "@/hooks";
import { createTransaction, updateTransactionStatus } from "@/lib/data";
import { hapticError, hapticSuccess } from "@/lib/haptics";

---

\*/

// ============================================================================
// STEP 2: REPLACE STATE MANAGEMENT
// ============================================================================

/\*
BEFORE: Local state for sending status

---

const [sending, setSending] = useState(false);
const [sent, setSent] = useState(false);
const [txError, setTxError] = useState<string | null>(null);
const [finalStatus, setFinalStatus] = useState<"completed" | "processing">("processing");
const [transactionId, setTransactionId] = useState<string>("");

---

## AFTER: Use the custom hook

const { state: paymentState, createAndSendPayment } = useRafikiPayment();
const [sent, setSent] = useState(false);
const [txError, setTxError] = useState<string | null>(null);
const [transactionId, setTransactionId] = useState<string>("");

// Computed values from hook state
const sending = paymentState.loading;
const finalStatus = paymentState.payment?.state === "COMPLETED" ? "completed" : "processing";

---

\*/

// ============================================================================
// STEP 3: REPLACE THE PAYMENT SENDING FUNCTION
// ============================================================================

/\*
BEFORE: Direct REST call to sendRafikiPayment

---

const handleConfirmPayment = async () => {
setSending(true);
try {
// Create transaction record
const { data: txData, error: txCreateError } = await createTransaction({
userId: user.id,
recipient: recipientRaw,
recipient_name: recipientName,
amount: parseFloat(params.amount ?? "0"),
currency: "USD",
exchange_rate: parseFloat(params.rate ?? "1"),
fee: 0,
status: "pending",
type: "send",
note: `payment_method:${paymentMethod}`,
});

    if (txCreateError || !txData) {
      throw new Error(txCreateError || "Unable to create transaction.");
    }

    // OLD: Call REST API directly
    const { data: payment, error: paymentError } = await sendRafikiPayment({
      senderUserId: user.id,
      recipient: recipientRaw,
      recipientName,
      amount: parseFloat(params.amount ?? "0"),
      sourceAssetCode: "USD",
      destinationAssetCode: "MXN",
      paymentMethod,
    });

    if (paymentError || !payment) {
      await updateTransactionStatus(txData.id, "failed");
      throw new Error(paymentError || "Rafiki payment failed.");
    }

    // Update transaction with payment provider ID
    setTransactionId(txData.id);
    setFinalStatus(payment.status === "completed" ? "completed" : "processing");
    setSent(true);
    hapticSuccess();
    playSuccessAnim();

} catch (e: any) {
console.warn("Transaction failed:", e?.message);
setTxError(e?.message ?? t("transferFailed"));
hapticError();
} finally {
setSending(false);
}
};

---

## AFTER: Use GraphQL hook

const handleConfirmPayment = async () => {
try {
// Step 1: Create transaction record first
const { data: txData, error: txCreateError } = await createTransaction({
userId: user.id,
recipient: recipientRaw,
recipient_name: recipientName,
amount: parseFloat(params.amount ?? "0"),
currency: "USD",
exchange_rate: parseFloat(params.rate ?? "1"),
fee: 0,
status: "pending",
type: "send",
note: `payment_method:${paymentMethod}`,
});

    if (txCreateError || !txData) {
      throw new Error(txCreateError || "Unable to create transaction.");
    }

    // Step 2: NEW - Use GraphQL hook to create quote + payment
    const result = await createAndSendPayment(
      // Quote input
      {
        sendingAssetCode: "USD",
        sendingAssetScale: 2,
        receivingAssetCode: "MXN",
        receivingAssetScale: 2,
        receiveAmount: Math.round(parseFloat(params.amount ?? "0") * 100).toString(),
      },
      // Payment input
      {
        walletAddress: recipientRaw,
        metadata: {
          transactionId: txData.id,
          recipientName,
          paymentMethod,
          senderUserId: user.id,
        },
      },
    );

    if (!result.success || !result.payment) {
      await updateTransactionStatus(txData.id, "failed");
      throw new Error(result.error || "Rafiki payment failed.");
    }

    // Step 3: Update transaction with GraphQL payment ID
    // IMPORTANT: Store the GraphQL payment ID, not the old provider ID
    await updateTransactionStatus(txData.id, "processing", {
      rafiki_payment_id: result.payment.id,
      rafiki_state: result.payment.state,
    });

    setTransactionId(txData.id);
    setSent(true);
    hapticSuccess();
    playSuccessAnim();

    // Optional: Continue polling in background
    pollPaymentStatus(result.payment.id, txData.id);

} catch (e: any) {
console.warn("Transaction failed:", e?.message);
setTxError(e?.message ?? t("transferFailed"));
hapticError();
}
};

/\*\*

- Optional: Background polling function
- Continuously check payment status and update transaction record
  _/
  const pollPaymentStatus = async (paymentId: string, transactionId: string) => {
  // This could be moved to a background job or service
  // For now, we'll do a few polls with increasing delay
  for (let i = 0; i < 10; i++) {
  await new Promise(r => setTimeout(r, 2000 _ (i + 1))); // Exponential backoff
      const { getOutgoingPayment } = await import("@/lib/rafiki-graphql");
      const { payment } = await getOutgoingPayment(paymentId);

      if (!payment) continue;

      if (payment.state === "COMPLETED" || payment.state === "FAILED") {
        await updateTransactionStatus(
          transactionId,
          payment.state === "COMPLETED" ? "completed" : "failed",
          { rafiki_state: payment.state }
        );
        break;
      }
  }
  };

---

\*/

// ============================================================================
// STEP 4: UPDATE DATABASE SCHEMA
// ============================================================================

/\*
If your transaction table doesn't already have these fields, add them:

## BEFORE:

CREATE TABLE transactions (
id UUID PRIMARY KEY,
user_id UUID NOT NULL,
recipient TEXT NOT NULL,
amount DECIMAL(10, 2) NOT NULL,
status TEXT DEFAULT 'pending',
created_at TIMESTAMP DEFAULT now(),
...
);

---

## AFTER:

CREATE TABLE transactions (
id UUID PRIMARY KEY,
user_id UUID NOT NULL,
recipient TEXT NOT NULL,
amount DECIMAL(10, 2) NOT NULL,
status TEXT DEFAULT 'pending',

-- NEW: Store GraphQL payment reference
rafiki_payment_id TEXT, -- e.g., "payment_123abc"
rafiki_state TEXT, -- PENDING, PROCESSING, COMPLETED, FAILED

created_at TIMESTAMP DEFAULT now(),
updated_at TIMESTAMP DEFAULT now(),
...
);

---

## Migration SQL:

ALTER TABLE transactions ADD COLUMN rafiki_payment_id TEXT;
ALTER TABLE transactions ADD COLUMN rafiki_state TEXT;

---

\*/

// ============================================================================
// STEP 5: UPDATE TRANSFER STATUS SCREEN
// ============================================================================

/\*
File: app/transfer-status.tsx

The status screen should now poll the GraphQL API instead of just
showing a static "processing" state.

## BEFORE: Using hardcoded mock status

## const [status, setStatus] = useState<"processing" | "completed">("processing");

## AFTER: Actually poll the API

import { getOutgoingPayment } from "@/lib/rafiki-graphql";

const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "COMPLETED" | "FAILED">("PENDING");

useEffect(() => {
if (!paymentId) return;

const pollStatus = async () => {
const { payment, error } = await getOutgoingPayment(paymentId);

    if (payment) {
      setStatus(payment.state);

      // If terminal state, show result screen
      if (payment.state === "COMPLETED" || payment.state === "FAILED") {
        // Stop polling and show final result
        showResult(payment);
      }
    }

};

// Poll every 2 seconds
const interval = setInterval(pollStatus, 2000);

return () => clearInterval(interval);
}, [paymentId]);

---

\*/

// ============================================================================
// STEP 6: TESTING CHECKLIST
// ============================================================================

/\*

After replacing the send confirmation flow, test:

✓ [ ] Quote creation works with real exchange rates
✓ [ ] Payment creation succeeds with valid quote
✓ [ ] Payment ID is stored in transaction record
✓ [ ] Status screen polls and shows correct state
✓ [ ] Terminal states (COMPLETED/FAILED) display properly
✓ [ ] Error messages are user-friendly
✓ [ ] Loading states display correctly
✓ [ ] Haptic feedback works (success/error)
✓ [ ] User can see FX rate before confirming
✓ [ ] Quote expiration prevents old quotes from being used

Test Scenarios:

- Happy path: USD → MXN transfer completes successfully
- Expired quote: Create quote, wait >timeout, then try to pay (should fail)
- Insufficient balance: Try to send more than available
- Invalid recipient: Use malformed ILP address
- Network error: Kill network and watch error handling
- Timeout: Simulate slow API responses (polling shouldn't hang)

\*/

// ============================================================================
// STEP 7: ROLLBACK PLAN
// ============================================================================

/\*
If something goes wrong during migration:

1. Keep the old `sendRafikiPayment()` function in lib/rafiki.ts
2. Use feature flag to switch between implementations:

import { USE_GRAPHQL_PAYMENTS } = true; // Set to false to rollback

const result = USE_GRAPHQL_PAYMENTS
? await createAndSendPayment(...)
: await sendRafikiPayment(...);

3. Once fully tested and deployed, remove the old REST implementation
   \*/

// ============================================================================
// RESOURCES
// ============================================================================

/\*
More information:

- Full GraphQL API: https://rafiki.dev/apis/graphql/backend/
- Rafiki Docs: https://rafiki.dev/
- Integration Guide: RAFIKI_GRAPHQL.md in this repo
- Example Component: components/RafikiPaymentExample.tsx
- Query Reference: lib/rafiki-queries.reference.ts
  \*/
