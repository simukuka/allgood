/**
 * SkeletonBox — a shimmering placeholder shown while data is loading.
 * Uses a pulsing opacity animation for a subtle loading effect.
 */
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type ViewStyle } from "react-native";

import { useThemeColors } from "@/hooks/useThemeColors";

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const colors = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
