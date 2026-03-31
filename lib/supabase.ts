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

const isWeb = typeof window !== "undefined";

const webStorage = {
  getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const noOpLock = async <T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>,
) => fn();

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
      storage: isWeb ? webStorage : AsyncStorage,
      autoRefreshToken: !isWeb,
      persistSession: true,
      detectSessionInUrl: isWeb,
      lock: noOpLock,
    },
  },
);
