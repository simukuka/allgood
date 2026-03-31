import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import * as Haptics from "expo-haptics";
import { setBiometricPreference } from "@/lib/biometrics";

const G0 = "#00C98C";
const G1 = "#00A878";
const G2 = "#007A5A";
const GRAD: [string, string, string] = [G0, G1, G2];
const INK = "#08110D";
const MUTED = "#62756B";
const RULE = "rgba(0,0,0,0.07)";
const BG = "#F7FAF8";

const SIGN_IN_METHODS = ["email", "phone", "itin", "bank", "app"] as const;
type SignInMethod = (typeof SIGN_IN_METHODS)[number];

const METHOD_CONFIG: Record<
  SignInMethod,
  {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    titleKey: string;
    descKey: string;
    tag?: string;
  }
> = {
  email: { icon: "mail-outline",           titleKey: "continueWithEmail", descKey: "emailDesc",  tag: "Popular" },
  phone: { icon: "call-outline",           titleKey: "continueWithPhone", descKey: "phoneDesc" },
  itin:  { icon: "document-text-outline",  titleKey: "continueWithITIN",  descKey: "itinDesc",   tag: "No SSN" },
  bank:  { icon: "business-outline",       titleKey: "continueWithBank",  descKey: "bankDesc" },
  app:   { icon: "link-outline",           titleKey: "continueWithApp",   descKey: "appDesc" },
};

export default function CreateAccountScreen() {
  const { preferences, setPreferences } = useApp();
  const t = useTranslation(preferences.language);

  const [selectedMethod, setSelectedMethod] = useState<SignInMethod | null>(
    (preferences.signInMethod as SignInMethod) ?? null,
  );
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleContinue = async () => {
    if (!selectedMethod) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setPreferences({ signInMethod: selectedMethod });
    await setBiometricPreference(biometricEnabled);
    router.push("/(onboarding)/auth");
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Gradient Header ───────────────────────────── */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        {/* back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.85)" />
        </Pressable>

        {/* brand */}
        <View style={styles.headerBrand}>
          <View style={styles.headerIcon}>
            <Ionicons name="checkmark" size={13} color={G1} />
          </View>
          <Text style={styles.headerBrandTxt}>AllGood</Text>
        </View>

        {/* step pill */}
        <View style={styles.stepPill}>
          <Text style={styles.stepPillTxt}>Step 1 of 3</Text>
        </View>

        <Text style={styles.headerTitle}>How would you{"\n"}like to sign up?</Text>
        <Text style={styles.headerSub}>Choose the method that works for you.</Text>
      </LinearGradient>

      {/* ── Scrollable Content ────────────────────────── */}
      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Method cards */}
        <View style={styles.methods}>
          {SIGN_IN_METHODS.map((method) => {
            const cfg = METHOD_CONFIG[method];
            const isSelected = selectedMethod === method;
            return (
              <Pressable
                key={method}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedMethod(method);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={[
                    styles.methodCard,
                    isSelected && styles.methodCardActive,
                  ]}
                >
                  {/* icon */}
                  <View style={[styles.methodIconWrap, isSelected && styles.methodIconWrapActive]}>
                    <Ionicons name={cfg.icon} size={20} color={isSelected ? G0 : MUTED} />
                  </View>

                  {/* text */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.methodTitleRow}>
                      <Text style={[styles.methodTitle, isSelected && { color: G1 }]}>
                        {t(cfg.titleKey as any)}
                      </Text>
                      {cfg.tag && (
                        <View style={[styles.methodTag, isSelected && styles.methodTagActive]}>
                          <Text style={[styles.methodTagTxt, isSelected && { color: G1 }]}>{cfg.tag}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.methodDesc}>{t(cfg.descKey as any)}</Text>
                  </View>

                  {/* radio */}
                  <View style={[styles.radio, isSelected && styles.radioActive]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Biometric toggle */}
        <View style={[styles.biometricCard, biometricEnabled && styles.biometricCardActive]}>
          <View style={styles.biometricRow}>
            <View style={styles.biometricIconWrap}>
              <Ionicons name="finger-print-outline" size={20} color={G0} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.biometricTitle}>{t("biometricTitle")}</Text>
              <Text style={styles.biometricDesc}>{t("biometricDesc")}</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: RULE, true: G0 + "60" }}
              thumbColor={biometricEnabled ? G0 : "#f4f3f4"}
              ios_backgroundColor={RULE}
            />
          </View>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeTxt}>Optional</Text>
          </View>
        </View>

        {/* Trust note */}
        <View style={styles.trustNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={G0} />
          <Text style={styles.trustNoteTxt}>{t("protectedInfo")}</Text>
        </View>
      </ScrollView>

      {/* ── Footer ────────────────────────────────────── */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={!selectedMethod}
          style={[styles.continueBtn, !selectedMethod && styles.continueBtnDisabled]}
        >
          <LinearGradient
            colors={selectedMethod ? GRAD : ["#ccc", "#aaa"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.continueBtnInner}
          >
            <Text style={styles.continueBtnTxt}>Continue  →</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 16 },
  headerIcon: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
  },
  headerBrandTxt: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.92)" },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  stepPillTxt: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)", letterSpacing: 0.4 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 20 },

  // Scroll
  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 32 },

  // Methods
  methods: { gap: 10, marginBottom: 16 },
  methodCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "rgba(0,0,0,0.07)",
  },
  methodCardActive: { borderColor: G0, backgroundColor: G0 + "08" },
  methodIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center", justifyContent: "center",
  },
  methodIconWrapActive: { backgroundColor: G0 + "18" },
  methodTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  methodTitle: { fontSize: 15, fontWeight: "600", color: INK },
  methodTag: {
    backgroundColor: "rgba(0,0,0,0.06)", paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  methodTagActive: { backgroundColor: G0 + "18" },
  methodTagTxt: { fontSize: 10, fontWeight: "700", color: MUTED, letterSpacing: 0.3 },
  methodDesc: { fontSize: 12, color: MUTED, lineHeight: 17 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: "rgba(0,0,0,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: G0 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: G0 },

  // Biometric
  biometricCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "rgba(0,0,0,0.07)", marginBottom: 16,
  },
  biometricCardActive: { borderColor: G0, backgroundColor: G0 + "06" },
  biometricRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  biometricIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: G0 + "15", alignItems: "center", justifyContent: "center",
  },
  biometricTitle: { fontSize: 14, fontWeight: "600", color: INK, marginBottom: 2 },
  biometricDesc: { fontSize: 12, color: MUTED, lineHeight: 17, flex: 1 },
  optionalBadge: {
    alignSelf: "flex-start", marginTop: 10,
    backgroundColor: G0 + "15", paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 8,
  },
  optionalBadgeTxt: { fontSize: 11, fontWeight: "700", color: G1 },

  // Trust
  trustNote: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: G0 + "0D", padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: G0 + "25",
  },
  trustNoteTxt: { fontSize: 13, color: MUTED, flex: 1, lineHeight: 19 },

  // Footer
  footer: { padding: 18, paddingBottom: 28, backgroundColor: BG, borderTopWidth: 1, borderTopColor: RULE },
  continueBtn: { borderRadius: 15, overflow: "hidden" },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnInner: { paddingVertical: 17, alignItems: "center" },
  continueBtnTxt: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
});
