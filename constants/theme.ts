/**
 * AllGood shared design system.
 *
 * Centralizes spacing, typography, border radii, shadows, and common
 * component styles so screens don't have to duplicate them.
 */
import { StyleSheet } from "react-native";

// ─── Spacing scale ───────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
} as const;

// ─── Border radii ────────────────────────────────────────────
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

// ─── Font weights ────────────────────────────────────────────
export const fontWeights = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

// ─── Font sizes ──────────────────────────────────────────────
export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 18,
  "2xl": 22,
  "3xl": 28,
  "4xl": 40,
  "5xl": 48,
};

// ─── Shadows ─────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

// ─── Screen padding ──────────────────────────────────────────
export const SCREEN_PADDING_H = spacing["3xl"]; // 28
export const TAB_BAR_HEIGHT = 80;
export const SCROLL_BOTTOM_PADDING = 140;

// ─── Shared component styles ─────────────────────────────────
export const sharedStyles = StyleSheet.create({
  // Screen containers
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING_H,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  scrollContentCompact: {
    paddingHorizontal: SCREEN_PADDING_H,
    paddingBottom: spacing["5xl"],
  },

  // Cards
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing["2xl"],
  },
  cardCompact: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },

  // Headers
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  screenTitle: {
    fontSize: fontSizes["3xl"],
    fontWeight: fontWeights.extrabold,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },

  // Section titles
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
    marginBottom: spacing.md + 2,
  },

  // Footer
  footer: {
    padding: SCREEN_PADDING_H,
    paddingBottom: spacing["4xl"],
    gap: spacing.md,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  // Avatars
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: spacing.xl,
    gap: 10,
  },
  emptyTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  emptyDesc: {
    fontSize: fontSizes.sm,
    textAlign: "center",
    lineHeight: 20,
  },

  // Step dots
  stepDots: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing["5xl"],
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
    flex: 1,
  },

  // Error box
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSizes.md,
    flex: 1,
    lineHeight: 20,
  },

  // Input
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: fontSizes.xs + 1,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
    marginLeft: 2,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  input: {
    fontSize: fontSizes.lg,
    paddingHorizontal: spacing.xl - 2,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
  },
});

// ─── Skeleton animation helpers ──────────────────────────────
export const SKELETON_LIGHT = "#e5e7eb";
export const SKELETON_DARK = "#1e293b";
