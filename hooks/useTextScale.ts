import { useMemo } from "react";

import type { TextSize } from "@/contexts/AppContext";
import { useApp } from "@/contexts/AppContext";

const SCALE_MAP: Record<TextSize, number> = {
  small: 0.88,
  medium: 1,
  large: 1.18,
};

/**
 * Returns a function `fs(baseSize)` that scales a base font size
 * according to the user's text-size preference.
 *
 * Usage:
 *   const fs = useTextScale();
 *   <Text style={{ fontSize: fs(16) }}>Hello</Text>
 */
export function useTextScale() {
  const { preferences } = useApp();
  const scale = SCALE_MAP[preferences.textSize] ?? 1;

  return useMemo(() => {
    return (base: number) => Math.round(base * scale);
  }, [scale, preferences.textSizeUpdateKey]); // Use update key to force re-renders
}
