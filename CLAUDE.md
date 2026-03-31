# AllGood (Rafiki) — Claude Code Guide

## What this app is

AllGood is a React Native fintech app built with Expo (SDK 55) targeting **immigrants and underbanked communities**. It solves expensive remittances, missing US credit history, and confusing financial systems. The payment layer is branded **Rafiki** (Swahili for *friend*) and runs on the Interledger Protocol.

**Primary users:** Immigrants  
**Secondary users:** Older adults — accessibility is a first-class concern, not an afterthought

---

## Landing / marketing screen — build this with intent

> **This is the most important screen in the app.** It is a sales page. A potential client, investor, or new user lands here and decides in 5 seconds whether AllGood is worth their trust. It must be visually stunning, emotionally resonant, and convert.

### What it must do
- **Sell the product.** Every section exists to answer: *"Why should I trust this app with my money?"*
- **Feel premium.** Vibrant gradients, bold typography, fluid animations — this is not a settings screen. Push the design.
- **Tell a story.** The scroll is a narrative arc: problem → solution → proof → action.

### Scroll narrative structure
```
1. Hero         — Bold headline, emotional hook, gradient background
2. Problem      — "You deserve better than this" — name the pain immigrants feel
3. Features     — Card-flip showcase, one card per feature, tap to reveal detail
4. Social proof — Stats: users, countries, transfer volume, avg savings
5. How it works — 3-step visual: Sign up → Connect → Send / Save
6. Trust marks  — ITIN accepted, no hidden fees, ILP-powered, multilingual
7. CTA          — Full-width gradient block, primary + ghost button
```

### Animation requirements — use Reanimated v4 throughout
- **Hero:** Parallax background tied to `scrollY`. Headline words stagger-fade in on mount.
- **Feature cards:** Each card flips on press (Y-axis, `rotateY` 0°→180°). Front face shows icon + title. Back face shows full description. Use `backfaceVisibility: 'hidden'` on both faces.
- **Section reveals:** Every section fades in + slides up (`translateY` 40→0) as it enters the viewport. Stagger children by 100ms each.
- **Stats counter:** Numbers count up from 0 when the stats section scrolls into view. Use `withTiming` on a shared value feeding a derived display string.
- **CTA block:** Scale pulse (`1.0 → 1.03 → 1.0`) on mount to draw attention. Primary button has a shimmer sweep on idle.

### Copy to use (do not change the voice — warm, direct, empowering)

**Hero headline:** `Your money,\nyour world.`  
**Hero sub:** `Send home. Build credit. Learn the system.\nNo SSN required.`  
**Problem section headline:** `The system wasn't built for you.`  
**Problem body:** `Banks turn you away. Transfers bleed your paycheck. Credit scores reset at the border. AllGood was built to fix all of that.`  
**CTA headline:** `Ready to take control?`  
**CTA sub:** `Join thousands of immigrants building their financial future.`  
**Primary button:** `Create free account`  
**Ghost button:** `I already have an account`

### Feature cards — front / back content

| Front title | Front sub | Back (revealed on flip) |
|---|---|---|
| Financial Passport | Your credit travels with you | Transfer your credit history internationally. Never start from zero again. |
| Send with Rafiki | Live rates. Real tracking. | Send money home in seconds. Live FX, real-time status, fees that don't sting. |
| Credit Builder | No SSN? No problem. | Build US credit with your ITIN. Rent, utilities, secured cards — all reported. |
| Cash Near You | Find deposits on a live map | Walk in with cash, deposit in seconds. We show you where. |
| Learning Hub | Finance in your language | Taxes, ITIN filing, budgeting — explained simply in English, Spanish, and Portuguese. |

### Stats to display (animate these counting up)
- **200,000+** people helped
- **47** currencies supported
- **$0** monthly fees
- **6** languages

### Visual style
- Background: deep gradient `#7F77DD → #D4537E → #D85A30` for hero and CTA
- Feature cards: each card has its own accent color (purple, teal, coral, pink, gray)
- Typography: hero headline 42px extrabold, section headlines 26px bold, body 15px regular
- All animations use `useNativeDriver: true` equivalent — run on UI thread via Reanimated worklets
- `expo-linear-gradient` for all gradient surfaces
- `expo-haptics` on card flip and button press

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.83 + Expo SDK 55 |
| Routing | Expo Router (file-based, typed routes enabled) |
| Backend / DB | Supabase (auth + postgres + storage) |
| Language | TypeScript 5.9 |
| Animations | `react-native-reanimated` v4 + `react-native-worklets` |
| Payments | Interledger Protocol via Rafiki network |
| FX rates | `lib/exchange-rates.ts` — fetch live, never cache >60s for active transfers |
| i18n | `constants/i18n.ts` — English, Spanish, Portuguese (⚠ fix duplicate PT keys: `upcoming`, `recurring`, `monthly`, `weekly`) |
| State | `contexts/AppContext.tsx` + `contexts/AuthContext.tsx` |

---

## Project structure

