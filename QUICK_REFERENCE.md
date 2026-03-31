# Rafiki GraphQL Quick Reference Card

**Print this or pin in your IDE for easy access during implementation**

---

## 🔑 Essential Setup

```bash
# 1. Add to .env
EXPO_PUBLIC_RAFIKI_GRAPHQL_URL=https://backend-api-example.rafiki.money/graphql
EXPO_PUBLIC_RAFIKI_API_KEY=your_api_key

# 2. Restart dev server
npm start

# 3. Done! Ready to use
```

---

## 📱 Using the Hook (Most Common)

```tsx
import { useRafikiPayment } from "@/hooks";

export function YourComponent() {
  const { state, createAndSendPayment } = useRafikiPayment();

  const handlePay = async () => {
    const result = await createAndSendPayment(
      // Quote input
      {
        sendingAssetCode: "USD",
        sendingAssetScale: 2,
        receivingAssetCode: "MXN",
        receivingAssetScale: 2,
        receiveAmount: "100000", // 1000 MXN in cents
      },
      // Payment input
      {
        walletAddress: "$recipient.com",
        metadata: { userId: "user123" },
      },
    );

    if (result.success) {
      console.log("Payment ID:", result.payment.id);
      console.log("State:", result.payment.state);
    } else {
      console.error(result.error);
    }
  };

  return (
    <View>
      <Text>{state.loading ? "Processing..." : "Ready"}</Text>
      {state.error && <Text style={{ color: "red" }}>{state.error}</Text>}
      <Button onPress={handlePay} disabled={state.loading}>
        Send
      </Button>
    </View>
  );
}
```

---

## 🔄 Core APIs

| Function                       | What it does           | Returns                         |
| ------------------------------ | ---------------------- | ------------------------------- |
| `createQuote(input)`           | Get FX rate & estimate | `Quote` with rate & expiry      |
| `createOutgoingPayment(input)` | Create transfer        | `OutgoingPayment` with ID       |
| `getOutgoingPayment(id)`       | Check status           | `OutgoingPayment` current state |
| `pollPaymentStatus(id)`        | Auto-poll until done   | `OutgoingPayment` final state   |
| `getWallets()`                 | List user wallets      | Array of `Wallet`               |

---

## 💰 Amount Conversions

```typescript
// Always use STRINGS, not floats!
// Always in CENTS (minor units)

// $100 USD
const amount = "10000"; // 10,000 cents

// 1000 MXN
const amount = "100000"; // 100,000 cents

// Convert user input to cents
const userInput = 150.5; // dollars
const cents = Math.round(userInput * 100); // 15050
const asString = cents.toString(); // "15050"

// Convert cents back to display
const cents = parseInt("15050");
const dollars = cents / 100; // 150.50
```

---

## 🌍 Common Asset Codes

| Code | Currency       | Scale |
| ---- | -------------- | ----- |
| USD  | US Dollar      | 2     |
| MXN  | Mexican Peso   | 2     |
| BRL  | Brazilian Real | 2     |
| EUR  | Euro           | 2     |
| GBP  | British Pound  | 2     |
| COP  | Colombian Peso | 2     |

_All fiat: scale = 2_

---

## 📊 Payment States

```
PENDING    → Quote created, ready to pay
PROCESSING → Transfer in flight via ILP
COMPLETED  → Success! Money arrived
FAILED     → Problem occurred, needs retry
```

Terminal states: `COMPLETED` or `FAILED`

---

## ❌ Error Handling Template

```typescript
const { quote, error: quoteError } = await createQuote(input);

if (quoteError) {
  if (quoteError.includes("INSUFFICIENT_BALANCE")) {
    showToast("Not enough funds");
  } else if (quoteError.includes("INVALID_ADDRESS")) {
    showToast("Invalid recipient address");
  } else if (quoteError.includes("EXPIRED")) {
    showToast("Quote expired, please try again");
  } else {
    showToast(`Error: ${quoteError}`);
  }
  return;
}

// Use quote...
```

---

## 🧪 Manual Testing with curl

```bash
# Health check
curl -X POST https://YOUR_URL/graphql \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { me { id } }"}'

# Create quote
curl -X POST https://YOUR_URL/graphql \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateQuote($sendingAssetCode: String!, ...) { ... }",
    "variables": {
      "sendingAssetCode": "USD",
      "sendingAssetScale": 2,
      "receivingAssetCode": "MXN",
      "receivingAssetScale": 2,
      "receiveAmount": "100000"
    }
  }'
```

See `lib/rafiki-queries.reference.ts` for all queries.

---

## 🛠️ Real-World Integration Checklist

- [ ] Configure `.env` with Rafiki credentials
- [ ] Test `useRafikiPayment` hook in isolation
- [ ] Update `send-confirm.tsx` with new hook
- [ ] Update `transfer-status.tsx` to poll API
- [ ] Store `rafiki_payment_id` in database
- [ ] Update database schema with `rafiki_state` column
- [ ] Test with real transfers
- [ ] Remove old REST code
- [ ] Test error scenarios (timeout, invalid address, balance)
- [ ] Deploy with feature flag or gradual rollout

---

## 📚 Which File to Read?

| Question                                    | File                                  |
| ------------------------------------------- | ------------------------------------- |
| "How do I set this up?"                     | `RAFIKI_GRAPHQL.md`                   |
| "How do I integrate with send-confirm.tsx?" | `INTEGRATION_GUIDE_SEND_CONFIRM.md`   |
| "What are all the raw GraphQL queries?"     | `lib/rafiki-queries.reference.ts`     |
| "Show me a working component"               | `components/RafikiPaymentExample.tsx` |
| "What did you build?"                       | `RAFIKI_IMPLEMENTATION_SUMMARY.md`    |

---

## 🚨 Common Mistakes

❌ Using floats for amounts

```typescript
const amount = 100.5; // DON'T
```

✅ Use strings in cents

```typescript
const amount = "10050"; // YES
```

---

❌ Not checking quote expiry

```typescript
const quote = await createQuote(...);
// Much later...
const payment = await createOutgoingPayment(quote.id); // Might fail
```

✅ Check before using

```typescript
const quote = await createQuote(...);
if (new Date(quote.expiresAt) < new Date()) {
  // Get a fresh quote
} else {
  const payment = await createOutgoingPayment(...);
}
```

---

❌ Ignoring errors

```typescript
const { quote } = await createQuote(input);
// What if it failed?
```

✅ Always check errors

```typescript
const { quote, error } = await createQuote(input);
if (error) {
  console.error("Quote failed:", error);
  return;
}
// Now safe to use quote
```

---

## 🔗 More Help

- **Full Docs:** https://rafiki.dev/
- **GraphQL API:** https://rafiki.dev/apis/graphql/backend/
- **This Repo Docs:** See `RAFIKI_GRAPHQL.md`

---

**Last Updated:** March 2026  
**Status:** Ready for Implementation  
**Questions?** Check the relevant docs file above
