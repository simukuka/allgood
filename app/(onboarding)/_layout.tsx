import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "ios",
        gestureEnabled: true,
        animationDuration: 340,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index"        options={{ animation: "fade", animationDuration: 300, gestureEnabled: false }} />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="auth"         options={{ animation: "ios" }} />
      <Stack.Screen name="login"        options={{ animation: "ios" }} />
      <Stack.Screen name="signup"       options={{ animation: "ios" }} />
      <Stack.Screen name="preferences"  options={{ animation: "fade_from_bottom", animationDuration: 380 }} />
      <Stack.Screen name="all-set"      options={{ animation: "fade_from_bottom", animationDuration: 420 }} />
    </Stack>
  );
}