```
app/
  (onboarding)/         Onboarding + landing / marketing screen
  (tabs)/               index, invest, send, settings, vision
  send/
    amount.tsx
    confirm.tsx
    status.tsx          transfer tracking: pending → processing → completed
  budget.tsx
  cards.tsx
  portfolio.tsx

components/
  ui/                   Button, Card, Input, Badge, SkeletonBox
  ScreenLayout.tsx      wrap every screen with this
  ScreenHeader.tsx      consistent headers
  AnimatedSection.tsx   scroll-reveal wrapper (fade + slide up)
  ErrorBoundary.tsx     root-level — catches all unhandled exceptions
  FeatureCard.tsx
  SkeletonBox.tsx

constants/
  theme.ts              spacing, radii, fontSizes, fontWeights, shadows, sharedStyles
  Colors.ts             light/dark palette — consumed via useThemeColors()
  i18n.ts

contexts/
  AppContext.tsx
  AuthContext.tsx

hooks/                  useAnimations, useThemeColors, useTextScale

lib/
  supabase.ts           Supabase client — MUST use env vars
  data.ts
  biometrics.ts         expo-local-authentication wrapper
  haptics.ts
  exchange-rates.ts

supabase/
  migration.sql

utils/
  formatCurrency.ts     supports USD, MXN, BRL, COP, GTQ, HNL
```

---

## Design system

Always use tokens from `constants/theme.ts` — **never hardcode spacing, font sizes, radii, or colors**.

```
Spacing:     spacing.xs / sm / md / lg / xl / 2xl / 3xl / 4xl / 5xl
Radii:       radii.sm / md / lg / xl / 2xl / full
Font sizes:  fontSizes.xs → fontSizes["5xl"]
Font weights: fontWeights.normal / medium / semibold / bold / extrabold
Shadows:     shadows.sm / md / lg
Shared:      sharedStyles (screen, card, row, header, input, …)
Constants:   SCREEN_PADDING_H = 28 | TAB_BAR_HEIGHT = 80
```

Colors come exclusively from `useThemeColors()` — never hardcode hex values.

---

## Key conventions

- Wrap every screen in `<ScreenLayout>` + `<ScreenHeader>` for consistent structure
- Use `<Button>` from `components/Button.tsx` for all tappable actions
- Use `<SkeletonBox>` for all loading states — never show empty/null UI while fetching
- Haptic feedback via `lib/haptics.ts`
- Biometric auth via `lib/biometrics.ts` (Face ID / Touch ID on app launch + transaction confirm)
- All Supabase calls go through `lib/supabase.ts`
- Add `accessibilityLabel` to every interactive element — required for older users and screen readers

---

## Critical rules — always follow these

### 1. Never hardcode Supabase credentials
```ts
// WRONG
const supabase = createClient('https://xxx.supabase.co', 'eyJ...')

// RIGHT — copy .env.example → .env and fill in values before running
import Constants from 'expo-constants'
const supabase = createClient(
  Constants.expoConfig.extra.supabaseUrl,
  Constants.expoConfig.extra.supabaseAnonKey
)
```

### 2. Never swallow errors in financial flows
```ts
// WRONG — send/confirm.tsx currently does this, it is a bug
try { await transfer() } catch { showSuccess() }

// RIGHT
try {
  await transfer()
  showSuccess()
} catch (err) {
  showError(err.message)   // always surface to user
  logError(err)
}
```

### 3. Always use Reanimated v4, not legacy Animated
```ts
// WRONG
import { Animated } from 'react-native'

// RIGHT
import Animated, { useSharedValue, withTiming, useAnimatedStyle }
  from 'react-native-reanimated'
```

### 4. All transfer amounts are integer cents — never floats
```ts
// WRONG
amount: 12.50

// RIGHT
amount: 1250   // cents
```

### 5. Never use alert() — use the app Toast component
```ts
// WRONG
alert('Something went wrong')

// RIGHT
showToast({ type: 'error', message: 'Something went wrong' })
```

---

## Auth & identity

- **Accepted IDs at sign-up:** SSN, ITIN, Matrícula Consular, foreign passport
- SSN is **never required** — don't block sign-up for users without one
- Password reset: `supabase.auth.resetPasswordForEmail()` — P0, not yet implemented
- Biometric login: `lib/biometrics.ts` wraps `expo-local-authentication`

---

## Feature phases

| Priority | Feature | Status |
|---|---|---|
| P0 | Supabase env vars | done |
| P0 | Fix silent error swallowing in send flow | in progress |
| P0 | Forgot password flow | todo |
| P0 | Biometric login on launch + confirm | todo |
| P1 | Live FX rates wired up | todo |
| P1 | Transfer status screen (pending → complete) | todo |
| P1 | ITIN support in onboarding | todo |
| P1 | Skeleton loading states everywhere | todo |
| P2 | Document vault (Supabase Storage, encrypted) | backlog |
| P2 | Credit-building tools + credit score education | backlog |
| P2 | Cash deposit location map (expo-location) | backlog |
| P2 | Wire up scheduled transfers to DB | backlog |
| P3 | Tax filing guidance (Jan–Apr seasonal) | backlog |
| P3 | Family / community shared accounts | backlog |
| P3 | Immigration-aware notifications | backlog |

---

## Running the app

```bash
cp .env.example .env   # fill in Supabase credentials first
npm start              # Expo dev server
npm run ios            # iOS simulator
npm run android        # Android emulator
npm run web            # Web browser
```

---

## What NOT to do

- Do not add npm packages without checking Expo SDK 55 compatibility
- Do not generate or display mock financial data as if it were real
- Do not store PII in AsyncStorage unencrypted
- Do not nest `ScrollView` inside `ScrollView` — gesture conflicts on Android
- Do not use `position: 'absolute'` for layout — use flexbox
- Do not use `Goodi.tsx` Animated API code — migrate to Reanimated v4