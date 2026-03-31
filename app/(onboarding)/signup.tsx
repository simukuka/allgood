/**
 * Signup — vibrant gradient header, clean 3-step dark form.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';

// ── Palette ──────────────────────────────────────────────────
const HERO1  = '#7F77DD';
const HERO2  = '#D4537E';
const HERO3  = '#D85A30';
const BG     = '#0A0A1A';
const SURF   = '#13132A';
const SURF2  = '#1C1C35';
const WHITE  = '#F0F0FF';
const MUTED  = 'rgba(240,240,255,0.5)';
const TEAL   = '#2EFFD5';
const PURPLE = '#A78BFA';
const PINK   = '#F472B6';
const GREEN  = '#4ADE80';
const ERR    = '#FF6B6B';
const ERR_BG = 'rgba(255,107,107,0.12)';

// Per-step accent tints
const STEP_TINTS = [TEAL, PURPLE, PINK] as const;

const ID_OPTIONS = [
  { value: 'ssn',       label: 'SSN',       full: 'Social Security Number', placeholder: 'XXX-XX-XXXX'      },
  { value: 'itin',      label: 'ITIN',      full: 'Individual Taxpayer ID',  placeholder: '9XX-XX-XXXX'     },
  { value: 'matricula', label: 'Matrícula', full: 'Matrícula Consular',      placeholder: 'Matrícula number' },
  { value: 'passport',  label: 'Passport',  full: 'Passport (Local or Foreign)', placeholder: 'Passport number'  },
];

type Step = 0 | 1 | 2;

// ── Password strength ─────────────────────────────────────────
function getStrength(pw: string) {
  if (!pw) return { score: 0, label: '', color: '#444' };
  let sc = 0;
  if (pw.length >= 8) sc++;
  if (/[A-Z]/.test(pw)) sc++;
  if (/[0-9]/.test(pw)) sc++;
  if (/[^A-Za-z0-9]/.test(pw)) sc++;
  return [
    { score: 1, label: 'Weak',   color: '#ef4444' },
    { score: 2, label: 'Fair',   color: '#f97316' },
    { score: 3, label: 'Good',   color: '#eab308' },
    { score: 4, label: 'Strong', color: '#22c55e' },
  ][Math.max(sc - 1, 0)];
}

// ── Step header content ───────────────────────────────────────
const STEP_INFO = [
  { title: 'About you',      sub: 'Basics first — takes 30 seconds', icon: 'person-outline'         as const },
  { title: 'Verify identity', sub: 'No SSN required — multiple ID types accepted', icon: 'shield-checkmark-outline' as const },
  { title: 'Create login',   sub: 'Almost done — one more step',     icon: 'lock-closed-outline'    as const },
];

// ══════════════════════════════════════════════════════════════
export default function SignupScreen() {
  const { signUp } = useAuth();

  const [step, setStep] = useState<Step>(0);

  const [fullName, setFullName] = useState('');
  const [dob, setDob]           = useState('');
  const [phone, setPhone]       = useState('');
  const [country, setCountry]   = useState('');

  const [idType, setIdType]     = useState(ID_OPTIONS[0].value);
  const [idNumber, setIdNumber] = useState('');

  const [email, setEmail]     = useState('');
  const [pass, setPass]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const passRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const emailRx    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const strength = getStrength(pass);
  const tint     = STEP_TINTS[step];
  const info     = STEP_INFO[step];

  // Animations
  const blobS  = useSharedValue(1);
  const blob2S = useSharedValue(1);
  const formOp = useSharedValue(0);
  const formY  = useSharedValue(18);
  const btnSc  = useSharedValue(1);

  useEffect(() => {
    blobS.value = withRepeat(withSequence(
      withTiming(1.2, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    blob2S.value = withRepeat(withSequence(
      withTiming(1.1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.9, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
  }, []);

  const animateIn = () => {
    formOp.value = 0; formY.value = 18;
    formOp.value = withTiming(1, { duration: 340 });
    formY.value  = withSpring(0, { damping: 18, stiffness: 130 });
  };

  useEffect(() => { animateIn(); }, []);

  const blob1Style = useAnimatedStyle(() => ({ transform: [{ scale: blobS.value }] }));
  const blob2Style = useAnimatedStyle(() => ({ transform: [{ scale: blob2S.value }] }));
  const formStyle  = useAnimatedStyle(() => ({ opacity: formOp.value, transform: [{ translateY: formY.value }] }));
  const btnStyle   = useAnimatedStyle(() => ({ transform: [{ scale: btnSc.value }] }));

  const formatDob = (t: string) => {
    const d = t.replace(/\D/g, '');
    if (d.length >= 5) return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4, 8);
    if (d.length >= 3) return d.slice(0, 2) + '/' + d.slice(2);
    return d;
  };

  const isValid = [
    fullName.trim().length >= 2 && dob.replace(/\D/g,'').length === 8 &&
      phone.replace(/\D/g,'').length >= 8 && country.trim().length >= 2,
    idNumber.trim().length >= 4,
    emailRx.test(email.trim()) && pass.length >= 6 && pass === confirm,
  ];

  const advance = () => {
    setError(null);
    if (step === 0) {
      if (!fullName.trim())                     { setError('Enter your full legal name.'); return; }
      if (dob.replace(/\D/g,'').length < 8)     { setError('Enter your date of birth (MM/DD/YYYY).'); return; }
      if (phone.replace(/\D/g,'').length < 8)   { setError('Enter a valid phone number.'); return; }
      if (!country.trim())                      { setError('Enter your country of residence.'); return; }
      setStep(1); animateIn();
    } else if (step === 1) {
      if (idNumber.trim().length < 4)           { setError('Enter a valid ID number.'); return; }
      setStep(2); animateIn();
    }
  };

  const goBack = () => {
    if (step > 0) { setStep(s => (s - 1) as Step); animateIn(); setError(null); }
    else router.canGoBack() ? router.back() : router.replace('/(onboarding)');
  };

  const handleSignUp = async () => {
    setError(null);
    if (!emailRx.test(email.trim())) { setError('Enter a valid email address.'); return; }
    if (pass.length < 6)             { setError('Password must be at least 6 characters.'); return; }
    if (pass !== confirm)            { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const { error: err } = await signUp(email.trim(), pass, fullName.trim(), {
        phone, country, idType, dob, idNumber,
      });
      if (err) {
        setError(err);
        if (err.toLowerCase().includes('already has an account'))
          router.replace('/(onboarding)/login');
      } else {
        router.push('/(onboarding)/preferences');
      }
    } catch (e: any) { setError(e?.message ?? 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const selectedId = ID_OPTIONS.find(o => o.value === idType)!;

  return (
    <View style={s.root}>
      {/* ── Gradient header ──────────────────────────────── */}
      <View style={s.header}>
        <LinearGradient
          colors={[HERO1, HERO2, HERO3]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[s.headerBlob1, blob1Style]} pointerEvents="none" />
        <Animated.View style={[s.headerBlob2, blob2Style]} pointerEvents="none" />

        <SafeAreaView edges={['top']}>
          {/* Top bar */}
          <View style={s.topBar}>
            <Pressable onPress={goBack} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={18} color={WHITE} />
            </Pressable>

            {/* Step dots */}
            <View style={s.dotsRow}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    step === i && s.dotActive,
                    step > i && s.dotDone,
                  ]}
                />
              ))}
            </View>

            <Text style={s.stepCount}>{step + 1} / 3</Text>
          </View>

          {/* Step title */}
          <View style={s.headerContent}>
            <View style={s.stepIconWrap}>
              <Ionicons name={info.icon} size={20} color={WHITE} />
            </View>
            <Text style={s.stepTitle}>{info.title}</Text>
            <Text style={s.stepSub}>{info.sub}</Text>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[s.formCard, formStyle]}>

            {/* ── Step 0: Personal info ───────────────────── */}
            {step === 0 && (
              <>
                <Field label="Full legal name" done={fullName.trim().length >= 2} tint={tint}>
                  <FieldInput
                    icon="person-outline"
                    placeholder="Maria Garcia"
                    value={fullName}
                    onChangeText={setFullName}
                    focused={focused === 'name'}
                    onFocus={() => setFocused('name')}
                    onBlur={() => setFocused(null)}
                    autoCapitalize="words"
                    returnKeyType="next"
                    tint={tint}
                  />
                </Field>

                <Field label="Date of birth" done={dob.replace(/\D/g,'').length === 8} tint={tint}>
                  <FieldInput
                    icon="calendar-outline"
                    placeholder="MM / DD / YYYY"
                    value={dob}
                    onChangeText={t => setDob(formatDob(t))}
                    focused={focused === 'dob'}
                    onFocus={() => setFocused('dob')}
                    onBlur={() => setFocused(null)}
                    keyboardType="numeric"
                    maxLength={10}
                    tint={tint}
                  />
                </Field>

                <Field label="Phone number" done={phone.replace(/\D/g,'').length >= 8} tint={tint}>
                  <FieldInput
                    icon="call-outline"
                    placeholder="+1 555 123 4567"
                    value={phone}
                    onChangeText={setPhone}
                    focused={focused === 'phone'}
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                    keyboardType="phone-pad"
                    tint={tint}
                  />
                </Field>

                <Field label="Country of residence" done={country.trim().length >= 2} tint={tint}>
                  <FieldInput
                    icon="globe-outline"
                    placeholder="United States"
                    value={country}
                    onChangeText={setCountry}
                    focused={focused === 'country'}
                    onFocus={() => setFocused('country')}
                    onBlur={() => setFocused(null)}
                    autoCapitalize="words"
                    returnKeyType="done"
                    tint={tint}
                  />
                </Field>

                <View style={s.divider}>
                  <View style={s.divLine} />
                  <Text style={s.divTxt}>Have an account?</Text>
                  <View style={s.divLine} />
                </View>
                <Pressable
                  style={[s.ghostBtn, { borderColor: tint + '50', backgroundColor: tint + '10' }]}
                  onPress={() => router.replace('/(onboarding)/login')}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in instead"
                >
                  <Text style={[s.ghostBtnTxt, { color: tint }]}>Sign in instead</Text>
                </Pressable>
              </>
            )}

            {/* ── Step 1: Identity ────────────────────────── */}
            {step === 1 && (
              <>
                {/* Accepted IDs info card */}
                <View style={[s.infoCard, { borderColor: tint + '30', backgroundColor: tint + '0A' }]}>
                  <View style={[s.infoIconWrap, { backgroundColor: tint + '20' }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.infoTitle, { color: tint }]}>Bank-grade security</Text>
                    <Text style={s.infoSub}>AES-256 encrypted · never shared · required by law</Text>
                  </View>
                </View>

                <Text style={s.fieldLabel}>ID type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsScroll}>
                  {ID_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.value}
                      style={[s.chip, idType === opt.value && [s.chipActive, { borderColor: tint, backgroundColor: tint + '20' }]]}
                      onPress={() => { setIdType(opt.value); setIdNumber(''); }}
                      accessibilityRole="radio"
                      accessibilityLabel={opt.full}
                      accessibilityState={{ selected: idType === opt.value }}
                    >
                      {idType === opt.value && <Ionicons name="checkmark-circle" size={13} color={tint} />}
                      <Text style={[s.chipTxt, idType === opt.value && { color: tint, fontWeight: '700' }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={s.chipSub}>{selectedId.full}</Text>

                <Field label="ID number" done={idNumber.trim().length >= 4} tint={tint}>
                  <FieldInput
                    icon="card-outline"
                    placeholder={selectedId.placeholder}
                    value={idNumber}
                    onChangeText={setIdNumber}
                    focused={focused === 'idnum'}
                    onFocus={() => setFocused('idnum')}
                    onBlur={() => setFocused(null)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    tint={tint}
                  />
                </Field>
                <Text style={s.hintTxt}>Stored encrypted · never shared with third parties</Text>
              </>
            )}

            {/* ── Step 2: Credentials ─────────────────────── */}
            {step === 2 && (
              <>
                <Field label="Email address" done={emailRx.test(email.trim())} tint={tint}>
                  <FieldInput
                    icon="mail-outline"
                    placeholder="you@email.com"
                    value={email}
                    onChangeText={setEmail}
                    focused={focused === 'email'}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passRef.current?.focus()}
                    tint={tint}
                  />
                </Field>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Password</Text>
                  <View style={[s.inputWrap, focused === 'pass' && { borderColor: tint }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={focused === 'pass' ? tint : MUTED} style={s.inputIcon} />
                    <TextInput
                      ref={passRef}
                      style={[s.input, { flex: 1 }]}
                      placeholder="At least 6 characters"
                      placeholderTextColor={MUTED}
                      value={pass}
                      onChangeText={setPass}
                      secureTextEntry={!showPass}
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      onFocus={() => setFocused('pass')}
                      onBlur={() => setFocused(null)}
                    />
                    <Pressable onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
                    </Pressable>
                  </View>
                  {pass.length > 0 && (
                    <View style={s.strengthRow}>
                      <View style={s.strengthBar}>
                        {[1,2,3,4].map(seg => (
                          <View key={seg} style={[s.strengthSeg, { backgroundColor: strength.score >= seg ? strength.color : 'rgba(255,255,255,0.1)' }]} />
                        ))}
                      </View>
                      <Text style={[s.strengthLbl, { color: strength.color }]}>{strength.label}</Text>
                    </View>
                  )}
                </View>

                <View style={s.fieldWrap}>
                  <Text style={s.fieldLabel}>Confirm password</Text>
                  <View style={[
                    s.inputWrap,
                    focused === 'confirm' && { borderColor: tint },
                    confirm.length > 0 && pass !== confirm && { borderColor: ERR },
                  ]}>
                    <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={s.inputIcon} />
                    <TextInput
                      ref={confirmRef}
                      style={[s.input, { flex: 1 }]}
                      placeholder="••••••••"
                      placeholderTextColor={MUTED}
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showPass}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleSignUp}
                      onFocus={() => setFocused('confirm')}
                      onBlur={() => setFocused(null)}
                    />
                    {confirm.length > 0 && (
                      <Ionicons
                        name={pass === confirm ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={pass === confirm ? GREEN : ERR}
                      />
                    )}
                  </View>
                  {confirm.length > 0 && pass !== confirm && (
                    <Text style={s.errFieldTxt}>Passwords don't match</Text>
                  )}
                </View>

                <Text style={s.termsTxt}>
                  By creating an account you agree to our Terms of Service and Privacy Policy.
                </Text>
              </>
            )}

            {error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color={ERR} />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}

            {/* CTA */}
            <Animated.View style={btnStyle}>
              <Pressable
                onPress={step < 2 ? advance : handleSignUp}
                onPressIn={() => { btnSc.value = withSpring(0.97, { damping: 20 }); }}
                onPressOut={() => { btnSc.value = withSpring(1,    { damping: 20 }); }}
                disabled={!isValid[step] || loading}
                style={[s.cta, (!isValid[step] || loading) && s.ctaDim]}
                accessibilityRole="button"
                accessibilityLabel={step < 2 ? 'Continue' : 'Create account'}
              >
                <LinearGradient
                  colors={[HERO1, HERO2, HERO3]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  <Text style={s.ctaTxt}>
                    {step < 2 ? 'Continue' : loading ? 'Creating account…' : 'Create account'}
                  </Text>
                  {!loading && <Ionicons name="arrow-forward" size={17} color={WHITE} />}
                </LinearGradient>
              </Pressable>
            </Animated.View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Reusable field components ─────────────────────────────────
function Field({ label, done, tint, children }: { label: string; done: boolean; tint: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <View style={s.labelRow}>
        <Text style={s.fieldLabel}>{label}</Text>
        {done && <Ionicons name="checkmark-circle" size={15} color={tint} />}
      </View>
      {children}
    </View>
  );
}

function FieldInput({
  icon, placeholder, value, onChangeText, focused, onFocus, onBlur,
  tint, secureTextEntry, ...rest
}: {
  icon: any; placeholder: string; value: string; onChangeText: (t: string) => void;
  focused: boolean; onFocus: () => void; onBlur: () => void; tint: string;
  secureTextEntry?: boolean;
  [key: string]: any;
}) {
  return (
    <View style={[s.inputWrap, focused && { borderColor: tint }]}>
      <Ionicons name={icon} size={18} color={focused ? tint : MUTED} style={s.inputIcon} />
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry}
        {...rest}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: { overflow: 'hidden' },
  headerBlob1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.1)', top: -80, right: -50,
  },
  headerBlob2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(0,0,0,0.12)', bottom: -50, left: -30,
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 24, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { backgroundColor: WHITE, width: 32 },
  dotDone:   { backgroundColor: 'rgba(255,255,255,0.8)' },
  stepCount: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', minWidth: 36, textAlign: 'right' },
  headerContent: { paddingHorizontal: 24, paddingBottom: 28, paddingTop: 12 },
  stepIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  stepTitle: { fontSize: 28, fontWeight: '900', color: WHITE, letterSpacing: -1.2, marginBottom: 6 },
  stepSub:   { fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 20 },

  // Form
  scroll:   { flexGrow: 1, paddingBottom: 40 },
  formCard: {
    backgroundColor: SURF, margin: 16, borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 12,
  },

  fieldWrap:  { marginBottom: 20 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: WHITE },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURF2, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 2,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: WHITE, paddingVertical: 13 },
  eyeBtn: { padding: 8 },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 2 },
  strengthLbl: { fontSize: 11, fontWeight: '700' },

  errFieldTxt: { fontSize: 12, color: ERR, marginTop: 5 },

  // Info card
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 20,
  },
  infoIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  infoSub:      { fontSize: 12, color: MUTED, lineHeight: 17 },

  // ID chips
  chipsScroll:  { marginBottom: 8 },
  chips:        { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: SURF2,
  },
  chipActive: {},
  chipTxt:    { fontSize: 13, fontWeight: '600', color: MUTED },
  chipSub:    { fontSize: 12, color: MUTED, marginBottom: 14 },
  hintTxt:    { fontSize: 12, color: MUTED, marginTop: -12, marginBottom: 20, lineHeight: 17 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  divTxt:  { fontSize: 12, color: MUTED, fontWeight: '500' },
  ghostBtn: {
    paddingVertical: 13, alignItems: 'center', borderRadius: 14,
    borderWidth: 1.5, marginBottom: 8,
  },
  ghostBtnTxt: { fontSize: 15, fontWeight: '600' },

  termsTxt: { fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 20, textAlign: 'center' },

  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ERR_BG, borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: ERR + '30',
  },
  errTxt: { fontSize: 13, color: ERR, flex: 1, lineHeight: 18 },

  cta:    { borderRadius: 16, overflow: 'hidden' },
  ctaDim: { opacity: 0.4 },
  ctaGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 17,
  },
  ctaTxt: { fontSize: 16, fontWeight: '800', color: WHITE, letterSpacing: -0.3 },
});
