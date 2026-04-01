/**
 * AllGood — Landing Screen
 * Vibrant gradient hero. Card-flip features. Reanimated v4.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';

const { width: SW } = Dimensions.get('window');

// ── Palette ──────────────────────────────────────────────────
const HERO1   = '#00A6FB';
const HERO2   = '#06D6A0';
const HERO3   = '#FF7A18';
const BG      = '#071017';
const SURFACE = '#0E1B27';
const SURF2   = '#122433';
const WHITE   = '#EAF7FF';
const MUTED   = 'rgba(226,244,255,0.62)';
const BORDER  = 'rgba(255,255,255,0.08)';
const BORDER2 = 'rgba(255,255,255,0.15)';
const TEAL    = '#2EFFD5';
const PURPLE  = '#5FA8FF';
const PINK    = '#FF5D8F';
const GREEN   = '#4ADE80';
const CORAL   = '#FB923C';
const RED     = '#FF6B6B';
const GOLD    = '#FCD34D';

const HERO_CHIPS = [
  { icon: 'flash-outline' as const, txt: 'Fast setup' },
  { icon: 'shield-checkmark-outline' as const, txt: 'Bank-grade security' },
  { icon: 'wallet-outline' as const, txt: 'No hidden fees' },
];
const HERO_TICKERS = [
  { icon: 'time-outline' as const, txt: 'Avg transfer: 2 min' },
  { icon: 'cash-outline' as const, txt: 'From $3.99 flat' },
  { icon: 'sparkles-outline' as const, txt: 'Instant account setup' },
];

const MOTION_PROFILE: 'energetic' | 'calm' = 'energetic';
const MOTION = MOTION_PROFILE === 'energetic'
  ? {
      heroDelays: { nav: 0, badge: 100, h1a: 180, h1b: 280, sub: 360, btn: 420, rate: 500, card: 520 },
      chipDelays: [380, 440, 500],
      tickerDelays: [540, 590, 640],
      blob1Scale: { max: 1.26, dur: 3400 },
      blob2Scale: { max: 1.2, min: 0.9, dur: 4400 },
      blob1X: { amp: 26, dur: 4600 },
      blob2Y: { amp: 22, dur: 4200 },
      blob1DriftY: { up: -12, down: 10, dur: 4400 },
      blob2DriftX: { amp: 14, dur: 5000 },
      cardDriftX: { amp: 8, dur: 2200 },
      cardFloatY: { amp: -10, dur: 1900 },
      ctaPulse: { max: 1.04, dur: 1100 },
      ripple: { heroIn: 260, heroOut: 220, ctaIn: 280, ctaOut: 240 },
      shimStartDelay: 1000,
    }
  : {
      heroDelays: { nav: 0, badge: 140, h1a: 240, h1b: 360, sub: 460, btn: 560, rate: 640, card: 700 },
      chipDelays: [500, 570, 640],
      tickerDelays: [700, 760, 820],
      blob1Scale: { max: 1.2, dur: 5200 },
      blob2Scale: { max: 1.14, min: 0.94, dur: 6000 },
      blob1X: { amp: 18, dur: 6200 },
      blob2Y: { amp: 14, dur: 5600 },
      blob1DriftY: { up: -8, down: 6, dur: 6200 },
      blob2DriftX: { amp: 9, dur: 6400 },
      cardDriftX: { amp: 4, dur: 3200 },
      cardFloatY: { amp: -7, dur: 2600 },
      ctaPulse: { max: 1.025, dur: 1600 },
      ripple: { heroIn: 320, heroOut: 260, ctaIn: 340, ctaOut: 280 },
      shimStartDelay: 1100,
    };

// ── Feature card data ─────────────────────────────────────────
const FEATURES = [
  {
    icon: 'flash'          as const,
    title: 'Send with Rafiki',
    sub: 'Live rates. Real tracking.',
    back: 'Send money home in seconds. Live FX, real-time status, fees that don\'t sting.',
    tint: TEAL,
    grad: ['#2EFFD522', '#2EFFD508'] as [string, string],
  },
  {
    icon: 'trending-up'    as const,
    title: 'Credit Builder',
    sub: 'No SSN? No problem.',
    back: 'Build US credit with your ITIN. Rent, utilities, secured cards — all reported.',
    tint: PURPLE,
    grad: ['#A78BFA22', '#A78BFA08'] as [string, string],
  },
  {
    icon: 'globe'          as const,
    title: 'Financial Passport',
    sub: 'Your credit travels with you',
    back: 'Transfer your credit history internationally. Never start from zero again.',
    tint: '#38BDF8',
    grad: ['#38BDF822', '#38BDF808'] as [string, string],
  },
  {
    icon: 'map'            as const,
    title: 'Cash Near You',
    sub: 'Find deposits on a live map',
    back: 'Walk in with cash, deposit in seconds. We show you where.',
    tint: GREEN,
    grad: ['#4ADE8022', '#4ADE8008'] as [string, string],
  },
  {
    icon: 'language'       as const,
    title: 'Learning Hub',
    sub: 'Finance in your language',
    back: 'Taxes, ITIN filing, budgeting — explained simply in English, Spanish, and Portuguese.',
    tint: PINK,
    grad: ['#F472B622', '#F472B608'] as [string, string],
  },
];

const STATS = [
  { value: 200000, display: '200K+', label: 'People helped', tint: TEAL   },
  { value: 47,     display: '47',    label: 'Currencies',    tint: PURPLE },
  { value: 0,      display: '$0',    label: 'Monthly fee',   tint: GREEN  },
  { value: 6,      display: '6',     label: 'Languages',     tint: PINK   },
];

const TESTIMONIALS = [
  { quote: 'Sent $400 home in 3 minutes. Never going back to Western Union.', name: 'Maria G.',  from: 'Mexico → Chicago',  init: 'M', tint: TEAL   },
  { quote: 'Built a 700+ score in 8 months with just my ITIN. Unreal.',       name: 'Amara D.',  from: 'Nigeria → Houston', init: 'A', tint: PURPLE },
  { quote: 'Everything in Spanish. No confusion. No surprise fees. Ever.',    name: 'Carlos R.', from: 'Colombia → Miami',  init: 'C', tint: GREEN  },
  { quote: 'My credit history actually followed me across the border.',       name: 'Priya K.',  from: 'India → New York',  init: 'P', tint: PINK   },
];

// ── Hooks ─────────────────────────────────────────────────────
function useEntrance(delay = 0, from = 28) {
  const op = useSharedValue(0);
  const ty = useSharedValue(from);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 110 }));
  }, []);
  return useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));
}

// ── Flip card ─────────────────────────────────────────────────
function FlipCard({ feature, style: animStyle }: { feature: typeof FEATURES[0]; style: any }) {
  const rotation = useSharedValue(0);
  const flipped  = useSharedValue(false);
  const float = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Floating bob motion
    float.value = withRepeat(withSequence(
      withTiming(-12, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      withTiming(8, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    // Subtle rotation sway
    rotate.value = withRepeat(withSequence(
      withTiming(3.2, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      withTiming(-2.8, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    // Glow pulse
    glowOpacity.value = withRepeat(withSequence(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
  }, []);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` },
      { translateY: float.value },
      { rotateZ: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    backfaceVisibility: 'hidden',
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${interpolate(rotation.value, [0, 1], [180, 360])}deg` },
      { translateY: float.value },
      { rotateZ: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const flip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (flipped.value) {
      rotation.value = withTiming(0, { duration: 500, easing: Easing.inOut(Easing.cubic) });
      flipped.value  = false;
    } else {
      rotation.value = withTiming(1, { duration: 500, easing: Easing.inOut(Easing.cubic) });
      flipped.value  = true;
    }
  };

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.94, { duration: 60 }),
      withTiming(1.06, { duration: 200, easing: Easing.inOut(Easing.cubic) }),
      withTiming(1, { duration: 100 }),
    );
    flip();
  };

  return (
    <Animated.View style={[fc.wrap, animStyle]}>
      <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel={`${feature.title} — tap for details`}>
        {/* Glow background */}
        <Animated.View style={[fc.glowBg, glowStyle, { borderColor: feature.tint + '40' }]} pointerEvents="none" />
        
        {/* Front */}
        <Animated.View style={[fc.card, frontStyle]}>
          <LinearGradient colors={feature.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: 12, borderWidth: 1, borderColor: feature.tint + '20', opacity: 0.5 }]} />
          <View style={[fc.iconWrap, { backgroundColor: feature.tint + '35' }]}>
            <Ionicons name={feature.icon} size={18} color={feature.tint} />
          </View>
          <Text style={fc.title}>{feature.title}</Text>
          <Text style={fc.sub}>{feature.sub}</Text>
          <View style={fc.tapHint}>
            <Ionicons name="refresh-outline" size={10} color={feature.tint + 'CC'} />
            <Text style={[fc.tapTxt, { color: feature.tint + 'CC' }]}>Tap</Text>
          </View>
        </Animated.View>

        {/* Back */}
        <Animated.View style={[fc.card, fc.cardBack, backStyle]}>
          <LinearGradient colors={[feature.tint + '38', feature.tint + '15']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: 12, borderWidth: 1, borderColor: feature.tint + '30', opacity: 0.6 }]} />
          <View style={[fc.iconWrap, { backgroundColor: feature.tint + '30' }]}>
            <Ionicons name={feature.icon} size={18} color={feature.tint} />
          </View>
          <Text style={[fc.title, { color: WHITE }]}>{feature.title}</Text>
          <Text style={[fc.backDesc, { color: WHITE }]}>{feature.back}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ── Stat tile ─────────────────────────────────────────────────
