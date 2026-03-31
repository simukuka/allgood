import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { ScreenLayout } from "@/components/ScreenLayout";
import { supabase } from "@/lib/supabase";

function extractValueFromUrl(url: string, key: string): string | null {
  const queryPart = url.split("?")[1]?.split("#")[0] ?? "";
  const hashPart = url.split("#")[1] ?? "";
  const combined = `${queryPart}&${hashPart}`;
  const params = new URLSearchParams(combined);
  return params.get(key);
}

function extractRecoveryData(url: string) {
  return {
    accessToken: extractValueFromUrl(url, "access_token"),
    refreshToken: extractValueFromUrl(url, "refresh_token"),
    type: extractValueFromUrl(url, "type"),
  };
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (isSubmitting || isLoadingSession) return false;
    if (!password.trim() || !confirmPassword.trim()) return false;
    if (password.length < 6) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [confirmPassword, isLoadingSession, isSubmitting, password]);

  useEffect(() => {
    let isMounted = true;

    const hydrateRecoverySession = async (url: string | null) => {
      try {
        if (!url) {
          const { data } = await supabase.auth.getSession();
          if (isMounted) {
            setIsLoadingSession(false);
            if (!data.session) {
              setError("Reset link is invalid or expired. Please request a new one.");
            }
          }
          return;
        }

        const { accessToken, refreshToken, type } = extractRecoveryData(url);

        if (type === "recovery" && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError && isMounted) {
            setError(sessionError.message);
          }
        }

        if (isMounted) {
          setIsLoadingSession(false);
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e?.message ?? "Unable to initialize password reset.");
          setIsLoadingSession(false);
        }
      }
    };

    Linking.getInitialURL().then(hydrateRecoverySession);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      hydrateRecoverySession(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const handleUpdatePassword = async () => {
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setIsSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToSignIn = async () => {
    await supabase.auth.signOut();
    router.replace("/(onboarding)/auth");
  };

  return (
    <ScreenLayout scroll={false} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/(onboarding)/auth")}
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
        >
          <Ionicons name="chevron-back" size={20} color="#08110D" />
        </Pressable>

        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Choose a new password to secure your account.
        </Text>

        {isLoadingSession ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#00A878" />
            <Text style={styles.loadingText}>Preparing secure reset...</Text>
          </View>
        ) : isSuccess ? (
          <View style={styles.successWrap}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={28} color="#00A878" />
            </View>
            <Text style={styles.successTitle}>Password updated</Text>
            <Text style={styles.successBody}>
              You can now sign in with your new password.
            </Text>
            <Button
              title="Go to sign in"
              onPress={handleGoToSignIn}
              showArrow={false}
              accessibilityLabel="Go to sign in"
            />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>New password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#8A9C93"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat new password"
                  placeholderTextColor="#8A9C93"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#62756B"
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#E53E3E" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              title={isSubmitting ? "Updating..." : "Update password"}
              onPress={handleUpdatePassword}
              showArrow={false}
              disabled={!canSubmit}
              accessibilityLabel="Update password"
            />
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 26,
    backgroundColor: "#F7FAF8",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#08110D",
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#62756B",
    marginBottom: 24,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  loadingText: {
    fontSize: 13,
    color: "#62756B",
    fontWeight: "600",
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#62756B",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#08110D",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeButton: {
    padding: 6,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FFF5F5",
    borderColor: "#FED7D7",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#C53030",
    flex: 1,
  },
  successWrap: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 18,
    gap: 12,
  },
  successIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E6FFF4",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#08110D",
    letterSpacing: -0.4,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#62756B",
  },
});
