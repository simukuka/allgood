import { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface EntranceAnimationOptions {
  /** Duration for the fade-in (default: 400) */
  duration?: number;
  /** Starting Y offset for the slide (default: 20) */
  slideDistance?: number;
  /** Whether to use spring for the slide (default: true) */
  useSpring?: boolean;
  /** Spring tension (default: 80) */
  tension?: number;
  /** Spring friction (default: 12) */
  friction?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Reusable entrance animation: fade-in + slide-up.
 *
 * Returns `{ fadeAnim, slideAnim }` — apply them:
 *   style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
 */
export function useEntranceAnimation(options: EntranceAnimationOptions = {}) {
  const {
    duration = 400,
    slideDistance = 20,
    useSpring = true,
    tension = 80,
    friction = 12,
    onComplete,
  } = options;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(slideDistance)).current;

  useEffect(() => {
    const slideAnimation = useSpring
      ? Animated.spring(slideAnim, {
          toValue: 0,
          tension,
          friction,
          useNativeDriver: true,
        })
      : Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      slideAnimation,
    ]).start(onComplete ? () => onComplete() : undefined);
  }, []);

  return { fadeAnim, slideAnim };
}
