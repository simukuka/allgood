import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { AppProvider, useApp } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useSystemColorScheme } from "@/hooks/useColorScheme";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(onboarding)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <AppProvider>
        <RootLayoutNav />
      </AppProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const systemScheme = useSystemColorScheme();
  const { preferences } = useApp();
  const colorScheme =
    preferences.theme === "system" ? systemScheme : preferences.theme;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 340,
          gestureEnabled: true,
          gestureDirection: "horizontal",
          // Smooth card-style for all pushes
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index"        options={{ animation: "fade", animationDuration: 300 }} />
        <Stack.Screen name="(onboarding)" options={{ animation: "fade", animationDuration: 300 }} />
        <Stack.Screen name="(tabs)"       options={{ animation: "fade", animationDuration: 320 }} />
        <Stack.Screen name="reset-password" options={{ animation: "fade" }} />
        {/* Modal-style sheets */}
        <Stack.Screen name="send-amount"  options={{ animation: "slide_from_bottom", animationDuration: 360 }} />
        <Stack.Screen name="send-confirm" options={{ animation: "slide_from_bottom", animationDuration: 360 }} />
        <Stack.Screen name="transfer-status" options={{ animation: "fade_from_bottom", animationDuration: 400 }} />
        {/* Detail pushes */}
        <Stack.Screen name="deposit" options={{ animation: "slide_from_bottom", animationDuration: 360 }} />
        <Stack.Screen name="bank-accounts" options={{ animation: "slide_from_bottom", animationDuration: 360 }} />
        <Stack.Screen name="trusted-contacts" options={{ animation: "slide_from_bottom", animationDuration: 360 }} />
        <Stack.Screen name="budget" />
        <Stack.Screen name="cards" />
        <Stack.Screen name="portfolio" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="request" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="learning-hub" />
        <Stack.Screen name="transaction-detail" />
        <Stack.Screen name="financial-passport" options={{ animation: "slide_from_bottom", animationDuration: 360 }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", animation: "slide_from_bottom", animationDuration: 380 }}
        />
      </Stack>
    </ThemeProvider>
  );
}
