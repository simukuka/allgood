import { useRef } from "react";
import { Animated } from "react-native";

interface PressAnimationOptions {
  /** Scale value when pressed (default: 0.96) */
  pressedScale?: number;
  /** Spring tension (default: 100) */
  tension?: number;
  /** Spring friction (default: 10) */
  friction?: number;
}

/**
 * Reusable press scale animation for pressable elements.
 *
 * Returns `{ scaleAnim, handlePressIn, handlePressOut }`.
 *
 * Usage:
 *   <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
 *     <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
 */
export function usePressAnimation(options: PressAnimationOptions = {}) {
  const { pressedScale = 0.96, tension = 100, friction = 10 } = options;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: pressedScale,
      tension,
      friction,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension,
      friction,
      useNativeDriver: true,
    }).start();
  };

  return { scaleAnim, handlePressIn, handlePressOut };
}

/**
 * Creates multiple press animations for a list of items.
 */
export function usePressAnimations(
  count: number,
  options: PressAnimationOptions = {},
) {
  const { pressedScale = 0.96, tension = 100, friction = 10 } = options;

  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(1)),
  ).current;

  const handlePressIn = (index: number) => {
    Animated.spring(anims[index], {
      toValue: pressedScale,
      tension,
      friction,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (index: number) => {
    Animated.spring(anims[index], {
      toValue: 1,
      tension,
      friction,
      useNativeDriver: true,
    }).start();
  };

  return { anims, handlePressIn, handlePressOut };
}
