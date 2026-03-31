import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

import type { Database } from "./database.types";

// ──────────────────────────────────────────────────────────────
// Supabase credentials are read from environment variables.
// Create a .env file in the project root with:
//   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
// ──────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "YOUR_ANON_KEY";

export const isSupabaseConfigured =
  !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
  SUPABASE_ANON_KEY !== "YOUR_ANON_KEY";

export const supabaseConfigErrorMessage =
  "Supabase is not configured. Create a .env file from .env.example, add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.";

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️  Supabase credentials not configured. " +
      "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.",
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Required for React Native
    },
  },
);
