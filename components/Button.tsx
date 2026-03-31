import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

import { useThemeColors } from "@/hooks/useThemeColors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  showArrow?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  showArrow = true,
  style,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { stiffness: 100, damping: 10 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 100, damping: 10 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <>
      <Text style={[styles.text, { color: isPrimary ? "#fff" : colors.text }]}>
        {title}
      </Text>
      {showArrow && (
        <Ionicons
          name="arrow-forward"
          size={18}
          color={isPrimary ? "#fff" : colors.text}
        />
      )}
    </>
  );

  return (
    <Animated.View
      style={[
        animatedStyle,
        style,
        { width: style?.flex ? undefined : "100%" },
        style?.flex ? { flex: style.flex } : {},
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled }}
        style={[disabled && { opacity: 0.5 }]}
      >
        {isPrimary ? (
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, styles.shadow]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.button,
              variant === "secondary" && { backgroundColor: colors.cardBg },
              isOutline && {
                backgroundColor: "transparent",
                borderWidth: 1.5,
                borderColor: colors.border,
              },
            ]}
          >
            {content}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
    width: "100%",
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  shadow: {
    shadowColor: "#00C98C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
