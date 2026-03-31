import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "@/constants/i18n";
import type { AssistanceLevel, Language, TransparencyLevel } from "@/contexts/AppContext";
import { useApp } from "@/contexts/AppContext";
import * as Haptics from "expo-haptics";

const G0   = "#00C98C";
const G1   = "#00A878";
const G2   = "#007A5A";
const GRAD: [string, string, string] = [G0, G1, G2];
const INK  = "#08110D";
const MUTED = "#62756B";
const RULE  = "rgba(0,0,0,0.07)";
const BG    = "#F7FAF8";

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "en", label: "English",    flag: "🇺🇸" },
  { value: "es", label: "Español",    flag: "🇪🇸" },
  { value: "pt", label: "Português",  flag: "🇧🇷" },
];

const ASSIST_OPTIONS: {
  value:  AssistanceLevel;
  icon:   React.ComponentProps<typeof Ionicons>["name"];
  titleKey: string;
  descKey:  string;
}[] = [
  { value: "minimal",  icon: "flash-outline",     titleKey: "knowMyWay",  descKey: "knowMyWayDesc"  },
  { value: "standard", icon: "bulb-outline",       titleKey: "someHelp",   descKey: "someHelpDesc"   },
  { value: "guided",   icon: "hand-left-outline",  titleKey: "guideMe",    descKey: "guideMeDesc"    },
];

export default function PreferencesScreen() {
  const { preferences, setPreferences } = useApp();
  const [language,    setLanguage]    = useState<Language>(preferences.language);
  const [assistance,  setAssistance]  = useState<AssistanceLevel>(preferences.assistanceLevel);
  const [transparency,setTransparency]= useState<TransparencyLevel>(preferences.transparency);

  const t = useTranslation(language);

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setPreferences({ language, assistanceLevel: assistance, transparency });
    router.push("/(onboarding)/all-set");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>

      {/* ── Gradient Header ───────────────────────────── */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <View style={styles.headerBrand}>
          <View style={styles.headerIcon}>
            <Ionicons name="checkmark" size={13} color={G1} />
          </View>
          <Text style={styles.headerBrandTxt}>AllGood</Text>
        </View>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillTxt}>Step 2 of 3</Text>
        </View>
        <Text style={styles.headerTitle}>Make it yours.</Text>
        <Text style={styles.headerSub}>Personalize your experience in seconds.</Text>
      </LinearGradient>

      {/* ── Content ──────────────────────────────────── */}
      <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("language")}</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map((opt) => {
              const active = language === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setLanguage(opt.value)}
                  style={[styles.langCard, active && styles.langCardActive]}
                >
                  <Text style={styles.langFlag}>{opt.flag}</Text>
                  <Text style={[styles.langTxt, active && styles.langTxtActive]}>{opt.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={16} color={G0} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Assistance level */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("assistanceLevel")}</Text>
          <View style={styles.assistList}>
            {ASSIST_OPTIONS.map((opt) => {
              const active = assistance === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setAssistance(opt.value)}
                  style={[styles.assistCard, active && styles.assistCardActive]}
                >
                  <View style={[styles.assistIcon, active && styles.assistIconActive]}>
                    <Ionicons name={opt.icon} size={19} color={active ? G0 : MUTED} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.assistTitle, active && styles.assistTitleActive]}>
                      {t(opt.titleKey as any)}
                    </Text>
                    <Text style={styles.assistDesc}>{t(opt.descKey as any)}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Transparency */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("transparency")}</Text>
          {([
            { value: "full",   icon: "eye-outline"      as const, titleKey: "showEverything", descKey: "showEverythingDesc" },
            { value: "simple", icon: "sparkles-outline" as const, titleKey: "keepSimple",      descKey: "" },
          ] as const).map((opt) => {
            const active = transparency === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setTransparency(opt.value)}
                style={[styles.assistCard, active && styles.assistCardActive, { marginBottom: 10 }]}
              >
                <View style={[styles.assistIcon, active && styles.assistIconActive]}>
                  <Ionicons name={opt.icon} size={19} color={active ? G0 : MUTED} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assistTitle, active && styles.assistTitleActive]}>
                    {t(opt.titleKey as any)}
                  </Text>
                  {opt.descKey ? <Text style={styles.assistDesc}>{t(opt.descKey as any)}</Text> : null}
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Trust note */}
        <View style={styles.trustNote}>
          <Ionicons name="shield-outline" size={16} color={G0} />
          <Text style={styles.trustNoteTxt}>{t("idNote")}</Text>
        </View>

      </ScrollView>

      {/* ── Footer ────────────────────────────────────── */}
      <View style={styles.footer}>
        <Pressable onPress={handleContinue} style={styles.continueBtn}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.continueBtnInner}>
            <Text style={styles.continueBtnTxt}>Continue  →</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
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
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  stepPillTxt: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)", letterSpacing: 0.4 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.8, marginBottom: 8 },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 20 },

  scroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 32 },

  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: G1, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },

  langRow: { flexDirection: "row", gap: 10 },
  langCard: {
    flex: 1, alignItems: "center", gap: 6, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: RULE, backgroundColor: "#fff",
  },
  langCardActive: { borderColor: G0, backgroundColor: G0 + "08" },
  langFlag: { fontSize: 22 },
  langTxt: { fontSize: 13, fontWeight: "500", color: MUTED },
  langTxtActive: { color: G1, fontWeight: "700" },

  assistList: { gap: 10 },
  assistCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 15, borderRadius: 15, borderWidth: 1.5, borderColor: RULE, backgroundColor: "#fff",
  },
  assistCardActive: { borderColor: G0, backgroundColor: G0 + "06" },
  assistIcon: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.04)", alignItems: "center", justifyContent: "center",
  },
  assistIconActive: { backgroundColor: G0 + "18" },
  assistTitle: { fontSize: 14, fontWeight: "600", color: INK, marginBottom: 2 },
  assistTitleActive: { color: G2 },
  assistDesc: { fontSize: 12, color: MUTED, lineHeight: 17 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: "rgba(0,0,0,0.18)", alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: G0 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: G0 },

  trustNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: G0 + "0D", padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: G0 + "25",
  },
  trustNoteTxt: { fontSize: 13, color: MUTED, flex: 1, lineHeight: 19 },

  footer: { padding: 18, paddingBottom: 28, backgroundColor: BG, borderTopWidth: 1, borderTopColor: RULE },
  continueBtn: { borderRadius: 15, overflow: "hidden" },
  continueBtnInner: { paddingVertical: 17, alignItems: "center" },
  continueBtnTxt: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
});
