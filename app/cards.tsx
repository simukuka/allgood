import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticLight, hapticMedium } from "@/lib/haptics";

/* ── Chip component ──────────────────────────────────────── */
function CardChip() {
  return (
    <View style={chipStyles.chip}>
      <View style={chipStyles.row}>
        <View style={chipStyles.seg} />
        <View style={chipStyles.seg} />
      </View>
      <View style={chipStyles.row}>
        <View style={chipStyles.seg} />
        <View style={chipStyles.seg} />
      </View>
      <View style={chipStyles.row}>
        <View style={chipStyles.seg} />
        <View style={chipStyles.seg} />
      </View>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    width: 40,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#d4af37",
    padding: 3,
    gap: 2,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  row: { flexDirection: "row", gap: 2, flex: 1 },
  seg: { flex: 1, backgroundColor: "#c5a028", borderRadius: 1 },
});

/* ── Contactless icon ─────────────────────────────────────── */
function ContactlessIcon() {
  return (
    <View style={{ transform: [{ rotate: "90deg" }] }}>
      <View style={contactlessStyles.wrap}>
        {[16, 12, 8].map((size, i) => (
          <View
            key={i}
            style={[
              contactlessStyles.arc,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const contactlessStyles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  arc: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    transform: [{ rotate: "45deg" }],
  },
});

export default function CardsScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const t = useTranslation(preferences.language);

  const [showDetails, setShowDetails] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [onlinePurchases, setOnlinePurchases] = useState(true);
  const [atmWithdrawals, setAtmWithdrawals] = useState(true);
  const [international, setInternational] = useState(false);

  // Card flip animation
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [showBack, setShowBack] = useState(false);
  // Card entrance
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  // Shimmer
  const shimmer = useRef(new Animated.Value(0)).current;
  // Controls entrance
  const controlsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(controlsAnim, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start();

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, []);

  const flipCard = () => {
    hapticMedium();
    const toValue = showBack ? 0 : 1;
    Animated.spring(flipAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start(() => setShowBack(!showBack));
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["180deg", "270deg", "360deg"],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  const cardNumber = showDetails
    ? "4532 •••• •••• 7821"
    : "•••• •••• •••• 7821";
  const cardExp = showDetails ? "09/27" : "••/••";
  const cardCvv = showDetails ? "314" : "•••";

  const cardGradient: [string, string, string] = frozen
    ? ["#4b5563", "#374151", "#4b5563"]
    : [colors.gradientStart, colors.gradientEnd, colors.gradientStart];

  const spentAmount = 800;
  const dailyLimit = 2500;
  const spentPercent = (spentAmount / dailyLimit) * 100;

  return (
    <ScreenLayout>
      <ScreenHeader title={t("cardsTitle")} />

      {/* ── Premium Card with flip ──────────────────────── */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
          },
        ]}
      >
        <TouchableOpacity activeOpacity={0.95} onPress={flipCard}>
          {/* Front */}
          <Animated.View
            style={[
              styles.cardWrap,
              {
                opacity: frontOpacity,
                transform: [
                  { perspective: 1000 },
                  { rotateY: frontInterpolate },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Animated.View
                style={[
                  styles.shimmer,
                  { transform: [{ translateX: shimmerTranslate }] },
                ]}
              />
              <View style={styles.cardDecor1} />
              <View style={styles.cardDecor2} />
              <View style={styles.cardDecor3} />

              <View style={styles.cardTop}>
                <View style={styles.cardBrandRow}>
                  <Text style={styles.cardBrandName}>AllGood</Text>
                  {frozen && (
                    <View style={styles.frozenBadge}>
                      <Ionicons name="snow" size={12} color="#fff" />
                      <Text style={styles.frozenText}>{t("frozen")}</Text>
                    </View>
                  )}
                </View>
                <ContactlessIcon />
              </View>

              <View style={styles.chipRow}>
                <CardChip />
              </View>

              <Text style={styles.cardNum}>{cardNumber}</Text>

              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={styles.cardLabel}>{t("expires")}</Text>
                  <Text style={styles.cardVal}>{cardExp}</Text>
                </View>
                <View>
                  <Text style={styles.cardLabel}>CVV</Text>
                  <Text style={styles.cardVal}>{cardCvv}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={styles.networkLogo}>VISA</Text>
              </View>

              <Text style={styles.cardTypeLabel}>{t("virtualCard")}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Back */}
          <Animated.View
            style={[
              styles.cardWrap,
              styles.cardBack,
              {
                opacity: backOpacity,
                transform: [
                  { perspective: 1000 },
                  { rotateY: backInterpolate },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.magStripe} />
              <View style={styles.sigStrip}>
                <Text style={styles.sigText}>AUTHORIZED SIGNATURE</Text>
                <Text style={styles.cvvBack}>{cardCvv}</Text>
              </View>
              <Text style={styles.backInfo}>
                This card is issued by AllGood Financial Inc.{"\n"}
                For support: support@allgood.com
              </Text>
              <Text style={[styles.networkLogo, { alignSelf: "flex-end" }]}>
                VISA
              </Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
          Tap card to flip
        </Text>
      </Animated.View>

      {/* ── Quick Controls ──────────────────────────────── */}
      <Animated.View style={[styles.controls, { opacity: controlsAnim }]}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: colors.cardBg }]}
          onPress={() => {
            hapticLight();
            setShowDetails(!showDetails);
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.controlIconWrap,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons
              name={showDetails ? "eye-off" : "eye"}
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.controlLabel, { color: colors.text }]}>
            {showDetails ? t("hideDetails") : t("showDetails")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: colors.cardBg }]}
          onPress={() => {
            hapticMedium();
            setFrozen(!frozen);
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.controlIconWrap,
              {
                backgroundColor: frozen ? "#f59e0b20" : colors.primary + "15",
              },
            ]}
          >
            <Ionicons
              name={frozen ? "lock-open" : "snow"}
              size={20}
              color={frozen ? "#f59e0b" : colors.primary}
            />
          </View>
          <Text style={[styles.controlLabel, { color: colors.text }]}>
            {frozen ? t("unfreezeCard") : t("freezeCard")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: colors.cardBg }]}
          onPress={() => hapticLight()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.controlIconWrap,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons name="copy-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.controlLabel, { color: colors.text }]}>
            {t("copyNumber")}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Spending Limits ─────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("spendingLimits").toUpperCase()}
      </Text>
      <View
        style={[
          styles.limitCard,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <View style={styles.limitRow}>
          <Text style={[styles.limitLabel, { color: colors.text }]}>
            {t("dailyLimit")}
          </Text>
          <Text style={[styles.limitValue, { color: colors.primary }]}>
            $2,500
          </Text>
        </View>
        <View
          style={[styles.limitBar, { backgroundColor: colors.border + "60" }]}
        >
          <LinearGradient
            colors={colors.gradientAccent as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.limitProgress, { width: `${spentPercent}%` }]}
          />
        </View>
        <View style={styles.limitInfoRow}>
          <Text style={[styles.limitUsed, { color: colors.textSecondary }]}>
            ${spentAmount.toLocaleString()} / ${dailyLimit.toLocaleString()}{" "}
            {t("used")}
          </Text>
          <Text style={[styles.limitPercent, { color: colors.primary }]}>
            {Math.round(spentPercent)}%
          </Text>
        </View>
      </View>

      {/* ── Security toggles ────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("security").toUpperCase()}
      </Text>
      <View
        style={[
          styles.toggleSection,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        {[
          {
            label: t("onlinePurchases"),
            val: onlinePurchases,
            set: setOnlinePurchases,
            icon: "globe-outline" as const,
          },
          {
            label: t("atmWithdrawals"),
            val: atmWithdrawals,
            set: setAtmWithdrawals,
            icon: "cash-outline" as const,
          },
          {
            label: t("internationalUse"),
            val: international,
            set: setInternational,
            icon: "airplane-outline" as const,
          },
        ].map((item, i) => (
          <View
            key={i}
            style={[
              styles.toggleRow,
              i > 0 && {
                borderTopWidth: 1,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.toggleIconWrap,
                { backgroundColor: colors.primary + "12" },
              ]}
            >
              <Ionicons name={item.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>
              {item.label}
            </Text>
            <Switch
              value={item.val}
              onValueChange={(v) => {
                hapticLight();
                item.set(v);
              }}
              trackColor={{
                false: colors.border,
                true: colors.primary + "80",
              }}
              thumbColor={item.val ? colors.primary : "#ccc"}
            />
          </View>
        ))}
      </View>

      {/* ── Order physical card ──────────────────────────── */}
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: colors.primary + "10" }]}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={colors.gradientAccent as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orderIconWrap}
        >
          <Ionicons name="card" size={22} color="#fff" />
        </LinearGradient>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderTitle, { color: colors.text }]}>
            {t("orderPhysical")}
          </Text>
          <Text style={[styles.orderDesc, { color: colors.textSecondary }]}>
            {t("orderPhysicalDesc")}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  cardContainer: { marginBottom: 12, alignItems: "center" },
  cardWrap: { width: "100%", backfaceVisibility: "hidden" },
  cardBack: { position: "absolute", top: 0, left: 0, right: 0 },
  card: {
    borderRadius: 22,
    padding: 24,
    minHeight: 210,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 100,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.06)",
    transform: [{ skewX: "-20deg" }],
  },
  cardDecor1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardDecor2: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cardDecor3: {
    position: "absolute",
    top: 40,
    right: 60,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardBrandName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  frozenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  frozenText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  chipRow: { marginBottom: 24 },
  cardNum: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 3,
    marginBottom: 20,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 24,
  },
  cardLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  cardVal: { color: "#fff", fontSize: 15, fontWeight: "600" },
  networkLogo: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  cardTypeLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: 12,
  },
  tapHint: { fontSize: 12, marginTop: 10, marginBottom: 8 },
  magStripe: {
    backgroundColor: "#1a1a2e",
    height: 44,
    marginHorizontal: -24,
    marginTop: -4,
    marginBottom: 20,
  },
  sigStrip: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 4,
    height: 36,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  sigText: {
    color: "#666",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  cvvBack: {
    color: "#333",
    fontSize: 14,
    fontWeight: "700",
    fontStyle: "italic",
  },
  backInfo: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    lineHeight: 15,
    marginBottom: 16,
  },
  controls: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  controlBtn: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  controlIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  limitCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 28,
  },
  limitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  limitLabel: { fontSize: 15, fontWeight: "600" },
  limitValue: { fontSize: 15, fontWeight: "700" },
  limitBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  limitProgress: { height: 8, borderRadius: 4 },
  limitInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  limitUsed: { fontSize: 12 },
  limitPercent: { fontSize: 12, fontWeight: "700" },
  toggleSection: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 28,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  toggleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: { fontSize: 15, fontWeight: "500", flex: 1 },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    gap: 14,
  },
  orderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  orderInfo: { flex: 1 },
  orderTitle: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  orderDesc: { fontSize: 13 },
});
