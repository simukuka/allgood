import { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface StaggerAnimationOptions {
  /** Number of items to animate */
  count: number;
  /** Delay between each item (default: 80) */
  staggerDelay?: number;
  /** Spring tension (default: 80) */
  tension?: number;
  /** Spring friction (default: 12) */
  friction?: number;
  /** Whether to start immediately (default: true) */
  autoStart?: boolean;
}

/**
 * Reusable staggered animation for lists of items.
 *
 * Returns `{ anims, start }`:
 * - `anims[i]` is an Animated.Value (0 → 1) for each item
 * - `start()` triggers the stagger if `autoStart` was false
 *
 * Example:
 *   const { anims } = useStaggerAnimation({ count: items.length });
 *   <Animated.View style={{ opacity: anims[i], transform: [{ scale: anims[i].interpolate(...) }] }} />
 */
export function useStaggerAnimation(options: StaggerAnimationOptions) {
  const {
    count,
    staggerDelay = 80,
    tension = 80,
    friction = 12,
    autoStart = true,
  } = options;

  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0)),
  ).current;

  const start = () => {
    Animated.stagger(
      staggerDelay,
      anims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension,
          friction,
          useNativeDriver: true,
        }),
      ),
    ).start();
  };

  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, []);

  return { anims, start };
}
