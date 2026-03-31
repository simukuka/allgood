import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColors } from "@/hooks/useThemeColors";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  focused: boolean;
}) {
  const colors = useThemeColors();
  const progress = useSharedValue(props.focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(props.focused ? 1 : 0, {
      stiffness: 220,
      damping: 16,
      mass: 0.8,
    });
  }, [props.focused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [0.5, 1]) },
      { scaleY: interpolate(progress.value, [0, 1], [0.75, 1]) },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.15]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -2]) },
    ],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <View style={tabIconStyles.wrap}>
      {/* Active background pill */}
      <Animated.View style={[tabIconStyles.activeBg, pillStyle]}>
        <LinearGradient
          colors={
            [colors.primary + "28", colors.primary + "10"] as [string, string]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={tabIconStyles.activeBgGradient}
        />
      </Animated.View>
      <Animated.View style={iconStyle}>
        <Ionicons size={21} name={props.name} color={props.color} />
      </Animated.View>
      {/* Active dot indicator */}
      <Animated.View
        style={[
          tabIconStyles.dot,
          { backgroundColor: colors.primary },
          dotStyle,
        ]}
      />
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrap: {
    width: 48,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBg: {
    position: "absolute",
    width: 48,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  activeBgGradient: {
    flex: 1,
    borderRadius: 18,
  },
  dot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const { preferences } = useApp();
  const { user, isLoading } = useAuth();
  const t = useTranslation(preferences.language);

  if (!isLoading && !user) {
    return <Redirect href="/(onboarding)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 24 : 16,
          left: 20,
          right: 20,
          backgroundColor: colorScheme === "dark" ? "#141c2b" : "#ffffff",
          borderRadius: 24,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          borderTopWidth: 0,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: colorScheme === "dark" ? 0.3 : 0.18,
          shadowRadius: 28,
          elevation: 14,
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: t("send"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="paper-plane" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="invest"
        options={{
          title: t("invest"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="trending-up" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="vision"
        options={{
          title: t("vision"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="eye" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
