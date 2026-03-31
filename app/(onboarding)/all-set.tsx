import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

const G0   = "#00C98C";
const G1   = "#00A878";
const G2   = "#007A5A";
const GRAD: [string, string, string] = [G0, G1, G2];
const INK  = "#08110D";
const MUTED = "#62756B";
const RULE  = "rgba(0,0,0,0.07)";
const BG    = "#F7FAF8";

const LANG_LABELS: Record<string, string> = {
  en: "English", es: "Español", pt: "Português",
};

export default function AllSetScreen() {
  const { preferences, setOnboardingComplete } = useApp();
  const { user } = useAuth();
  const t = useTranslation(preferences.language);

  const ring1  = useRef(new Animated.Value(0)).current;
  const ring2  = useRef(new Animated.Value(0)).current;
  const check  = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const card   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      // rings expand
      Animated.parallel([
        Animated.timing(ring1, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      // checkmark pops in
      Animated.spring(check, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      // text + card fade up
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(card,   { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleGo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      router.replace("/(onboarding)/auth");
      return;
    }
    await setOnboardingComplete(true);
    router.replace("/(tabs)");
  };

  const setupItems = [
    { icon: "language-outline"  as const, label: t("language"),       value: LANG_LABELS[preferences.language] },
    { icon: "bulb-outline"      as const, label: t("assistanceLevel"), value: t(
        preferences.assistanceLevel === "minimal" ? "knowMyWay" : preferences.assistanceLevel === "guided" ? "guideMe" : "someHelp" as any) },
    { icon: "eye-outline"       as const, label: t("transparency"),    value: preferences.transparency === "full" ? t("showEverything") : t("keepSimple" as any) },
  ];

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>

      {/* ── Animated celebration area ─────────────────── */}
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.celebration}>

        {/* Step pill */}
        <View style={styles.stepPill}>
          <Text style={styles.stepPillTxt}>Step 3 of 3</Text>
        </View>

        {/* Rings + check */}
        <View style={styles.checkWrap}>
          <Animated.View style={[styles.ring2, { opacity: ring2, transform: [{ scale: ring2 }] }]} />
          <Animated.View style={[styles.ring1, { opacity: ring1, transform: [{ scale: ring1 }] }]} />
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: check }] }]}>
            <Ionicons name="checkmark" size={42} color="#fff" />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.celebTitle, { opacity: fadeIn }]}>
          {t("allSetTitle")}
        </Animated.Text>
        <Animated.Text style={[styles.celebSub, { opacity: fadeIn }]}>
          {t("allSetSubtitle")}
        </Animated.Text>
      </LinearGradient>

      {/* ── Setup summary card ─────────────────────────── */}
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.setupCard,
            {
              opacity: card,
              transform: [{
                translateY: card.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
              }],
            },
          ]}
        >
          <Text style={styles.setupHeading}>Your setup</Text>
          {setupItems.map((item, i) => (
            <View
              key={i}
              style={[
                styles.setupRow,
                i < setupItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: RULE, paddingBottom: 14 },
              ]}
            >
              <View style={styles.setupLeft}>
                <View style={styles.setupIconWrap}>
                  <Ionicons name={item.icon} size={15} color={G0} />
                </View>
                <Text style={styles.setupLabel}>{item.label}</Text>
              </View>
              <Text style={styles.setupValue}>{item.value}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA */}
        <Pressable onPress={handleGo} style={styles.goBtn}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goBtnInner}>
            <Text style={styles.goBtnTxt}>{t("goToDashboard")}  →</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  celebration: {
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36,
    alignItems: "center",
  },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  stepPillTxt: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)", letterSpacing: 0.4 },

  checkWrap: { width: 110, height: 110, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  ring2: {
    position: "absolute", width: 110, height: 110, borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  ring1: {
    position: "absolute", width: 86, height: 86, borderRadius: 43,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  checkCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.5)",
  },

  celebTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.6, marginBottom: 8, textAlign: "center" },
  celebSub:   { fontSize: 14, color: "rgba(255,255,255,0.76)", lineHeight: 21, textAlign: "center" },

  body: { flex: 1, paddingHorizontal: 18, paddingTop: 22 },

  setupCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: RULE, gap: 14, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  setupHeading: { fontSize: 11, fontWeight: "700", color: G1, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 },
  setupRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 2 },
  setupLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  setupIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: G0 + "18", alignItems: "center", justifyContent: "center",
  },
  setupLabel: { fontSize: 13, color: MUTED },
  setupValue: { fontSize: 13, fontWeight: "700", color: INK },

  goBtn: { borderRadius: 15, overflow: "hidden" },
  goBtnInner: { paddingVertical: 17, alignItems: "center" },
  goBtnTxt: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
});
