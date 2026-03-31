import { Session, User } from "@supabase/supabase-js";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

import type { Profile } from "@/lib/database.types";
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigErrorMessage,
} from "@/lib/supabase";
import { provisionUserWallet } from "@/lib/rafiki-wallet";

// ─── Types ───────────────────────────────────────────────────
interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (
    email: string,
    password: string,
    fullName: string,
    details?: { phone?: string; country?: string; idType?: string; dob?: string; idNumber?: string },
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthErrorMessage(rawMessage: string): string {
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "Too many signup emails were requested. Please wait a few minutes, then try again, or use Sign in / Forgot password.";
  }

  if (normalized.includes("user already registered")) {
    return "This email already has an account. Please sign in instead.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }

  if (normalized.includes("failed to fetch")) {
    return "Unable to reach Supabase. Check your internet connection and Supabase settings.";
  }

  return rawMessage;
}

// ─── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
  });

  // Cache of user IDs already bootstrapped this session — prevents re-running
  // SELECT queries + Rafiki provisioning on every auth state change event.
  const bootstrappedUsers = useRef(new Set<string>());

  // Fetch profile from `profiles` table
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Failed to fetch profile:", error.message);
      return null;
    }
    return data as Profile;
  }, []);

  const ensureUserBootstrap = useCallback(async (user: User) => {
    // Skip if already bootstrapped in this session
    if (bootstrappedUsers.current.has(user.id)) return;

    const fullNameFromMeta =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

    const fallbackName =
      fullNameFromMeta || user.email?.split("@")[0] || "AllGood User";
    const phoneFromMeta =
      typeof user.user_metadata?.phone === "string"
        ? user.user_metadata.phone
        : null;
    const countryFromMeta =
      typeof user.user_metadata?.country === "string"
        ? user.user_metadata.country
        : null;
    const dobFromMeta =
      typeof user.user_metadata?.dob === "string"
        ? user.user_metadata.dob
        : null;
    const idTypeFromMeta =
      typeof user.user_metadata?.id_type === "string"
        ? user.user_metadata.id_type
        : null;

    const { data: existingProfile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileFetchError) {
      console.warn("Profile check failed:", profileFetchError.message);
    }

    if (!existingProfile) {
      const { error: upsertProfileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? "",
            full_name: fallbackName,
            phone: phoneFromMeta,
            country: countryFromMeta,
            dob: dobFromMeta,
            id_type: idTypeFromMeta,
            currency: "USD",
          },
          { onConflict: "id" },
        );

      if (upsertProfileError) {
        console.warn("Profile upsert failed:", upsertProfileError.message);
      }
    }

    // Provision a Rafiki wallet for new users (no-op if already done or not configured)
    // Errors here are non-fatal — sign-in should always succeed regardless
    try {
      await provisionUserWallet(user.id, fallbackName);
    } catch {
      // silently skip — wallet will be provisioned on next sign-in
    }

    const { data: checkingAccount, error: accountFetchError } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("account_type", "checking")
      .maybeSingle();

    if (accountFetchError) {
      console.warn("Account check failed:", accountFetchError.message);
    }

    if (!checkingAccount) {
      const { error: insertAccountError } = await supabase.from("accounts").upsert(
        {
          user_id: user.id,
          balance: 0,
          currency: "USD",
          account_type: "checking",
        },
        { onConflict: "user_id,account_type" },
      );

      if (insertAccountError) {
        console.warn("Account upsert failed:", insertAccountError.message);
      }
    }

    // Mark as bootstrapped so subsequent auth events skip all of the above
    bootstrappedUsers.current.add(user.id);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let profile: Profile | null = null;
      if (session?.user) {
        await ensureUserBootstrap(session.user);
        profile = await fetchProfile(session.user.id);
      }
      setState({
        session,
        user: session?.user ?? null,
        profile,
        isLoading: false,
      });
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      let profile: Profile | null = null;
      if (session?.user) {
        await ensureUserBootstrap(session.user);
        profile = await fetchProfile(session.user.id);
      }
      setState({
        session,
        user: session?.user ?? null,
        profile,
        isLoading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, [ensureUserBootstrap, fetchProfile]);

  // ─── Auth methods ──────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    details?: { phone?: string; country?: string; idType?: string; dob?: string; idNumber?: string },
  ): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      return { error: supabaseConfigErrorMessage };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: details?.phone ?? null,
          country: details?.country ?? null,
          id_type: details?.idType ?? null,
          dob: details?.dob ?? null,
          id_number: details?.idNumber ?? null,
        },
      },
    });

    if (error) return { error: mapAuthErrorMessage(error.message) };

    return { error: null };
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      return { error: supabaseConfigErrorMessage };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: mapAuthErrorMessage(error.message) };
    return { error: null };
  };

  const signOut = async () => {
    // Clear state immediately so the UI reacts right away
    setState({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
    });
    // Fire-and-forget — don't let a slow/failed network call block navigation
    supabase.auth.signOut().catch(() => {});
  };

  const resetPassword = async (
    email: string,
  ): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      return { error: supabaseConfigErrorMessage };
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "allgood://reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) return { error: mapAuthErrorMessage(error.message) };
    return { error: null };
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, profile }));
  };

  const updateProfile = async (
    data: Partial<Profile>,
  ): Promise<{ error: string | null }> => {
    if (!state.user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", state.user.id);

    if (error) return { error: error.message };

    await refreshProfile();
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
