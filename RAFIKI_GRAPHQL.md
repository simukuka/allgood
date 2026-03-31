# Rafiki GraphQL Backend Integration Guide

> Last Updated: March 2026  
> Status: 🚀 Ready for gradual migration

## Overview

The AllGood app now supports the **Rafiki GraphQL Backend API** (`https://rafiki.dev/apis/graphql/backend/`), replacing the older REST-based payment relay. This enables:

- **Live FX rates** - Real-time exchange rates for every transfer
- **Transparent pricing** - See exactly what you'll send and receive before confirming
- **Multi-asset support** - Send and receive across different currencies
- **ILP integration** - Native Interledger Protocol compliance
- **Wallet management** - Connect multiple funding sources

## Configuration

### 1. Set Environment Variables

Copy `.env.example` to `.env` and add your Rafiki credentials:

```bash
# Rafiki GraphQL Backend
EXPO_PUBLIC_RAFIKI_GRAPHQL_URL=https://backend-api-example.rafiki.money/graphql
EXPO_PUBLIC_RAFIKI_API_KEY=your_rafiki_api_key
```

**Note:** Get your API key from the [Rafiki dashboard](https://rafiki.money).

### 2. Restart the dev server

```bash
npm start
```

---

## Usage Patterns

### Pattern 1: Using the `useRafikiPayment` Hook

This is the **recommended approach** for most payment flows. It handles the complete workflow: quote → payment → polling.

```tsx
import { useRafikiPayment } from "@/hooks";

export function SendMoneyComponent() {
  const { state, createAndSendPayment, reset } = useRafikiPayment();

  const handleSend = async () => {
    const result = await createAndSendPayment(
      {
        sendingAssetCode: "USD",
        sendingAssetScale: 2,
        receivingAssetCode: "MXN",
        receivingAssetScale: 2,
        receiveAmount: "100000", // 1000 MXN in cents
      },
      {
        walletAddress: "$recipient.example.com",
        metadata: {
          userId: "user123",
          note: "Payment for services",
        },
      },
    );

    if (result.success) {
      console.log("Payment sent:", result.payment);
    } else {
      console.error("Payment failed:", result.error);
    }
  };

  return (
    <View>
      <Text>{state.loading ? "Sending..." : "Ready"}</Text>
      {state.error && <Text>{state.error}</Text>}
      <Button onPress={handleSend}>Send Money</Button>
    </View>
  );
}
```

### Pattern 2: Manual GraphQL Queries

For more control, use the GraphQL functions directly:

```tsx
import {
  createQuote,
  createOutgoingPayment,
  getOutgoingPayment,
  pollPaymentStatus,
} from "@/lib/rafiki-graphql";

async function customPaymentFlow() {
  // Get a quote first
  const { quote } = await createQuote({
    sendingAssetCode: "USD",
    sendingAssetScale: 2,
    receivingAssetCode: "BRL",
    receivingAssetScale: 2,
    receiveAmount: "500000", // 5000 BRL
  });

  // Create the payment
  const { payment } = await createOutgoingPayment({
    quoteId: quote.id,
    walletAddress: "$recipient.rafiki.money",
    metadata: { userId: user.id },
  });

  // Poll until completion
  const { payment: finalPayment } = await pollPaymentStatus(payment.id);
  console.log("Final status:", finalPayment.state); // COMPLETED, FAILED, etc.
}
```

### Pattern 3: Migration from Old REST API

If you're upgrading from the old REST-based payment flow, use the migration bridge:

```tsx
import { migrateLegacyPaymentToGraphQL } from "@/lib/rafiki-migration";

// Old code that will eventually be removed
const result = await migrateLegacyPaymentToGraphQL({
  senderUserId: "user123",
  recipient: "$recipient.example.com",
  recipientName: "John Doe",
  amount: 100.5, // in USD
  sourceAssetCode: "USD",
  destinationAssetCode: "MXN",
  paymentMethod: "wallet",
});

if (result.error) {
  console.error(result.error);
} else {
  console.log("Payment ID:", result.payment.id);
}
```

---

## Data Model

### Quote

Returned when requesting an exchange rate estimate:

```typescript
interface Quote {
  id: string; // Unique quote ID
  sendAmount: string; // Amount to send (in cents)
  receiveAmount: string; // Amount recipient will get (in cents)
  expiresAt: string; // ISO 8601 timestamp
  highEstimatedExchangeRate: string; // Max FX rate
  lowEstimatedExchangeRate: string; // Min FX rate
  estimatedExchangeRate: string; // Best estimate
}
```

### OutgoingPayment

Status of a payment after creation:

```typescript
interface OutgoingPayment {
  id: string; // Unique payment ID
  state: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  sendAmount: {
    value: string; // In cents
    assetCode: string; // e.g., 'USD'
    assetScale: number; // Decimal places (usually 2)
  };
  receiveAmount: {
    value: string; // In cents
    assetCode: string; // e.g., 'MXN'
    assetScale: number;
  };
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

---

## Common Tasks

### Get a Live Exchange Rate

```tsx
import { estimateDestinationAmount } from "@/lib/rafiki-migration";

const { estimatedAmount, exchangeRate } = await estimateDestinationAmount(
  100.0, // Send $100 USD
  "USD", // From USD
  "MXN", // To MXN
);

console.log(`$100 USD = ${estimatedAmount} MXN (rate: ${exchangeRate})`);
```

### Check Payment Status

```tsx
import { getOutgoingPayment } from "@/lib/rafiki-graphql";

const { payment, error } = await getOutgoingPayment("payment_123");

if (payment.state === "COMPLETED") {
  console.log("Payment succeeded!");
} else if (payment.state === "FAILED") {
  console.log("Payment failed");
}
```

### List User Wallets

```tsx
import { getWallets } from "@/lib/rafiki-graphql";

const { wallets, error } = await getWallets();

wallets.forEach((wallet) => {
  console.log(`${wallet.name}: ${wallet.balance} ${wallet.assetCode}`);
});
```

---

## Error Handling

All functions return a result object with `error` and `data`:

```tsx
const { payment, error } = await getOutgoingPayment(id);

if (error) {
  // Handle GraphQL errors
  if (error.includes("EXPIRED_QUOTE")) {
    showToast("Quote expired, please request a new one");
  } else if (error.includes("INSUFFICIENT_BALANCE")) {
    showToast("Insufficient balance in wallet");
  } else {
    showToast(`Error: ${error}`);
  }
} else {
  // Use payment data
}
```

---

## Migration Checklist

Progress toward full GraphQL adoption:

- [ ] Configure Rafiki GraphQL credentials in `.env`
- [ ] Test `useRafikiPayment` hook in isolated screens
- [ ] Update `send-confirm.tsx` to use new hook
- [ ] Integrate live FX rate display in send flow
- [ ] Update transaction schema to store GraphQL payment IDs
- [ ] Add payment polling in `transfer-status.tsx`
- [ ] Remove old REST relay code (`sendRafikiPayment`) from `lib/rafiki.ts`
- [ ] Test end-to-end with real transfers
- [ ] Delete `lib/rafiki-migration.ts` once fully migrated

---

## Debugging

### Enable verbose logging

Add to `lib/rafiki-graphql.ts`:

```typescript
export const DEBUG = true; // Set to true for detailed logs

if (DEBUG) console.log("GraphQL Request:", { query, variables });
```

### Test GraphQL directly

Use Rafiki's GraphQL playground:

```bash
curl -X POST https://backend-api-example.rafiki.money/graphql \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"query GetWallets { wallets { edges { node { id name } } } }"}'
```

---

## References

- [Rafiki GraphQL API Docs](https://rafiki.dev/apis/graphql/backend/)
- [Interledger Protocol](https://interledger.org/)
- [Asset Codes & Standards](https://rafiki.dev/guides/assets/)
