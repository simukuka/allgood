import type { ReactNode } from "react";
import type { RefreshControlProps } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";

import { SCREEN_PADDING_H, SCROLL_BOTTOM_PADDING } from "@/constants/theme";
import { useThemeColors } from "@/hooks/useThemeColors";

interface ScreenLayoutProps {
  children: ReactNode;
  /** SafeAreaView edges (default: ["top", "bottom"]) */
  edges?: Edge[];
  /** Whether to wrap content in a ScrollView (default: true) */
  scroll?: boolean;
  /** Horizontal padding override (default: SCREEN_PADDING_H) */
  horizontalPadding?: number;
  /** Top padding for scroll content (default: 0) */
  topPadding?: number;
  /** Extra bottom padding (default: SCROLL_BOTTOM_PADDING) */
  bottomPadding?: number;
  /** Optional footer rendered below the scroll area */
  footer?: ReactNode;
  /** Optional overlay (e.g. absolutely-positioned elements like Goodi) */
  overlay?: ReactNode;
  /** Optional RefreshControl for pull-to-refresh */
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/**
 * Standard screen container with SafeAreaView + optional ScrollView.
 *
 * Centralizes the repeated pattern of:
 *   <SafeAreaView> <ScrollView contentContainerStyle={...}> ... </ScrollView> </SafeAreaView>
 */
export function ScreenLayout({
  children,
  edges = ["top", "bottom"],
  scroll = true,
  horizontalPadding = SCREEN_PADDING_H,
  topPadding = 0,
  bottomPadding = SCROLL_BOTTOM_PADDING,
  footer,
  overlay,
  refreshControl,
}: ScreenLayoutProps) {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={edges}
    >
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: topPadding,
              paddingBottom: bottomPadding,
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.container}>{children}</View>
      )}
      {footer}
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {},
});
