# All Good – Banking App for Immigrants & Families

A React Native (Expo) banking app built for immigrants and older people, focused on affordable international transfers, financial literacy, and accessibility.

## Problem Statement

Immigrants struggle with:
- Using traditional banks
- Expensive money transfers to families abroad
- Limited financial services that understand their needs
- Difficulty saving, investing, and supporting families

## Target Audience

- **Immigrants** – Affordable international transfers, language options, financial education
- **Older people** – Accessibility features, guided flows, larger touch targets, Goodi helper

## Features

| Feature | Description |
|---------|-------------|
| **Learning Hub** | Financial literacy, investing basics, credit education |
| **Budgeting** | Expense & income tracker, monthly overview |
| **Behavior Credit Score** | Understand and improve credit (Vision tab) |
| **Financial Passport** | Transfer credit history internationally (Vision tab) |
| **Connecting Accounts** | Link bank, email, phone, trusted apps (onboarding) |
| **Transfer with Accessibility** | User modes: Child, Adult, Senior; guided flows |
| **Change Language** | English, Español, Português |
| **Goodi Helper** | AI-style assistant for guidance and support |

## Tech Stack

- **React Native** (Expo)
- **Expo Router** – File-based navigation
- **TypeScript**
- **AsyncStorage** – Persist onboarding & preferences

## Getting Started

```bash
cd AllGood
npm install
npx expo start
```

Then:
- Press **w** for web
- Press **i** for iOS Simulator
- Press **a** for Android Emulator
- Or scan the QR code with Expo Go on your device

## Production Deployment (Frontend + Backend)

This project is deployed as:
- Expo web frontend (static build)
- Vercel serverless backend endpoint at `/api/rafiki` for secure Rafiki signing

### 1. Configure Supabase
1. Create a Supabase project.
2. Run [supabase/migration.sql](supabase/migration.sql) in SQL Editor.
3. Add these Vercel environment variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 2. Configure Rafiki (server-side secrets)

Add these Vercel env vars (Production + Preview):

```bash
EXPO_PUBLIC_RAFIKI_PROXY_URL=/api/rafiki
EXPO_PUBLIC_RAFIKI_WALLET_DOMAIN=https://ilp.your-domain.com

RAFIKI_GRAPHQL_URL=https://your-rafiki-backend.example.com/graphql
RAFIKI_API_KEY=your_rafiki_admin_api_secret
RAFIKI_TENANT_ID=your_tenant_id
RAFIKI_SIGNATURE_VERSION=1
```

Do not expose `RAFIKI_API_KEY` in any `EXPO_PUBLIC_*` variable.

### 3. Deploy on Vercel
1. Import this repo in Vercel.
2. Root directory: `AllGood`
3. Build command: `npx expo export --platform web`
4. Node.js runtime: 20.x (for `/api/rafiki` serverless function)
5. Deploy.

After deployment, the UI and the Rafiki signing backend are hosted together.

### 4. Verify API routing after deploy
Run these checks against your deployed domain:

```bash
curl -i https://YOUR_DOMAIN/api/rafiki
```

Expected: `405 Method Not Allowed` with JSON body from the function.

```bash
curl -i -X POST https://YOUR_DOMAIN/api/rafiki \
	-H "Content-Type: application/json" \
	-d '{}'
```

Expected: `400` with `Missing GraphQL query`.

## Project Structure

```
app/
├── index.tsx              # Redirects based on onboarding
├── _layout.tsx            # Root layout + AppProvider
├── (onboarding)/          # Welcome, Create Account, Preferences, All Set
├── (tabs)/                # Home, Send, Invest, Vision, Settings
├── budget.tsx             # Budget & expense tracker
└── modal.tsx              # Placeholder modal
```

## Screens

### Onboarding
1. **Welcome** – Value props, Get Started
2. **Create Account** – Phone, email, bank, trusted app options
3. **Set Preferences** – Language, assistance level, transparency
4. **You're all set** – Summary, Go to Dashboard

### Main App
- **Home** – Balance, quick actions, recent activity, Goodi, Budget link
- **Send** – Multi-step money transfer (email/phone, recent contacts)
- **Invest** – Get started, Learning Hub
- **Vision** – Financial Passport, Behavior Credit, Tax/SSN guidance
- **Settings** – Language, user mode, assistance, Goodi toggle, sign out

## Design

- Green accent (`#22c55e`) matching the v0 wireframe
- Light/dark mode support
- Clean, minimal UI for accessibility

## License

MIT
