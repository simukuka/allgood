import { useEffect, useState } from "react";
import type { ColorSchemeName } from "react-native";

function useSystemScheme(): ColorSchemeName {
  const [scheme, setScheme] = useState<ColorSchemeName>(
    typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) =>
      setScheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return scheme;
}

// Re-export raw system hook for root layout
export { useSystemScheme as useSystemColorScheme };

// Theme-aware hook — checks user preference first
export function useColorScheme(): ColorSchemeName {
  const systemScheme = useSystemScheme();
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
