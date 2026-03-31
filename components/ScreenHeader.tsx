import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontSizes, fontWeights, spacing } from "@/constants/theme";
import { useThemeColors } from "@/hooks/useThemeColors";

interface ScreenHeaderProps {
  /** Screen title */
  title: string;
  /** Whether to show a back button (default: true) */
  showBack?: boolean;
  /** Custom back action (default: router.back()) */
  onBack?: () => void;
  /** Optional right-side element */
  right?: React.ReactNode;
}

/**
 * Standard screen header with back button + centered title.
 *
 * Centralizes the repeated pattern of:
 *   <View style={headerRow}>
 *     <Pressable onPress={router.back}><Ionicons name="arrow-back" /></Pressable>
 *     <Text>{title}</Text>
 *     <View style={{ width: 36 }} />
 *   </View>
 */
export function ScreenHeader({
  title,
  showBack = true,
  onBack,
  right,
}: ScreenHeaderProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.headerRow}>
      {showBack ? (
        <Pressable
          onPress={onBack ?? (() => router.back())}
          style={[styles.backBtn, { backgroundColor: colors.cardBg }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  spacer: {
    width: 36,
  },
});
