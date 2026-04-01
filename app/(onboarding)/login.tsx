/**
 * Login — vibrant gradient header, clean dark form.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import {
  authenticateWithBiometrics,
  getBiometricPreference,
  getBiometricType,
  isBiometricAvailable,
} from '@/lib/biometrics';

// ── Palette ──────────────────────────────────────────────────
const HERO1  = '#00A6FB';
const HERO2  = '#06D6A0';
const HERO3  = '#FF7A18';
const BG     = '#071017';
const SURF   = '#13132A';
const SURF2  = '#1C1C35';
const WHITE  = '#F0F0FF';
const MUTED  = 'rgba(240,240,255,0.5)';
const TEAL   = '#2EFFD5';
const ERR    = '#FF6B6B';
const ERR_BG = 'rgba(255,107,107,0.12)';
const LAST_LOGIN_EMAIL_KEY = '@allgood_last_login_email';

export default function LoginScreen() {
  const { signIn, resetPassword } = useAuth();

  const [email, setEmail]       = useState('');
  const [pass, setPass]         = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [focused, setFocused]   = useState<string | null>(null);

  const [sheetOpen, setSheetOpen]       = useState(false);
  const [resetEmail, setResetEmail]     = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent]       = useState(false);
  const [resetErr, setResetErr]         = useState<string | null>(null);

  const [bioAvail, setBioAvail]     = useState(false);
  const [bioType, setBioType]       = useState('Biometric');
  const [bioEnabled, setBioEnabled] = useState(false);

  const passRef = useRef<TextInput>(null);
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Entrance animations
  const headerOp = useSharedValue(0);
  const headerY  = useSharedValue(-20);
  const formOp   = useSharedValue(0);
  const formY    = useSharedValue(30);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    headerOp.value = withTiming(1, { duration: 480 });
    headerY.value  = withSpring(0, { damping: 20, stiffness: 120 });
    formOp.value   = withDelay(160, withTiming(1, { duration: 480 }));
    formY.value    = withDelay(160, withSpring(0, { damping: 18, stiffness: 110 }));

    (async () => {
      const ok = await isBiometricAvailable();
      setBioAvail(ok);
      if (ok) {
        setBioType(await getBiometricType());
        setBioEnabled(await getBiometricPreference());
      }

      const rememberedEmail = await AsyncStorage.getItem(LAST_LOGIN_EMAIL_KEY);
      if (rememberedEmail) setEmail(rememberedEmail);
    })();
  }, []);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOp.value, transform: [{ translateY: headerY.value }] }));
  const formStyle   = useAnimatedStyle(() => ({ opacity: formOp.value,   transform: [{ translateY: formY.value   }] }));
  const btnStyle    = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const canSubmit = emailRx.test(email.trim()) && pass.length > 0;

  const handleSignIn = async () => {
    setError(null);
    if (!emailRx.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (!pass) { setError('Enter your password.'); return; }
    setLoading(true);
    try {
      const { error: err } = await signIn(email.trim(), pass);
      if (err) setError(err);
      else {
        await AsyncStorage.setItem(LAST_LOGIN_EMAIL_KEY, email.trim());
        router.replace('/(tabs)');
      }
    } catch (e: any) { setError(e?.message ?? 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const handleBio = async () => {
    setError(null);
    if (!emailRx.test(email.trim())) { setError('Enter your email first.'); return; }
    if (!pass) { setError('Enter your password, then use biometrics.'); return; }
    const ok = await authenticateWithBiometrics('Confirm your identity');
    if (!ok) return;
    setLoading(true);
    try {
      const { error: err } = await signIn(email.trim(), pass);
      if (err) setError(err); else {
        await AsyncStorage.setItem(LAST_LOGIN_EMAIL_KEY, email.trim());
        router.replace('/(tabs)');
      }
    } catch (e: any) { setError(e?.message ?? 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if (!resetEmail.trim()) { setResetErr('Enter your email.'); return; }
    setResetLoading(true); setResetErr(null);
    try {
      const { error: err } = await resetPassword(resetEmail.trim());
      if (err) setResetErr(err); else setResetSent(true);
    } catch (e: any) { setResetErr(e?.message ?? 'Something went wrong.'); }
    finally { setResetLoading(false); }
  };

  const closeSheet = () => {
    setSheetOpen(false); setResetEmail(''); setResetSent(false); setResetErr(null);
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* ── Gradient header ────────────────────────────── */}
        <Animated.View style={[s.header, headerStyle]}>
          <LinearGradient
            colors={[HERO1, HERO2, HERO3]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.headerOrb1} />
          <View style={s.headerOrb2} />

          <SafeAreaView edges={['top']}>
            <View style={s.topBar}>
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace('/(onboarding)')}
                style={s.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="arrow-back" size={18} color={WHITE} />
              </Pressable>
              <View style={s.brand}>
                <View style={s.brandMark}>
                  <Ionicons name="checkmark" size={13} color={WHITE} />
                </View>
                <Text style={s.brandTxt}>AllGood</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            <View style={s.headerContent}>
              <Text style={s.welcomeTxt}>Welcome back.</Text>
              <Text style={s.welcomeSub}>Sign in to continue building your financial future.</Text>
              <View style={s.headerPills}>
                <View style={s.headerPill}>
                  <Ionicons name="flash-outline" size={12} color={WHITE} />
                  <Text style={s.headerPillTxt}>Fast transfers</Text>
                </View>
                <View style={s.headerPill}>
                  <Ionicons name="shield-checkmark-outline" size={12} color={WHITE} />
                  <Text style={s.headerPillTxt}>Bank-grade security</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* ── Form card ──────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[s.formCard, formStyle]}>

            <View style={s.field}>
              <Text style={s.label}>Email address</Text>
              <View style={[s.inputWrap, focused === 'email' && s.inputFocused]}>
                <Ionicons name="mail-outline" size={18} color={focused === 'email' ? TEAL : MUTED} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="you@email.com"
                  placeholderTextColor={MUTED}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  accessibilityLabel="Email address"
                />
              </View>
            </View>

            <View style={s.field}>
              <View style={s.labelRow}>
                <Text style={s.label}>Password</Text>
                <Pressable
                  onPress={() => { setResetEmail(email); setSheetOpen(true); }}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={s.forgotTxt}>Forgot?</Text>
                </Pressable>
              </View>
              <View style={[s.inputWrap, focused === 'pass' && s.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={focused === 'pass' ? TEAL : MUTED} style={s.inputIcon} />
                <TextInput
                  ref={passRef}
                  style={[s.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={MUTED}
                  value={pass}
                  onChangeText={setPass}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  onFocus={() => setFocused('pass')}
                  onBlur={() => setFocused(null)}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPass(v => !v)}
                  style={s.eyeBtn}
                  accessibilityLabel={showPass ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
                </Pressable>
              </View>
            </View>

            {bioAvail && bioEnabled && (
              <Pressable
                style={s.bioRow}
                onPress={handleBio}
                accessibilityRole="button"
                accessibilityLabel={`Use ${bioType}`}
              >
                <View style={s.bioDot}>
                  <Ionicons
                    name={bioType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                    size={18}
                    color={TEAL}
                  />
                </View>
                <Text style={s.bioTxt}>Continue with {bioType}</Text>
                <Ionicons name="chevron-forward" size={15} color={MUTED} />
              </Pressable>
            )}

            {error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color={ERR} />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}

            <Animated.View style={btnStyle}>
              <Pressable
                onPress={handleSignIn}
                onPressIn={() => { btnScale.value = withSpring(0.97, { damping: 20 }); }}
                onPressOut={() => { btnScale.value = withSpring(1,    { damping: 20 }); }}
                disabled={!canSubmit || loading}
                style={[s.cta, (!canSubmit || loading) && s.ctaDim]}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                <LinearGradient
                  colors={[HERO1, HERO2, HERO3]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  {loading ? (
                    <Text style={s.ctaTxt}>Signing in…</Text>
                  ) : (
                    <>
                      <Text style={s.ctaTxt}>Sign in</Text>
                      <Ionicons name="arrow-forward" size={17} color={WHITE} />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>New to AllGood?</Text>
              <View style={s.divLine} />
            </View>

            <Pressable
              style={s.createBtn}
              onPress={() => router.replace('/(onboarding)/create-account')}
              accessibilityRole="link"
              accessibilityLabel="Create a free account"
            >
              <Text style={s.createTxt}>Create a free account</Text>
              <Ionicons name="arrow-forward" size={15} color={HERO1} />
            </Pressable>

            <View style={s.trustRow}>
              {[
                { icon: 'shield-checkmark-outline' as const, txt: 'ITIN accepted' },
                { icon: 'ban-outline'              as const, txt: '$0 monthly fee' },
                { icon: 'lock-closed-outline'      as const, txt: 'ILP secured' },
              ].map((t, i) => (
                <View key={i} style={s.trustItem}>
                  <Ionicons name={t.icon} size={12} color={TEAL} />
                  <Text style={s.trustTxt}>{t.txt}</Text>
                </View>
              ))}
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot password modal ───────────────────────────── */}
      <Modal visible={sheetOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeSheet}>
        <SafeAreaView style={s.sheet} edges={['top', 'bottom']}>
          <View style={s.sheetTop}>
            <Text style={s.sheetTitle}>Reset password</Text>
            <Pressable onPress={closeSheet} style={s.sheetClose} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={WHITE} />
            </Pressable>
          </View>

          {resetSent ? (
            <View style={s.sheetBody}>
              <View style={s.sentCircle}>
                <Ionicons name="mail-open-outline" size={28} color={TEAL} />
              </View>
              <Text style={s.sentHead}>Check your inbox</Text>
              <Text style={s.sentSub}>
                We sent a reset link to{' '}
                <Text style={{ fontWeight: '700', color: WHITE }}>{resetEmail}</Text>.
              </Text>
              <Pressable onPress={closeSheet} style={[s.cta, { marginTop: 24 }]}>
                <LinearGradient colors={[HERO1, HERO2, HERO3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                  <Text style={s.ctaTxt}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={s.sheetBody}>
              <Text style={s.sheetDesc}>Enter your sign-in email and we'll send a reset link.</Text>
              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={MUTED} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="you@email.com"
                    placeholderTextColor={MUTED}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>
              </View>
              {resetErr && (
                <View style={s.errBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={ERR} />
                  <Text style={s.errTxt}>{resetErr}</Text>
                </View>
              )}
              <Pressable
                onPress={handleForgot}
                disabled={!resetEmail.trim() || resetLoading}
                style={[s.cta, { marginTop: 8 }, (!resetEmail.trim() || resetLoading) && s.ctaDim]}
              >
                <LinearGradient colors={[HERO1, HERO2, HERO3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                  <Text style={s.ctaTxt}>{resetLoading ? 'Sending…' : 'Send reset link'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: { overflow: 'hidden' },
  headerOrb1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.1)', top: -100, right: -60,
  },
  headerOrb2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(0,0,0,0.12)', bottom: -60, left: -40,
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  brand:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandMark: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  brandTxt: { fontSize: 15, fontWeight: '800', color: WHITE },
  headerContent: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 },
  welcomeTxt: { fontSize: 36, fontWeight: '900', color: WHITE, letterSpacing: -1.5, marginBottom: 8 },
  welcomeSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 22 },
  headerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  headerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(7,16,23,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)',
  },
  headerPillTxt: { fontSize: 11, fontWeight: '700', color: WHITE },

  // Form
  scroll: { flexGrow: 1 },
  formCard: {
    backgroundColor: SURF, margin: 16, borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 12,
  },

  field:    { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label:    { fontSize: 13, fontWeight: '600', color: WHITE, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURF2, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 4,
  },
  inputFocused: { borderColor: HERO1 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: WHITE, paddingVertical: 13 },
  eyeBtn: { padding: 8 },
  forgotTxt: { fontSize: 13, fontWeight: '600', color: HERO1 },

  bioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURF2, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 20,
  },
  bioDot: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: TEAL + '20', alignItems: 'center', justifyContent: 'center',
  },
  bioTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: WHITE },

  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ERR_BG, borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: ERR + '30',
  },
  errTxt: { fontSize: 13, color: ERR, flex: 1, lineHeight: 18 },

  cta:    { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  ctaDim: { opacity: 0.4 },
  ctaGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 17,
  },
  ctaTxt: { fontSize: 16, fontWeight: '800', color: WHITE, letterSpacing: -0.3 },

  divider:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  divLine:  { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  divTxt:   { fontSize: 12, color: MUTED, fontWeight: '500' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: HERO1 + '50', marginBottom: 24,
    backgroundColor: HERO1 + '10',
  },
  createTxt: { fontSize: 15, fontWeight: '700', color: HERO1 },

  trustRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustTxt:  { fontSize: 10, color: MUTED, fontWeight: '500' },

  // Sheet
  sheet:    { flex: 1, backgroundColor: SURF },
  sheetTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: WHITE },
  sheetClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: SURF2, alignItems: 'center', justifyContent: 'center',
  },
  sheetBody: { flex: 1, paddingHorizontal: 22, paddingTop: 22 },
  sheetDesc: { fontSize: 15, color: MUTED, lineHeight: 22, marginBottom: 20 },
  sentCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: TEAL + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  sentHead: { fontSize: 22, fontWeight: '800', color: WHITE, letterSpacing: -0.5, marginBottom: 8 },
  sentSub:  { fontSize: 15, color: MUTED, lineHeight: 22 },
});
