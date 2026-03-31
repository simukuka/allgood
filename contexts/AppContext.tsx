import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";

const ONBOARDING_KEY = "@allgood_onboarding_complete";
const PREFS_KEY = "@allgood_preferences";

export type Language = "en" | "es" | "pt";
export type AssistanceLevel = "minimal" | "standard" | "guided";
export type TransparencyLevel = "full" | "simple";
export type UserMode = "child" | "adult" | "senior";
export type ThemePreference = "system" | "light" | "dark";
export type ThemeColor = "teal" | "blue" | "coral";
export type TextSize = "small" | "medium" | "large";

export interface UserPreferences {
  language: Language;
  assistanceLevel: AssistanceLevel;
  transparency: TransparencyLevel;
  userMode: UserMode;
  signInMethod?: string;
  goodiEnabled: boolean;
  theme: ThemePreference;
  themeColor: ThemeColor;
  textSize: TextSize;
  textSizeUpdateKey: number; // Force re-renders when text size changes
}

const defaultPrefs: UserPreferences = {
  language: "en",
  assistanceLevel: "standard",
  transparency: "full",
  userMode: "adult",
  goodiEnabled: true,
  theme: "system",
  themeColor: "teal",
  textSize: "medium",
  textSizeUpdateKey: 0,
};

interface AppContextType {
  onboardingComplete: boolean | null;
  setOnboardingComplete: (complete: boolean) => Promise<void>;
  preferences: UserPreferences;
  setPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  userName: string;
  setUserName: (name: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [onboardingComplete, setOnboardingCompleteState] = useState<
    boolean | null
  >(null);
  const [preferences, setPreferencesState] =
    useState<UserPreferences>(defaultPrefs);
  const [userName, setUserName] = useState("");

  // Pull user identity from auth profile first, with metadata/email fallback.
  const { profile, user } = useAuth();

  useEffect(() => {
    if (profile?.full_name) {
      const firstName = profile.full_name.split(" ")[0];
      setUserName(firstName);
      return;
    }

    const metadataName =
      typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "";

    if (metadataName) {
      setUserName(metadataName.split(" ")[0]);
      return;
    }

    if (user?.email) {
      setUserName(user.email.split("@")[0]);
    }
  }, [profile?.full_name, user?.email, user?.user_metadata?.full_name]);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setOnboardingCompleteState(value === "true");
    });
    AsyncStorage.getItem(PREFS_KEY).then((value) => {
      if (value) {
        try {
          setPreferencesState({ ...defaultPrefs, ...JSON.parse(value) });
        } catch (_) {}
      }
    });
  }, []);

  const setOnboardingComplete = async (complete: boolean) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, String(complete));
    setOnboardingCompleteState(complete);
  };

  const setPreferences = async (prefs: Partial<UserPreferences>) => {
    const next = { 
      ...preferences, 
      ...prefs,
      // Increment update key if text size is being changed
      textSizeUpdateKey: prefs.textSize && prefs.textSize !== preferences.textSize 
        ? (preferences.textSizeUpdateKey || 0) + 1 
        : preferences.textSizeUpdateKey || 0
    };
    setPreferencesState(next);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Optionally revert the state if save failed
      // setPreferencesState(preferences);
    }
  };

  return (
    <AppContext.Provider
      value={{
        onboardingComplete,
        setOnboardingComplete,
        preferences,
        setPreferences,
        userName,
        setUserName,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
