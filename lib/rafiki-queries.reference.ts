/**
 * Rafiki GraphQL Query Reference
 *
 * Raw GraphQL queries and mutations for testing against the Rafiki API.
 * Use these for debugging or testing in the GraphQL playground.
 *
 * Endpoint: https://backend-api-example.rafiki.money/graphql
 * Auth: Bearer token in Authorization header
 */

// ============================================================================
// QUOTES - Get exchange rates and payment estimates
// ============================================================================

/**
 * Create Quote Query
 * Request: Estimate how much the recipient will receive
 * Response: Quote details with exchange rate and expiry
 */
export const QUERY_CREATE_QUOTE = `
  mutation CreateQuote(
    $sendingAssetCode: String!
    $sendingAssetScale: Int!
    $receivingAssetCode: String!
    $receivingAssetScale: Int!
    $receiveAmount: String!
  ) {
    createQuote(input: {
      sendingAssetCode: $sendingAssetCode
      sendingAssetScale: $sendingAssetScale
      receivingAssetCode: $receivingAssetCode
      receivingAssetScale: $receivingAssetScale
      receiveAmount: $receiveAmount
    }) {
      quote {
        id
        sendAmount
        receiveAmount
        expiresAt
        highEstimatedExchangeRate
        lowEstimatedExchangeRate
        estimatedExchangeRate
      }
    }
  }
`;

export const EXAMPLE_CREATE_QUOTE_VARIABLES = {
  sendingAssetCode: "USD",
  sendingAssetScale: 2,
  receivingAssetCode: "MXN",
  receivingAssetScale: 2,
  receiveAmount: "100000", // 1000 MXN in cents
};

// ============================================================================
// OUTGOING PAYMENTS - Create and manage transfers
// ============================================================================

/**
 * Create Outgoing Payment Mutation
 * Request: Initiate a transfer using a valid quote ID
 * Response: Payment object with initial state and amounts
 */
export const MUTATION_CREATE_OUTGOING_PAYMENT = `
  mutation CreateOutgoingPayment(
    $quoteId: String!
    $walletAddress: String!
    $metadata: JSONObject
  ) {
    createOutgoingPayment(input: {
      quoteId: $quoteId
      walletAddress: $walletAddress
      metadata: $metadata
    }) {
      outgoingPayment {
        id
        state
        sendAmount {
          value
          assetCode
          assetScale
        }
        receiveAmount {
          value
          assetCode
          assetScale
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const EXAMPLE_CREATE_OUTGOING_PAYMENT_VARIABLES = {
  quoteId: "quote_123abc",
  walletAddress: "$recipient.rafiki.money",
  metadata: {
    userId: "user_456",
    recipientName: "John Doe",
    paymentMethod: "mobile_money",
  },
};

/**
 * Get Outgoing Payment Query
 * Request: Check the status of an existing payment
 * Response: Full payment details including current state
 */
export const QUERY_GET_OUTGOING_PAYMENT = `
  query GetOutgoingPayment($id: String!) {
    outgoingPayment(id: $id) {
      id
      state
      sendAmount {
        value
        assetCode
        assetScale
      }
      receiveAmount {
        value
        assetCode
        assetScale
      }
      createdAt
      updatedAt
      quote {
        id
        estimatedExchangeRate
      }
    }
  }
`;

export const EXAMPLE_GET_OUTGOING_PAYMENT_VARIABLES = {
  id: "payment_789xyz",
};

// ============================================================================
// WALLETS - Manage funding sources
// ============================================================================

/**
 * Get Wallets Query
 * Request: List all wallets for the authenticated user
 * Response: Array of wallet objects with balances
 */
export const QUERY_GET_WALLETS = `
  query GetWallets {
    wallets {
      edges {
        node {
          id
          name
          assetCode
          assetScale
          balance
          address
        }
      }
    }
  }
