import type { ColorSchemeName } from "react-native";
import { useColorScheme as useRNColorScheme } from "react-native";

// Re-export the raw hook for the root layout
export { useRNColorScheme as useSystemColorScheme };

// Theme-aware hook — checks user preference first
export function useColorScheme(): ColorSchemeName {
  const systemScheme = useRNColorScheme();
  // We try to read the theme from AppContext, but this hook
  // can be called outside the provider (e.g. root layout),
  // so we fall back to system scheme if context isn't available.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useApp } = require("@/contexts/AppContext");
    const { preferences } = useApp();
    if (preferences?.theme && preferences.theme !== "system") {
      return preferences.theme;
    }
  } catch (_) {}
  return systemScheme;
}