function StatTile({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const [displayed, setDisplayed] = useState(stat.display);
  const anim = useEntrance(MOTION.heroDelays.rate + index * 80, 20);
  const bounce = useSharedValue(0);
  const glow = useSharedValue(0.3);

  useEffect(() => {
    // Bounce entrance
    bounce.value = withDelay(MOTION.heroDelays.rate + index * 80 + 200, withSequence(
      withTiming(1.15, { duration: 400, easing: Easing.inOut(Easing.cubic) }),
      withTiming(0.95, { duration: 200, easing: Easing.inOut(Easing.cubic) }),
      withTiming(1, { duration: 150 }),
    ));
    // Pulsing glow
    glow.value = withDelay(MOTION.heroDelays.rate + index * 80 + 600, withRepeat(withSequence(
      withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
    ), -1, true));
  }, []);

  useEffect(() => {
    if (stat.value === 0) return;
    let cur = 0;
    const steps = 60;
    const inc   = stat.value / steps;
    const id = setInterval(() => {
      cur += inc;
      if (cur >= stat.value) { setDisplayed(stat.display); clearInterval(id); return; }
      if (stat.value >= 1000) setDisplayed(Math.floor(cur).toLocaleString() + '+');
      else setDisplayed(String(Math.floor(cur)));
    }, 26);
    return () => clearInterval(id);
  }, []);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounce.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View style={[st.tile, anim, bounceStyle]}>
      <Animated.View style={[st.glowRing, glowStyle, { borderColor: stat.tint + '60' }]} pointerEvents="none" />
      <LinearGradient colors={[stat.tint + '28', stat.tint + '08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: 16, borderWidth: 1.5, borderColor: stat.tint + '35', opacity: 0.6 }]} />
      <View style={[st.dot, { backgroundColor: stat.tint }]} />
      <Text style={[st.num, { color: stat.tint }]}>{displayed}</Text>
      <Text style={st.label}>{stat.label}</Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════
export default function LandingScreen() {
  const { user, isLoading } = useAuth();

  // Hero entrance
  const navAnim   = useEntrance(MOTION.heroDelays.nav, -8);
  const badgeAnim = useEntrance(MOTION.heroDelays.badge, 24);
  const h1aAnim   = useEntrance(MOTION.heroDelays.h1a, 40);
  const h1bAnim   = useEntrance(MOTION.heroDelays.h1b, 40);
  const subAnim   = useEntrance(MOTION.heroDelays.sub, 20);
  const chip0Anim = useEntrance(MOTION.chipDelays[0], 14);
  const chip1Anim = useEntrance(MOTION.chipDelays[1], 14);
  const chip2Anim = useEntrance(MOTION.chipDelays[2], 14);
  const btnsAnim  = useEntrance(MOTION.heroDelays.btn, 20);
  const rateAnim  = useEntrance(MOTION.heroDelays.rate, 14);
  const tick0Anim = useEntrance(MOTION.tickerDelays[0], 12);
  const tick1Anim = useEntrance(MOTION.tickerDelays[1], 12);
  const tick2Anim = useEntrance(MOTION.tickerDelays[2], 12);
  const cardAnim  = useEntrance(MOTION.heroDelays.card, 48);

  // Blob animations
  const blob1S = useSharedValue(1);
  const blob2S = useSharedValue(1);
  const blob1X = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const cardFloat = useSharedValue(0);
  const blob1DriftY = useSharedValue(0);
  const blob2DriftX = useSharedValue(0);
  const cardDriftX = useSharedValue(0);
  const beamX1 = useSharedValue(-SW);
  const beamX2 = useSharedValue(SW);
  const heroRipple = useSharedValue(0);
  const ctaRipple = useSharedValue(0);
  const ctaPulse  = useSharedValue(1);
  const shimX     = useSharedValue(-SW);

  // Feature stagger entrances with bounce
  const f0 = useEntrance(200, 20);
  const f1 = useEntrance(260, 20);
  const f2 = useEntrance(320, 20);
  const f3 = useEntrance(380, 20);
  const f4 = useEntrance(440, 20);
  const featAnims = [f0, f1, f2, f3, f4];

  useEffect(() => {
    blob1S.value = withRepeat(withSequence(
      withTiming(MOTION.blob1Scale.max, { duration: MOTION.blob1Scale.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0, { duration: MOTION.blob1Scale.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
    blob2S.value = withRepeat(withSequence(
      withTiming(MOTION.blob2Scale.max, { duration: MOTION.blob2Scale.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(MOTION.blob2Scale.min, { duration: MOTION.blob2Scale.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
    blob1X.value = withRepeat(withSequence(
      withTiming(MOTION.blob1X.amp, { duration: MOTION.blob1X.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(-MOTION.blob1X.amp, { duration: MOTION.blob1X.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    blob2Y.value = withRepeat(withSequence(
      withTiming(-MOTION.blob2Y.amp, { duration: MOTION.blob2Y.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(MOTION.blob2Y.amp, { duration: MOTION.blob2Y.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    blob1DriftY.value = withRepeat(withSequence(
      withTiming(MOTION.blob1DriftY.up, { duration: MOTION.blob1DriftY.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(MOTION.blob1DriftY.down, { duration: MOTION.blob1DriftY.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    blob2DriftX.value = withRepeat(withSequence(
      withTiming(MOTION.blob2DriftX.amp, { duration: MOTION.blob2DriftX.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(-MOTION.blob2DriftX.amp, { duration: MOTION.blob2DriftX.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    cardDriftX.value = withRepeat(withSequence(
      withTiming(MOTION.cardDriftX.amp, { duration: MOTION.cardDriftX.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(-MOTION.cardDriftX.amp, { duration: MOTION.cardDriftX.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: MOTION.cardDriftX.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
    beamX1.value = withRepeat(withSequence(
      withTiming(SW + 260, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
      withTiming(-SW - 260, { duration: 0 }),
      withTiming(-SW - 260, { duration: 900 }),
    ), -1, false);
    beamX2.value = withRepeat(withSequence(
      withTiming(-SW - 220, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
      withTiming(SW + 220, { duration: 0 }),
      withTiming(SW + 220, { duration: 1200 }),
    ), -1, false);
    cardFloat.value = withDelay(MOTION.heroDelays.card + 180, withRepeat(withSequence(
      withTiming(MOTION.cardFloatY.amp, { duration: MOTION.cardFloatY.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: MOTION.cardFloatY.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, true));
    ctaPulse.value = withDelay(1200, withRepeat(withSequence(
      withTiming(MOTION.ctaPulse.max, { duration: MOTION.ctaPulse.dur, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0, { duration: MOTION.ctaPulse.dur, easing: Easing.inOut(Easing.sin) }),
    ), -1, false));
    shimX.value = withDelay(MOTION.shimStartDelay, withRepeat(withSequence(
      withTiming(SW + 120, { duration: 700, easing: Easing.out(Easing.quad) }),
      withTiming(-SW,      { duration: 0 }),
      withTiming(-SW,      { duration: 2400 }),
    ), -1, false));
  }, []);

  const chipAnims = [chip0Anim, chip1Anim, chip2Anim];
  const tickerAnims = [tick0Anim, tick1Anim, tick2Anim];

  const blob1Style    = useAnimatedStyle(() => ({ transform: [{ scale: blob1S.value }, { translateX: blob1X.value }, { translateY: blob1DriftY.value }] }));
  const blob2Style    = useAnimatedStyle(() => ({ transform: [{ scale: blob2S.value }, { translateY: blob2Y.value }, { translateX: blob2DriftX.value }] }));
  const cardFloatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cardFloat.value }, { translateX: cardDriftX.value }] }));
  const beam1Style = useAnimatedStyle(() => ({ transform: [{ translateX: beamX1.value }, { rotate: '-18deg' }] }));
  const beam2Style = useAnimatedStyle(() => ({ transform: [{ translateX: beamX2.value }, { rotate: '16deg' }] }));
  const ctaPulseStyle  = useAnimatedStyle(() => ({ transform: [{ scale: ctaPulse.value }] }));
  const shimStyle      = useAnimatedStyle(() => ({ transform: [{ translateX: shimX.value }] }));
  const heroRippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(heroRipple.value, [0, 1], [0, 0.28]),
    transform: [{ scale: interpolate(heroRipple.value, [0, 1], [0.2, 1.9]) }],
  }));
  const ctaRippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ctaRipple.value, [0, 1], [0, 0.26]),
    transform: [{ scale: interpolate(ctaRipple.value, [0, 1], [0.2, 1.8]) }],
  }));

  if (isLoading) return <View style={s.loader}><ActivityIndicator color={HERO1} size="large" /></View>;
  if (user)      return <Redirect href="/(tabs)" />;

  const go  = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(onboarding)/create-account'); };
  const log = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);  router.push('/(onboarding)/login'); };
  const triggerHeroRipple = () => {
    heroRipple.value = 0;
    heroRipple.value = withSequence(
      withTiming(1, { duration: MOTION.ripple.heroIn }),
      withTiming(0, { duration: MOTION.ripple.heroOut }),
    );
  };
  const triggerCtaRipple = () => {
    ctaRipple.value = 0;
    ctaRipple.value = withSequence(
      withTiming(1, { duration: MOTION.ripple.ctaIn }),
      withTiming(0, { duration: MOTION.ripple.ctaOut }),
    );
  };

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ══════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════ */}
        <View style={s.hero}>
          <LinearGradient
            colors={[HERO1, HERO2, HERO3]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Glow blobs */}
          <Animated.View style={[s.blob1, blob1Style]} pointerEvents="none" />
          <Animated.View style={[s.blob2, blob2Style]} pointerEvents="none" />
          <Animated.View style={[s.heroBeam, beam1Style]} pointerEvents="none">
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={[s.heroBeam2, beam2Style]} pointerEvents="none">
            <LinearGradient colors={['rgba(46,255,213,0)', 'rgba(46,255,213,0.22)', 'rgba(46,255,213,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>

          {/* Nav */}
          <SafeAreaView edges={['top']}>
            <Animated.View style={[s.nav, navAnim]}>
              <View style={s.brand}>
                <View style={s.brandIcon}>
                  <Ionicons name="checkmark" size={15} color={WHITE} />
                </View>
                <Text style={s.brandName}>AllGood</Text>
              </View>
              <Pressable onPress={log} style={s.navSignIn} accessibilityRole="button" accessibilityLabel="Sign in">
                <Text style={s.navSignInTxt}>Sign in</Text>
              </Pressable>
            </Animated.View>

            {/* Eyebrow */}
            <Animated.View style={[s.badge, badgeAnim]}>
              <View style={s.badgeDot} />
              <Text style={s.badgeTxt}>Built for immigrants · ITIN accepted · No SSN</Text>
            </Animated.View>

            {/* Headline */}
            <Animated.Text style={[s.heroH1, h1aAnim]}>Move money.</Animated.Text>
            <Animated.Text style={[s.heroH1, s.heroH1b, h1bAnim]}>Build power.</Animated.Text>

            <Animated.Text style={[s.heroSub, subAnim]}>
              Send money home fast, grow your US credit, and learn finance in your language.{"\n"}No SSN required.
            </Animated.Text>

            <Animated.View style={[s.heroChipRow, subAnim]}>
              {HERO_CHIPS.map((chip, i) => (
                <Animated.View key={i} style={chipAnims[i]}>
                  <View style={s.heroChip}>
                    <Ionicons name={chip.icon} size={13} color={WHITE} />
                    <Text style={s.heroChipTxt}>{chip.txt}</Text>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>

            {/* Buttons */}
            <Animated.View style={[s.heroBtns, btnsAnim]}>
              <Pressable onPressIn={triggerHeroRipple} onPress={go} style={s.btnCreate} accessibilityRole="button" accessibilityLabel="Create free account">
                <View style={s.btnCreateInner}>
                  <Animated.View style={[s.shimmer, shimStyle]} />
                  <Animated.View pointerEvents="none" style={[s.btnRipple, heroRippleStyle]} />
                  <Text style={s.btnCreateTxt}>Open your account</Text>
                  <Ionicons name="arrow-forward" size={16} color={HERO1} />
                </View>
              </Pressable>
              <Pressable onPress={log} style={s.btnGhost} accessibilityRole="button" accessibilityLabel="I already have an account">
                <Text style={s.btnGhostTxt}>I already have an account</Text>
              </Pressable>
            </Animated.View>

            {/* Stars */}
            <Animated.View style={[s.stars, rateAnim]}>
              {[1,2,3,4,5].map(i => <Ionicons key={i} name="star" size={12} color={GOLD} />)}
              <Text style={s.starsTxt}>4.9 · Trusted by 200K+ people</Text>
            </Animated.View>
            {/* Proof ticker */}
            <Animated.View style={[s.heroTicker, rateAnim]}>
              {HERO_TICKERS.map((item, i) => (
                <Animated.View key={i} style={tickerAnims[i]}>
                  <View style={s.heroTickerPill}>
                    <Ionicons name={item.icon} size={12} color={WHITE} />
                    <Text style={s.heroTickerTxt}>{item.txt}</Text>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>

            {/* App card */}
            <Animated.View style={[s.appCard, cardAnim]}>
              <Animated.View style={cardFloatStyle}>
                <View style={s.appCardInner}>
                  <View style={s.appCardTop}>
                    <View>
                      <Text style={s.appCardLabel}>Total balance</Text>
                      <Text style={s.appCardBal}>$2,400.00</Text>
                    </View>
                    <View style={s.livePill}>
                      <View style={s.liveDot} />
                      <Text style={s.liveTxt}>Live</Text>
                    </View>
                  </View>
                  <View style={s.appCardDivider} />
                  <View style={s.appCardActions}>
                    {([
                      { icon: 'arrow-up-outline'       as const, label: 'Send',    color: TEAL,   filled: true },
                      { icon: 'arrow-down-outline'     as const, label: 'Receive', color: WHITE,  filled: false },
                      { icon: 'swap-horizontal-outline' as const, label: 'Convert', color: WHITE,  filled: false },
                      { icon: 'add-outline'            as const, label: 'Top up',  color: WHITE,  filled: false },
                    ]).map((a, i) => (
                      <View key={i} style={s.appCardAction}>
                        {a.filled ? (
                          <LinearGradient colors={[TEAL, '#0EA5A0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.actionIcon}>
                            <Ionicons name={a.icon} size={16} color={BG} />
                          </LinearGradient>
                        ) : (
                          <View style={[s.actionIcon, s.actionIconMuted]}>
                            <Ionicons name={a.icon} size={16} color={WHITE} />
                          </View>
                        )}
                        <Text style={s.actionLbl}>{a.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.appCardTx}>
                    <View style={s.txIcon}>
                      <Ionicons name="checkmark-circle" size={17} color={TEAL} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.txName}>Transfer to Mexico · confirmed</Text>
                      <Text style={s.txMeta}>$3.99 fee · arrived in 2 min</Text>
                    </View>
                    <Text style={s.txAmt}>-$200</Text>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>

            <Animated.View style={[s.momentumRow, rateAnim]}>
              {[
                { icon: 'trending-up-outline' as const, title: '+42 pts', sub: 'Credit growth' },
                { icon: 'globe-outline' as const, title: '47 FX', sub: 'Live corridors' },
                { icon: 'time-outline' as const, title: '2 min', sub: 'Avg delivery' },
              ].map((m, i) => (
                <View key={i} style={s.momentumCard}>
                  <Ionicons name={m.icon} size={14} color={WHITE} />
                  <Text style={s.momentumTitle}>{m.title}</Text>
                  <Text style={s.momentumSub}>{m.sub}</Text>
                </View>
              ))}
            </Animated.View>
          </SafeAreaView>
        </View>

        {/* ══════════════════════════════════════════════════
            TRUST STRIP
        ══════════════════════════════════════════════════ */}
        <View style={s.trustStrip}>
          {[
            { icon: 'document-text-outline'    as const, txt: 'ITIN accepted'   },
            { icon: 'ban-outline'              as const, txt: 'Zero hidden fees' },
            { icon: 'shield-checkmark-outline' as const, txt: 'ILP secured'     },
            { icon: 'globe-outline'            as const, txt: '6 languages'     },
          ].map((t, i) => (
            <View key={i} style={s.trustItem}>
              <Ionicons name={t.icon} size={14} color={TEAL} />
              <Text style={s.trustTxt}>{t.txt}</Text>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════
            PROBLEM
        ══════════════════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.eyeRow}>
            <View style={[s.eyeLine, { backgroundColor: RED }]} />
            <Text style={[s.eyeTxt, { color: RED }]}>The hard truth</Text>
          </View>
          <Text style={s.sectionH2}>You deserve{'\n'}a better financial start.</Text>
          <Text style={s.sectionSub}>
            Banks turn you away. Transfers bleed your paycheck. Credit scores reset at the border. AllGood was built to fix all of that.
          </Text>
          <View style={s.painCards}>
            {[
              'Banks demand SSN to open an account',
              'Wire fees eat 8–15% of every transfer',
              'Credit history resets at the border',
              'Financial systems are English-only',
            ].map((txt, i) => {
              const painAnim = useEntrance(1100 + i * 120, 24);
              return (
                <Animated.View key={i} style={[s.painCard, painAnim]}>
                  <View style={s.painIconWrap}>
                    <Ionicons name="close-circle" size={18} color={RED} />
                  </View>
                  <Text style={s.painTxt}>{txt}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            FEATURES — FLIP CARDS
        ══════════════════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.eyeRow}>
            <View style={[s.eyeLine, { backgroundColor: TEAL }]} />
            <Text style={[s.eyeTxt, { color: TEAL }]}>What we offer</Text>
          </View>
          <Text style={s.sectionH2}>Everything you need.{'\n'}In one place.</Text>
          <Text style={s.sectionSub}>Tap any card to learn more.</Text>
          <View style={s.featGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={{ width: (SW - 48 - 10) / 2 }}>
                <FlipCard feature={f} style={featAnims[i]} />
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            STATS
        ══════════════════════════════════════════════════ */}
        <View style={[s.section, s.statsBg]}>
          <LinearGradient colors={[HERO1 + '20', HERO2 + '10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={s.eyeRow}>
            <View style={[s.eyeLine, { backgroundColor: PURPLE }]} />
            <Text style={[s.eyeTxt, { color: PURPLE }]}>Our impact</Text>
          </View>
          <Text style={s.sectionH2}>Built for real{'\n'}daily outcomes.</Text>
          <View style={s.statsGrid}>
            {STATS.map((st, i) => <StatTile key={i} stat={st} index={i} />)}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.eyeRow}>
            <View style={[s.eyeLine, { backgroundColor: TEAL }]} />
            <Text style={[s.eyeTxt, { color: TEAL }]}>Get started</Text>
          </View>
          <Text style={s.sectionH2}>Get started{'\n'}in minutes.</Text>
          <View style={s.stepsCol}>
            {[
              { n: '01', title: 'Create your account',    body: 'ITIN, passport, or Matrícula Consular. No SSN needed. Takes under 2 minutes.', tint: TEAL   },
              { n: '02', title: 'Quick biometric verify', body: 'Face or fingerprint. No branch visits. No paperwork. Faster than any bank.',   tint: PURPLE },
              { n: '03', title: 'Send, save & build',     body: 'Transfer money home. Grow your credit score. Track every dollar you earn.',    tint: CORAL  },
            ].map((step, i) => {
              const stepAnim = useEntrance(1600 + i * 140, 28);
              return (
                <Animated.View key={i} style={[s.stepRow, stepAnim]}>
                  <View style={[s.stepNumWrap, { backgroundColor: step.tint + '28', borderColor: step.tint + '45' }]}>
                    <Text style={[s.stepNum, { color: step.tint }]}>{step.n}</Text>
                  </View>
                  <View style={s.stepLine}>
                    {i < 2 && <View style={[s.stepConnector, { backgroundColor: step.tint + '40' }]} />}
                  </View>
                  <View style={s.stepContent}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepBody}>{step.body}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.eyeRow}>
            <View style={[s.eyeLine, { backgroundColor: PINK }]} />
            <Text style={[s.eyeTxt, { color: PINK }]}>Real stories</Text>
          </View>
          <Text style={s.sectionH2}>People like you.</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SW - 48}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
          >
            {TESTIMONIALS.map((t, i) => {
              const testFloat = useSharedValue(0);
              useEffect(() => {
                testFloat.value = withRepeat(withSequence(
                  withTiming(-6, { duration: 2400 + i * 200, easing: Easing.inOut(Easing.sin) }),
                  withTiming(6, { duration: 2400 + i * 200, easing: Easing.inOut(Easing.sin) }),
                ), -1, true);
              }, []);
              const testFloatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: testFloat.value }] }));
              return (
                <Animated.View key={i} style={[s.quoteCard, { width: SW - 64 }, testFloatStyle]}>
                  <LinearGradient colors={[t.tint + '28', t.tint + '08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={[StyleSheet.absoluteFill, { borderRadius: 20, borderWidth: 1.5, borderColor: t.tint + '40', opacity: 0.6 }]} />
                  <View style={[s.quoteTop, { borderTopColor: t.tint }]}>
                    <Ionicons name="chatbubble-ellipses" size={18} color={t.tint} />
                  </View>
                  <Text style={s.quoteTxt}>"{t.quote}"</Text>
                  <View style={s.quoteAuthor}>
                    <View style={[s.quoteAvatar, { backgroundColor: t.tint + '35' }]}>
                      <Text style={[s.quoteInit, { color: t.tint }]}>{t.init}</Text>
                    </View>
                    <View>
                      <Text style={s.quoteName}>{t.name}</Text>
                      <Text style={s.quoteFrom}>{t.from}</Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* ══════════════════════════════════════════════════
            COMPARE
        ══════════════════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.eyeRow}>
            <View style={[s.eyeLine, { backgroundColor: TEAL }]} />
            <Text style={[s.eyeTxt, { color: TEAL }]}>vs traditional banks</Text>
          </View>
          <Text style={s.sectionH2}>See the difference.</Text>
          {[
            { bad: '$25–45 wire fee',         good: '$3.99 flat — always'  },
            { bad: 'SSN required',            good: 'ITIN or passport OK'  },
            { bad: 'Credit resets at border', good: 'History transfers'    },
            { bad: 'English only',            good: '6 languages'          },
          ].map((row, i) => {
            const compAnim = useEntrance(1900 + i * 100, 20);
            return (
              <Animated.View key={i} style={[s.compareRow, compAnim]}>
                <View style={s.compareBad}>
                  <Ionicons name="close-circle" size={16} color={RED} />
                  <Text style={s.compareBadTxt}>{row.bad}</Text>
                </View>
                <View style={s.compareGood}>
                  <Ionicons name="checkmark-circle" size={16} color={TEAL} />
                  <Text style={s.compareGoodTxt}>{row.good}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* ══════════════════════════════════════════════════
            CTA
        ══════════════════════════════════════════════════ */}
        <View style={s.ctaOuter}>
          <LinearGradient
            colors={[HERO1, HERO2, HERO3]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.ctaCard}
          >
            <View style={s.ctaOrb1} />
            <View style={s.ctaOrb2} />

            <View style={s.ctaFlags}>
              {['🇲🇽','🇧🇷','🇨🇴','🇵🇭','🇮🇳'].map((f, i) => (
                <View key={i} style={[s.ctaFlag, i > 0 && { marginLeft: -10 }]}>
                  <Text style={{ fontSize: 16 }}>{f}</Text>
                </View>
              ))}
              <Text style={s.ctaFlagTxt}>  200,000+ people joined</Text>
            </View>

            <Text style={s.ctaH2}>Your next chapter starts funded.{"\n"}Open AllGood today.</Text>
            <Text style={s.ctaSub}>Join a movement of immigrants turning every paycheck into progress, credit, and confidence.</Text>

            <Animated.View style={ctaPulseStyle}>
              <Pressable onPressIn={triggerCtaRipple} onPress={go} style={s.ctaBtn} accessibilityRole="button" accessibilityLabel="Create free account">
                <Animated.View pointerEvents="none" style={[s.btnRipple, ctaRippleStyle]} />
                <Text style={s.ctaBtnTxt}>Create free account</Text>
                <Ionicons name="arrow-forward" size={16} color={HERO1} />
              </Pressable>
            </Animated.View>

            <Text style={s.ctaNote}>Free forever · No credit card · Real support</Text>

            <Pressable onPress={log} style={s.ctaGhost} accessibilityRole="button" accessibilityLabel="I already have an account">
              <Text style={s.ctaGhostTxt}>I already have an account</Text>
            </Pressable>
          </LinearGradient>
        </View>

        <View style={{ height: 60, backgroundColor: BG }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  loader: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: { paddingBottom: 40, overflow: 'hidden' },
  blob1: {
    position: 'absolute', width: 360, height: 360, borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.12)', top: -120, left: -100,
  },
  blob2: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(0,0,0,0.15)', bottom: -40, right: -80,
  },
  heroBeam: {
    position: 'absolute',
    width: 180,
    height: 620,
    top: -130,
    opacity: 0.9,
  },
  heroBeam2: {
    position: 'absolute',
    width: 120,
    height: 560,
    top: -80,
    opacity: 0.85,
  },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  brand:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  brandName: { fontSize: 17, fontWeight: '800', color: WHITE, letterSpacing: -0.4 },
  navSignIn: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  navSignInTxt: { fontSize: 14, fontWeight: '600', color: WHITE },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 24, marginTop: 8, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: WHITE },
  badgeTxt:  { fontSize: 12, fontWeight: '600', color: WHITE },

  heroH1: { fontSize: 48, fontWeight: '900', color: WHITE, letterSpacing: -2.5, lineHeight: 54, paddingHorizontal: 24 },
  heroH1b: { marginBottom: 18, opacity: 0.92 },
  heroSub: { fontSize: 16, color: 'rgba(255,255,255,0.86)', lineHeight: 24, paddingHorizontal: 24, marginBottom: 14 },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroChipTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: WHITE,
  },

  heroBtns: { paddingHorizontal: 24, gap: 12, marginBottom: 20 },
  btnCreate: {
    borderRadius: 16, backgroundColor: WHITE, overflow: 'hidden', shadowColor: '#00A6FB',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 12,
  },
  btnCreateInner: {
    position: 'relative',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 17, paddingHorizontal: 24,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 60,
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ skewX: '-20deg' }],
  },
  btnCreateTxt: { fontSize: 16, fontWeight: '800', color: HERO1, letterSpacing: -0.3 },
  btnGhost: {
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: 15, alignItems: 'center',
  },
  btnGhostTxt: { fontSize: 15, fontWeight: '600', color: WHITE },

  stars: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 24, marginBottom: 28 },
  starsTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginLeft: 4 },

  heroTicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  heroTickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(7,16,23,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  heroTickerTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.94)',
  },
  btnRipple: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: HERO1,
  },

  // App card in hero
  appCard: { marginHorizontal: 24 },
  appCardInner: {
    backgroundColor: 'rgba(10,10,26,0.9)',
    borderRadius: 22, padding: 20,
    borderWidth: 1.5, borderColor: 'rgba(46,255,213,0.28)',
  },
  appCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  appCardLabel: { fontSize: 11, color: MUTED, fontWeight: '500', marginBottom: 3 },
  appCardBal:   { fontSize: 32, fontWeight: '900', color: WHITE, letterSpacing: -1.6 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: TEAL + '22', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: TEAL + '40',
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: TEAL },
  liveTxt: { fontSize: 10, fontWeight: '700', color: TEAL },
  appCardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  appCardActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  appCardAction:  { alignItems: 'center', gap: 5 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionIconMuted: { backgroundColor: 'rgba(255,255,255,0.08)' },
  actionLbl: { fontSize: 10, color: MUTED, fontWeight: '500' },
  appCardTx: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 12,
  },
  txIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: TEAL + '20', alignItems: 'center', justifyContent: 'center' },
  txName: { fontSize: 12, fontWeight: '600', color: WHITE, marginBottom: 1 },
  txMeta: { fontSize: 10, color: MUTED },
  txAmt:  { fontSize: 13, fontWeight: '700', color: RED },

  momentumRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  momentumCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(7,16,23,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 3,
  },
  momentumTitle: { fontSize: 14, fontWeight: '800', color: WHITE },
  momentumSub: { fontSize: 10, color: 'rgba(255,255,255,0.78)', fontWeight: '600' },

  // Trust strip
  trustStrip: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 24, paddingVertical: 18,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 4 },
  trustTxt:  { fontSize: 11, fontWeight: '600', color: MUTED },

  // Sections
  section: { paddingHorizontal: 24, paddingVertical: 28 },
  statsBg: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  eyeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eyeLine: { width: 28, height: 2.5, borderRadius: 2 },
  eyeTxt:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionH2: { fontSize: 28, fontWeight: '900', color: WHITE, letterSpacing: -1.2, lineHeight: 34, marginBottom: 8 },
  sectionSub: { fontSize: 14, color: MUTED, lineHeight: 21, marginBottom: 18 },

  // Pain cards
  painCards: { gap: 10 },
  painCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: RED + '08', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: RED + '35',
  },
  painIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: RED + '25', alignItems: 'center', justifyContent: 'center' },
  painTxt: { fontSize: 14, color: WHITE, fontWeight: '500', flex: 1, lineHeight: 20 },

  // Feature flip cards
  featGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    justifyContent: 'space-between',
  },

  // Steps
  stepsCol: { gap: 0, marginTop: 8 },
  stepRow:  { flexDirection: 'row', gap: 16, paddingBottom: 28 },
  stepNumWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, flexShrink: 0,
  },
  stepNum:       { fontSize: 13, fontWeight: '800', letterSpacing: -0.3 },
  stepLine:      { width: 0, alignItems: 'center' },
  stepConnector: { position: 'absolute', top: 48, width: 1.5, height: 28 },
  stepContent:   { flex: 1, paddingTop: 6 },
  stepTitle:     { fontSize: 16, fontWeight: '700', color: WHITE, marginBottom: 4 },
  stepBody:      { fontSize: 14, color: MUTED, lineHeight: 21 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },

  // Testimonials
  quoteCard: {
    backgroundColor: SURFACE, borderRadius: 20, padding: 22,
    overflow: 'hidden', borderWidth: 1.5, borderColor: BORDER2,
  },
  quoteTop:  { marginBottom: 14 },
  quoteTxt:  { fontSize: 15, color: WHITE, lineHeight: 24, fontWeight: '500', marginBottom: 18 },
  quoteAuthor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quoteAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quoteInit:   { fontSize: 15, fontWeight: '800' },
  quoteName:   { fontSize: 14, fontWeight: '700', color: WHITE },
  quoteFrom:   { fontSize: 12, color: MUTED, marginTop: 1 },

  // Compare
  compareRow: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  compareBad: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: RED + '15', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: RED + '35',
  },
  compareBadTxt:  { fontSize: 13, color: RED, fontWeight: '600', flex: 1 },
  compareGood: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: TEAL + '15', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: TEAL + '35',
  },
  compareGoodTxt: { fontSize: 13, color: TEAL, fontWeight: '600', flex: 1 },

  // CTA
  ctaOuter: { paddingHorizontal: 20, paddingVertical: 12 },
  ctaCard: {
    borderRadius: 28, padding: 32, overflow: 'hidden',
  },
  ctaOrb1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.1)', top: -80, right: -60,
  },
  ctaOrb2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(0,0,0,0.1)', bottom: -40, left: -30,
  },
  ctaFlags:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  ctaFlag:   { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  ctaFlagTxt: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  ctaH2: { fontSize: 34, fontWeight: '900', color: WHITE, letterSpacing: -1.5, lineHeight: 40, marginBottom: 10 },
  ctaSub: { fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 23, marginBottom: 28 },
  ctaBtn: {
    position: 'relative',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: WHITE, borderRadius: 16, paddingVertical: 17, marginBottom: 12,
    overflow: 'hidden',
  },
  ctaBtnTxt:  { fontSize: 16, fontWeight: '800', color: HERO1, letterSpacing: -0.3 },
  ctaNote:    { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 14 },
  ctaGhost: {
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 14,
  },
  ctaGhostTxt: { fontSize: 15, fontWeight: '600', color: WHITE },
});

// ── Flip card styles ──────────────────────────────────────────
const fc = StyleSheet.create({
  wrap: { },
  glowBg: {
    position: 'absolute',
    top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 12,
    borderWidth: 1.5,
    zIndex: -1,
  },
  card: {
    backgroundColor: SURFACE, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: BORDER2, overflow: 'hidden', minHeight: 100,
  },
  cardBack: {
    backgroundColor: SURF2,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title:    { fontSize: 14, fontWeight: '700', color: WHITE, marginBottom: 3 },
  sub:      { fontSize: 12, color: MUTED, lineHeight: 17 },
  backDesc: { fontSize: 13, lineHeight: 20 },
  tapHint:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  tapTxt:   { fontSize: 10, fontWeight: '500' },
});

// ── Stat tile styles ──────────────────────────────────────────
const st = StyleSheet.create({
  tile: {
    flex: 1, minWidth: (SW - 48 - 12) / 2, backgroundColor: SURFACE,
    borderRadius: 18, padding: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER2,
  },
  glowRing: {
    position: 'absolute',
    top: -2, left: -2, right: -2, bottom: -2,
    borderRadius: 20,
    borderWidth: 2,
  },
  dot:   { width: 6, height: 6, borderRadius: 3, marginBottom: 10 },
  num:   { fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginBottom: 4 },
  label: { fontSize: 12, color: MUTED, fontWeight: '500' },
});