`;

/**
 * Get Wallet Details Query
 * Request: Get details for a specific wallet
 * Response: Wallet with transaction history
 */
export const QUERY_GET_WALLET = `
  query GetWallet($id: String!) {
    wallet(id: $id) {
      id
      name
      assetCode
      assetScale
      balance
      address
      transactions(first: 10) {
        edges {
          node {
            id
            amount
            type
            createdAt
          }
        }
      }
    }
  }
`;

// ============================================================================
// DEBUGGING QUERIES
// ============================================================================

/**
 * Health Check Query
 * Simple query to verify API connectivity and auth
 */
export const QUERY_HEALTH_CHECK = `
  query {
    me {
      id
      email
    }
  }
`;

/**
 * Supported Assets Query
 * List all assets supported by the Rafiki instance
 */
export const QUERY_SUPPORTED_ASSETS = `
  query {
    assets {
      edges {
        node {
          id
          code
          scale
          name
        }
      }
    }
  }
`;

/**
 * List Recent Payments Query
 * Get payment history for the current user
 */
export const QUERY_LIST_PAYMENTS = `
  query ListPayments($first: Int, $after: String) {
    outgoingPayments(first: $first, after: $after) {
      edges {
        node {
          id
          state
          sendAmount {
            value
            assetCode
            assetScale
          }
          receiveAmount {
            value
            assetCode
            assetScale
          }
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const EXAMPLE_LIST_PAYMENTS_VARIABLES = {
  first: 20,
};

// ============================================================================
// USAGE EXAMPLES FOR TERMINAL/CURL
// ============================================================================

/*

// Test the API directly with curl

// 1. Health check
curl -X POST https://backend-api-example.rafiki.money/graphql \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { me { id email } }"
  }'

// 2. Create a quote
curl -X POST https://backend-api-example.rafiki.money/graphql \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateQuote($sendingAssetCode: String!, $sendingAssetScale: Int!, $receivingAssetCode: String!, $receivingAssetScale: Int!, $receiveAmount: String!) { createQuote(input: {sendingAssetCode: $sendingAssetCode, sendingAssetScale: $sendingAssetScale, receivingAssetCode: $receivingAssetCode, receivingAssetScale: $receivingAssetScale, receiveAmount: $receiveAmount}) { quote { id sendAmount receiveAmount expiresAt estimatedExchangeRate } } }",
    "variables": {
      "sendingAssetCode": "USD",
      "sendingAssetScale": 2,
      "receivingAssetCode": "MXN",
      "receivingAssetScale": 2,
      "receiveAmount": "100000"
    }
  }'

// 3. List wallets
curl -X POST https://backend-api-example.rafiki.money/graphql \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { wallets { edges { node { id name assetCode balance } } } }"
  }'

*/

// ============================================================================
// PAYMENT STATE MACHINE
// ============================================================================

/*

Payment states and transitions:

PENDING
  └─ Quote created, payment created, waiting to be processed
     └─ Can still be updated if quote hasn't expired

PROCESSING
  └─ Payment is being processed by the Rafiki network
     └─ ILP packets are being sent
     └─ Cannot be cancelled

COMPLETED
  └─ Payment successfully delivered to recipient
     └─ Terminal state - no further changes

FAILED
  └─ Payment failed (insufficient balance, invalid address, timeout, etc.)
     └─ Terminal state - can retry by creating a new payment

*/

// ============================================================================
// ASSET CODES REFERENCE
// ============================================================================

/*

Common asset codes by region (ISO 4217):

USD - US Dollar
EUR - Euro
GBP - British Pound
MXN - Mexican Peso
BRL - Brazilian Real
COP - Colombian Peso
ARS - Argentine Peso
CLP - Chilean Peso
PEN - Peruvian Sol
INR - Indian Rupee
PHP - Philippine Peso
THB - Thai Baht
ZAR - South African Rand
NGN - Nigerian Naira
KES - Kenyan Shilling
UGX - Ugandan Shilling

Note: Asset scale is typically 2 for all fiat currencies,
meaning 1 unit = 100 cents

*/
