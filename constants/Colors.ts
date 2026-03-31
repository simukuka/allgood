// All Good - Premium fintech palette with theme color support
import type { ColorSchemeName } from "react-native";

// ─── Theme color palettes ────────────────────────────────────
const palettes = {
  teal: {
    primary: "#00C98C",
    primaryLight: "#33D9A8",
    primaryDark: "#007A5A",
    gradientStart: "#00D49A",
    gradientEnd: "#00895F",
    gradientAccent: ["#00D49A", "#00895F"] as readonly string[],
    shadowColorAccent: "#00C98C",
  },
  blue: {
    primary: "#3b82f6",
    primaryLight: "#60a5fa",
    primaryDark: "#2563eb",
    gradientStart: "#4f8ef7",
    gradientEnd: "#1d4ed8",
    gradientAccent: ["#4f8ef7", "#1d4ed8"] as readonly string[],
    shadowColorAccent: "#3b82f6",
  },
  coral: {
    primary: "#f97316",
    primaryLight: "#fb923c",
    primaryDark: "#ea580c",
    gradientStart: "#fb8c2a",
    gradientEnd: "#d94f00",
    gradientAccent: ["#fb8c2a", "#d94f00"] as readonly string[],
    shadowColorAccent: "#f97316",
  },
} as const;

export type ThemeColorKey = keyof typeof palettes;

// ─── Base colors (theme-color-independent) ───────────────────
const baseLight = {
  text: "#111827",
  textSecondary: "#6b7280",
  textTertiary: "#9ca3af",
  background: "#f5f8f6",
  cardBg: "#ffffff",
  cardBgElevated: "#ffffff",
  border: "#e5e7eb",
  borderLight: "#f0f4f1",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
  gradientCard: ["#1a2b38", "#0d1a22"] as readonly string[],
  gradientHero: ["#edfaf4", "#d1fae5", "#a7f3d0"] as readonly string[],
  overlay: "rgba(0,0,0,0.04)",
  glass: "rgba(255,255,255,0.75)",
  shadowColor: "#000",
};

const baseDark = {
  text: "#f9fafb",
  textSecondary: "#9ca3af",
  textTertiary: "#6b7280",
  background: "#0a0f1a",
  cardBg: "#141c2b",
  cardBgElevated: "#1e293b",
  border: "#1e293b",
  borderLight: "#1e293b",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
  gradientCard: ["#1e293b", "#0f172a"] as readonly string[],
  gradientHero: ["#0a0f1a", "#0f172a", "#111827"] as readonly string[],
  overlay: "rgba(255,255,255,0.03)",
  glass: "rgba(30,41,59,0.8)",
  shadowColor: "#000",
};

// ─── Build full color set ────────────────────────────────────
function buildColors(base: typeof baseLight, palette: typeof palettes.teal) {
  return {
    ...base,
    ...palette,
    tint: palette.primary,
    tabIconDefault: base.textTertiary,
    tabIconSelected: palette.primary,
  };
}

export type AppColors = ReturnType<typeof buildColors>;

/**
 * Get colors for a given color scheme and theme color.
 * `themeColor` defaults to "teal" for backward compatibility.
 */
export function getColors(
  scheme: ColorSchemeName,
  themeColor: ThemeColorKey = "teal",
) {
  const base = scheme === "dark" ? baseDark : baseLight;
  const palette = (palettes[themeColor] ?? palettes.teal) as typeof palettes.teal;
  return buildColors(base, palette);
}

export default palettes;
