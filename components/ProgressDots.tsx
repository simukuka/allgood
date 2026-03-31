import { StyleSheet, View } from "react-native";

import { useThemeColors } from "@/hooks/useThemeColors";

interface ProgressDotsProps {
  /** Current step (1-based) */
  step: number;
  /** Total number of steps */
  total: number;
}

export function ProgressDots({ step, total }: ProgressDotsProps) {
  const colors = useThemeColors();

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
    >
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <View
          key={s}
          style={[
            styles.dot,
            s <= step
              ? { backgroundColor: colors.primary, width: 28 }
              : { backgroundColor: colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    marginBottom: 28,
  },
  dot: {
    height: 4,
    width: 20,
    borderRadius: 2,
  },
});
