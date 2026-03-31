import { getColors } from "@/constants/Colors";
import { useApp } from "@/contexts/AppContext";
import { useColorScheme } from "@/hooks/useColorScheme";

/**
 * Returns the full color palette based on the current color scheme
 * AND the user's chosen theme color (teal / blue / coral).
 */
export function useThemeColors() {
  const colorScheme = useColorScheme();
  const { preferences } = useApp();
  return getColors(colorScheme, preferences.themeColor);
}
