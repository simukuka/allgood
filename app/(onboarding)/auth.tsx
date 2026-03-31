import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  authenticateWithBiometrics,
  getBiometricPreference,
  getBiometricType,
  isBiometricAvailable,
} from "@/lib/biometrics";

const G0   = "#00C98C";
const G1   = "#00A878";
const G2   = "#007A5A";
const GRAD: [string, string, string] = [G0, G1, G2];
const INK  = "#08110D";
const MUTED = "#62756B";
const RULE  = "rgba(0,0,0,0.08)";
const BG    = "#F7FAF8";

export default function AuthScreen() {
  const { preferences } = useApp();
  const t = useTranslation(preferences.language);
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Biometric
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometric");
  const [biometricUserEnabled, setBiometricUserEnabled] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available) {
        setBiometricType(await getBiometricType());
        setBiometricUserEnabled(await getBiometricPreference());
      }
    })();
  }, []);

  const isFormValid = () => {
    if (!email.trim() || !password.trim()) return false;
    if (!emailRegex.test(email.trim())) return false;
    if (mode === "signup") {
      if (!fullName.trim()) return false;
      if (phone.trim().replace(/\D/g, "").length < 8) return false;
      if (!country.trim()) return false;
      if (password.length < 6) return false;
      if (password !== confirmPassword) return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!emailRegex.test(email.trim())) { setError(t("invalidEmail")); return; }
    if (mode === "signup" && phone.trim().replace(/\D/g, "").length < 8) { setError("Please enter a valid phone number."); return; }
    if (mode === "signup" && !country.trim()) { setError("Please enter your country."); return; }
    if (mode === "signup" && password !== confirmPassword) { setError(t("passwordMismatch")); return; }
    if (mode === "signup" && password.length < 6) { setError(t("passwordTooShort")); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err } = await signUp(email.trim(), password, fullName.trim(), {
          phone: phone.trim(),
          country: country.trim(),
          idType: preferences.signInMethod,
        });
        if (err) {
          setError(err);
          if (err.toLowerCase().includes("already has an account")) {
            setMode("signin");
          }
        }
        else router.push("/(onboarding)/preferences");
      } else {
        const { error: err } = await signIn(email.trim(), password);
        if (err) setError(err);
        else router.replace("/(tabs)");
      }
    } catch (e: any) {
      setError(e?.message ?? t("authError"));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    setError(null);

    if (!emailRegex.test(email.trim())) {
      setError(t("invalidEmail"));
      return;
    }

    if (!password.trim()) {
      setError(t("passwordLabel") + " is required");
      return;
    }

    const biometricOk = await authenticateWithBiometrics(t("biometricPrompt"));
    if (!biometricOk) return;

    setLoading(true);
    try {
      const { error: err } = await signIn(email.trim(), password);
      if (err) {
        setError(err);
        return;
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message ?? t("authError"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) { setResetError(t("invalidEmail")); return; }
    setResetLoading(true); setResetError(null);
    try {
      const { error: err } = await resetPassword(resetEmail.trim());
      if (err) setResetError(err);
      else setResetSent(true);
    } catch (e: any) {
      setResetError(e?.message ?? t("authError"));
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotModal = () => {
    setForgotVisible(false); setResetEmail(""); setResetSent(false); setResetError(null);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

        {/* ── Gradient Header ───────────────────────────── */}
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <Pressable
            onPress={() => router.replace("/(onboarding)")}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
          >
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>

          <View style={styles.headerBrand}>
            <View style={styles.headerIcon}>
              <Ionicons name="checkmark" size={13} color={G1} />
            </View>
            <Text style={styles.headerBrandTxt}>AllGood</Text>
          </View>

          {/* Sign in / Sign up toggle */}
          <View style={styles.modeToggle}>
            {(["signup", "signin"] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => {
                  setMode(m);
                  setError(null);
                  setPassword("");
                  setConfirmPassword("");
                }}
                accessibilityRole="button"
                accessibilityLabel={m === "signup" ? "Create account mode" : "Sign in mode"}
              >
                <Text style={[styles.modeBtnTxt, mode === m && styles.modeBtnTxtActive]}>
                  {m === "signup" ? "Create account" : "Sign in"}
                </Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        {/* ── Form ─────────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1, backgroundColor: BG }}
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>

            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={styles.label}>{t("fullName")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Maria Garcia"
                  placeholderTextColor={MUTED + "80"}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 555 123 4567"
                  placeholderTextColor={MUTED + "80"}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  placeholder="United States"
                  placeholderTextColor={MUTED + "80"}
                  value={country}
                  onChangeText={setCountry}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>{t("emailLabel")}</Text>
              <TextInput
                style={styles.input}
                placeholder="you@email.com"
                placeholderTextColor={MUTED + "80"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t("passwordLabel")}</Text>
                {mode === "signin" && (
                  <Pressable
                    onPress={() => { setResetEmail(email); setForgotVisible(true); }}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password"
                  >
                    <Text style={styles.forgotLink}>Forgot password?</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={MUTED + "80"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((p) => !p)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={MUTED} />
                </Pressable>
              </View>
            </View>

            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={styles.label}>{t("confirmPassword")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={MUTED + "80"}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Biometric */}
            {mode === "signin" && biometricAvailable && biometricUserEnabled && (
              <Pressable
                style={styles.biometricBtn}
                onPress={handleBiometricSignIn}
                accessibilityRole="button"
                accessibilityLabel={t("biometricSignIn")}
              >
                <Ionicons
                  name={biometricType === "Face ID" ? "scan-outline" : "finger-print-outline"}
                  size={20}
                  color={G1}
                />
                <Text style={styles.biometricBtnTxt}>
                  {t("biometricSignIn")} ({biometricType})
                </Text>
              </Pressable>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#E53E3E" />
                <Text style={styles.errorTxt}>{error}</Text>
              </View>
            )}

          </Animated.View>
        </ScrollView>

        {/* ── Footer ────────────────────────────────────── */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleSubmit}
            disabled={!isFormValid() || loading}
            style={[styles.submitBtn, (!isFormValid() || loading) && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel={mode === "signup" ? "Create account" : "Sign in"}
          >
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtnInner}>
              <Text style={styles.submitBtnTxt}>
                {loading
                  ? (mode === "signup" ? t("creatingAccount") : t("signingIn"))
                  : (mode === "signup" ? "Create account  →" : "Sign in  →")}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ──────────────────────── */}
      <Modal visible={forgotVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeForgotModal}>
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("forgotPasswordTitle")}</Text>
            <Pressable onPress={closeForgotModal} style={styles.modalClose}>
              <Ionicons name="close" size={20} color={INK} />
            </Pressable>
          </View>

          {resetSent ? (
            <View style={styles.modalBody}>
              <View style={styles.resetIcon}>
                <Ionicons name="mail-outline" size={36} color={G0} />
              </View>
              <Text style={styles.resetTitle}>{t("resetEmailSent")}</Text>
              <Text style={styles.resetDesc}>{t("resetEmailSentDesc")}</Text>
              <Pressable style={styles.submitBtn} onPress={closeForgotModal}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtnInner}>
                  <Text style={styles.submitBtnTxt}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.modalBody}>
              <Text style={styles.resetDesc}>{t("forgotPasswordDesc")}</Text>
              <View style={[styles.field, { marginTop: 8 }]}>
                <Text style={styles.label}>{t("emailLabel")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@email.com"
                  placeholderTextColor={MUTED + "80"}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
              {resetError && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#E53E3E" />
                  <Text style={styles.errorTxt}>{resetError}</Text>
                </View>
              )}
              <Pressable
                style={[styles.submitBtn, { marginTop: 8 }, (!resetEmail.trim() || resetLoading) && { opacity: 0.5 }]}
                onPress={handleForgotPassword}
                disabled={!resetEmail.trim() || resetLoading}
              >
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtnInner}>
                  <Text style={styles.submitBtnTxt}>{resetLoading ? "Sending…" : t("sendResetLink")}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 20 },
  headerIcon: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
  },
  headerBrandTxt: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.92)" },
  modeToggle: {
    flexDirection: "row", gap: 8,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 14, padding: 4,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center" },
  modeBtnActive: { backgroundColor: "#fff" },
  modeBtnTxt: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  modeBtnTxtActive: { color: G2, fontWeight: "700" },

  // Form
  form: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 16 },
  field: { marginBottom: 18 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  input: {
    fontSize: 16, paddingHorizontal: 16, paddingVertical: 15,
    borderRadius: 14, borderWidth: 1.5, borderColor: RULE,
    backgroundColor: "#fff", color: INK,
  },
  passwordWrap: { flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  eyeBtn: {
    paddingHorizontal: 14, paddingVertical: 15,
    borderTopRightRadius: 14, borderBottomRightRadius: 14,
    borderWidth: 1.5, borderLeftWidth: 0, borderColor: RULE,
    backgroundColor: "#fff",
  },
  forgotLink: { fontSize: 13, fontWeight: "600", color: G1 },
  biometricBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: G0 + "40",
    backgroundColor: G0 + "0C", marginTop: 4,
  },
  biometricBtnTxt: { fontSize: 14, fontWeight: "600", color: G1 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 13, borderRadius: 12, borderWidth: 1,
    backgroundColor: "#FFF5F5", borderColor: "#FED7D7", marginTop: 4,
  },
  errorTxt: { fontSize: 13, color: "#C53030", flex: 1, lineHeight: 19 },

  // Footer
  footer: { padding: 18, paddingBottom: 28, backgroundColor: BG, borderTopWidth: 1, borderTopColor: RULE },
  submitBtn: { borderRadius: 15, overflow: "hidden" },
  submitBtnInner: { paddingVertical: 17, alignItems: "center" },
  submitBtnTxt: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },

  // Modal
  modal: { flex: 1, backgroundColor: BG },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 22, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: RULE,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: INK },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  modalBody: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  resetIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: G0 + "18", alignItems: "center", justifyContent: "center",
    marginBottom: 18,
  },
  resetTitle: { fontSize: 22, fontWeight: "800", color: INK, letterSpacing: -0.5, marginBottom: 10 },
  resetDesc: { fontSize: 15, color: MUTED, lineHeight: 23, marginBottom: 4 },
});
