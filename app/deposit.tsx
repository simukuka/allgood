import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import {
  addFundsToChecking,
  fundWalletFromBankAccount,
  getBankAccounts,
  linkBankAccount,
} from "@/lib/data";
import type { BankAccount } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatCurrency } from "@/utils/currency";

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

const METHODS = [
  { id: "bank", icon: "business-outline" as const, label: "Bank transfer", sub: "2–3 business days · Free" },
  { id: "card", icon: "card-outline" as const, label: "Debit card", sub: "Instant · 1.5% fee" },
  { id: "cash", icon: "cash-outline" as const, label: "Cash deposit", sub: "In-person · Find locations" },
];

export default function DepositScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ topup?: string }>();
  const realBankingEnabled = process.env.EXPO_PUBLIC_REAL_BANKING_ENABLED === "true";

  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("bank");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);

  const [newBankName, setNewBankName] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newAccountLast4, setNewAccountLast4] = useState("");
  const [newRoutingLast4, setNewRoutingLast4] = useState("");
  const [newBankStartingBalance, setNewBankStartingBalance] = useState("500");

  const [bankRef, setBankRef] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [cashLocation, setCashLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Success animation
  const successScale = useSharedValue(0);
  const successOp = useSharedValue(0);
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOp.value,
  }));

  useEffect(() => {
    if (!user) return;
    supabase
      .from("accounts")
      .select("balance")
      .eq("user_id", user.id)
      .eq("account_type", "checking")
      .single()
      .then(({ data }) => {
        if (data) setCurrentBalance(data.balance);
      });

    setBankAccountsLoading(true);
    getBankAccounts(user.id)
      .then((rows) => {
        setBankAccounts(rows);
        if (rows.length > 0) {
          setSelectedBankAccountId((prev) => prev || rows[0].id);
        }
      })
      .finally(() => setBankAccountsLoading(false));
  }, [user]);

  useEffect(() => {
    if (params.topup === "success") {
      setNotice("Funding completed. Your updated balance will appear shortly.");
    } else if (params.topup === "cancel") {
      setNotice("Funding was canceled. No money was moved.");
    }
  }, [params.topup]);

  const handleLinkBank = async () => {
    if (!user) return;
    if (newBankName.trim().length < 2) {
      setError("Enter a valid bank name.");
      return;
    }
    if (newAccountHolder.trim().length < 3) {
      setError("Enter the account holder name.");
      return;
    }
    if (!/^\d{4}$/.test(newAccountLast4)) {
      setError("Account last 4 must be exactly 4 digits.");
      return;
    }

    const parsedStartingBalance = parseFloat(newBankStartingBalance) || 0;
    const { data, error: linkErr } = await linkBankAccount({
      userId: user.id,
      bankName: newBankName.trim(),
      accountHolder: newAccountHolder.trim(),
      accountLast4: newAccountLast4,
      routingLast4: /^\d{4}$/.test(newRoutingLast4) ? newRoutingLast4 : undefined,
      availableBalance: parsedStartingBalance,
      currency: "USD",
    });

    if (linkErr || !data) {
      setError(linkErr || "Unable to link bank account.");
      return;
    }

    setBankAccounts((prev) => [data, ...prev]);
    setSelectedBankAccountId(data.id);
    setError(null);
    setBankRef(`ACH-${data.account_last4}`);
  };

  const numAmount = parseFloat(amount) || 0;
  const fee = selectedMethod === "card" ? numAmount * 0.015 : 0;
  const selectedBankAccount = bankAccounts.find(
    (acc) => acc.id === selectedBankAccountId,
  );
  const fundingDetailsValid =
    selectedMethod === "bank"
      ? !!selectedBankAccountId && bankRef.trim().length >= 6
      : selectedMethod === "card"
        ? /^\d{4}$/.test(cardLast4)
        : cashLocation.trim().length >= 3;

  const canConfirm =
    numAmount >= 5 && numAmount <= 50000 && fundingDetailsValid;

  const depositNote =
    selectedMethod === "bank"
      ? `deposit:bank:ref=${bankRef.trim()}:last4=${selectedBankAccount?.account_last4 || "n/a"}`
      : selectedMethod === "card"
        ? `deposit:card:last4=${cardLast4}`
        : `deposit:cash:location=${cashLocation.trim()}`;

  const handleDeposit = async () => {
    if (!user || !canConfirm) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (realBankingEnabled && (selectedMethod === "bank" || selectedMethod === "card")) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Please sign in again to continue.");

        const response = await fetch("/api/stripe/topup-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            amount: numAmount,
            currency: "USD",
            method: selectedMethod,
          }),
        });

        const payload = await response.json();
        if (!response.ok || !payload?.url) {
          throw new Error(payload?.error || "Unable to start secure bank/card funding.");
        }

        if (typeof window !== "undefined") {
          window.location.assign(payload.url);
          return;
        }

        await WebBrowser.openBrowserAsync(payload.url);
        return;
      }

      if (selectedMethod === "bank") {
        if (!selectedBankAccountId) {
          throw new Error("Link and select a bank account first.");
        }

        const { error: bankFundErr } = await fundWalletFromBankAccount({
          userId: user.id,
          bankAccountId: selectedBankAccountId,
          amount: numAmount,
          note: depositNote,
        });

        if (bankFundErr) throw new Error(bankFundErr);

        setBankAccounts((prev) =>
          prev.map((acc) =>
            acc.id === selectedBankAccountId
              ? { ...acc, available_balance: acc.available_balance - numAmount }
              : acc,
          ),
        );
      } else {
        const { error: addErr } = await addFundsToChecking(user.id, numAmount);
        if (addErr) throw new Error(addErr);

        // Record as a receive transaction for non-bank top-ups
        await supabase.from("transactions").insert({
          sender_id: user.id,
          recipient_id: user.id,
          recipient_name: "Deposit",
          amount: numAmount,
          currency: "USD",
          fee: fee,
          status: "completed",
          type: "receive",
          note: depositNote,
          completed_at: new Date().toISOString(),
        });
      }

      const newBalance = currentBalance + numAmount;
      setCurrentBalance(newBalance);

      setDone(true);
      successScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      successOp.value = withTiming(1, { duration: 300 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.successScreen}>
          <Animated.View style={[styles.successCircle, successStyle]}>
            <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.successGrad}>
              <Ionicons name="checkmark" size={52} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Funds added!</Text>
          <Text style={[styles.successSub, { color: colors.textSecondary }]}>
            {formatCurrency(numAmount, "USD")} has been added to your account.
          </Text>
          <Text style={[styles.newBalance, { color: colors.primary }]}>
            New balance: {formatCurrency(currentBalance + numAmount, "USD")}
          </Text>
          <Pressable
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.doneBtnTxt}>Back to home</Text>
          </Pressable>
          <Pressable onPress={() => { setDone(false); setAmount(""); }} style={styles.addMoreBtn}>
            <Text style={[styles.addMoreTxt, { color: colors.primary }]}>Add more funds</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} style={[styles.backBtn, { backgroundColor: colors.cardBg }]} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="arrow-back" size={19} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add funds</Text>
            <View style={styles.backBtn} />
          </View>

          <LinearGradient
            colors={colors.gradientAccent as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fundingHero}
          >
            <Text style={styles.fundingHeroTitle}>Receive money your way</Text>
            <Text style={styles.fundingHeroSub}>Top up from bank, card, or cash with full visibility before you confirm.</Text>
          </LinearGradient>

          {notice && (
            <View style={[styles.noticeBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}>
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={[styles.noticeTxt, { color: colors.text }]}>{notice}</Text>
            </View>
          )}

          {/* Balance pill */}
          <View style={[styles.balancePill, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.balancePillLabel, { color: colors.textSecondary }]}>Current balance</Text>
            <Text style={[styles.balancePillValue, { color: colors.text }]}>{formatCurrency(currentBalance, "USD")}</Text>
          </View>

          {/* Amount input */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Amount to add</Text>
          <View style={[styles.amountWrap, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
            <Text style={[styles.dollarSign, { color: colors.primary }]}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={(v) => { setAmount(v); setError(null); }}
              autoFocus
            />
          </View>
          {numAmount > 0 && numAmount < 5 && (
            <Text style={[styles.errorTxt, { color: colors.error }]}>Minimum deposit is $5.00</Text>
          )}

          {/* Preset amounts */}
          <View style={styles.presets}>
            {PRESET_AMOUNTS.map((p) => (
              <Pressable
                key={p}
                style={({ pressed }) => [
                  styles.preset,
                  { borderColor: numAmount === p ? colors.primary : colors.border, backgroundColor: numAmount === p ? colors.primary + "12" : colors.cardBg },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setAmount(String(p))}
                accessibilityRole="button"
                accessibilityLabel={`Add $${p}`}
              >
                <Text style={[styles.presetTxt, { color: numAmount === p ? colors.primary : colors.text }]}>${p}</Text>
              </Pressable>
            ))}
          </View>

          {/* Method */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Deposit method</Text>
          <View style={styles.methods}>
            {METHODS.map((m) => (
              <Pressable
                key={m.id}
                style={[
                  styles.methodRow,
                  { backgroundColor: colors.cardBg, borderColor: selectedMethod === m.id ? colors.primary : colors.border },
                ]}
                onPress={() => setSelectedMethod(m.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedMethod === m.id }}
              >
                <View style={[styles.methodIcon, { backgroundColor: selectedMethod === m.id ? colors.primary + "18" : colors.border + "40" }]}>
                  <Ionicons name={m.icon} size={18} color={selectedMethod === m.id ? colors.primary : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, { color: colors.text }]}>{m.label}</Text>
                  <Text style={[styles.methodSub, { color: colors.textSecondary }]}>{m.sub}</Text>
                </View>
                <View style={[styles.radio, { borderColor: selectedMethod === m.id ? colors.primary : colors.border }]}>
                  {selectedMethod === m.id && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Funding details</Text>
          {selectedMethod === "bank" && (
            <View style={[styles.fundingBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}> 
              <Text style={[styles.fundingHint, { color: colors.textSecondary }]}>Link a bank account once, then transfer from it into your wallet.</Text>

              {bankAccountsLoading ? (
                <Text style={[styles.fundingHint, { color: colors.textSecondary }]}>Loading linked accounts...</Text>
              ) : bankAccounts.length === 0 ? (
                <>
                  <TextInput
                    style={[styles.fundingInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Bank name"
                    placeholderTextColor={colors.textSecondary}
                    value={newBankName}
                    onChangeText={setNewBankName}
                  />
                  <TextInput
                    style={[styles.fundingInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Account holder name"
                    placeholderTextColor={colors.textSecondary}
                    value={newAccountHolder}
                    onChangeText={setNewAccountHolder}
                  />
                  <TextInput
                    style={[styles.fundingInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Account last 4"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={newAccountLast4}
                    onChangeText={(v) => setNewAccountLast4(v.replace(/\D/g, ""))}
                  />
                  <TextInput
                    style={[styles.fundingInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Routing last 4 (optional)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={newRoutingLast4}
                    onChangeText={(v) => setNewRoutingLast4(v.replace(/\D/g, ""))}
                  />
                  <TextInput
                    style={[styles.fundingInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Available bank balance"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    value={newBankStartingBalance}
                    onChangeText={setNewBankStartingBalance}
                  />
                  <Pressable
                    style={[styles.linkBtn, { backgroundColor: colors.primary }]}
                    onPress={handleLinkBank}
                  >
                    <Text style={styles.linkBtnText}>Link bank account</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={[styles.manageAccountsBtn, { borderColor: colors.primary }]}
                    onPress={() => router.push("/bank-accounts" as never)}
                  >
                    <Text style={[styles.manageAccountsTxt, { color: colors.primary }]}>Manage linked accounts</Text>
                  </Pressable>

                  {bankAccounts.map((account) => (
                    <Pressable
                      key={account.id}
                      style={[
                        styles.bankRow,
                        {
                          borderColor:
                            selectedBankAccountId === account.id
                              ? colors.primary
                              : colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      onPress={() => setSelectedBankAccountId(account.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bankName, { color: colors.text }]}>{account.bank_name} •••• {account.account_last4}</Text>
                        <Text style={[styles.bankMeta, { color: colors.textSecondary }]}>Available: {formatCurrency(account.available_balance, "USD")}</Text>
                      </View>
                      {selectedBankAccountId === account.id && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </>
              )}

              <Text style={[styles.fundingHint, { color: colors.textSecondary }]}>Enter transfer reference (minimum 6 chars).</Text>
              <TextInput
                style={[styles.fundingInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Bank transfer reference"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                value={bankRef}
                onChangeText={(v) => {
                  setBankRef(v);
                  setError(null);
                }}
              />
            </View>
          )}

          {selectedMethod === "card" && (
            <View style={[styles.fundingBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}> 
              <Text style={[styles.fundingHint, { color: colors.textSecondary }]}>Use the last 4 digits of your debit card.</Text>
              <TextInput
                style={[styles.fundingInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Card last 4 digits"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
                value={cardLast4}
                onChangeText={(v) => {
                  setCardLast4(v.replace(/\D/g, ""));
                  setError(null);
                }}
              />
            </View>
          )}

          {selectedMethod === "cash" && (
            <View style={[styles.fundingBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}> 
              <Text style={[styles.fundingHint, { color: colors.textSecondary }]}>Enter where you made the cash deposit.</Text>
              <TextInput
                style={[styles.fundingInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Deposit location"
                placeholderTextColor={colors.textSecondary}
                value={cashLocation}
                onChangeText={(v) => {
                  setCashLocation(v);
                  setError(null);
                }}
              />
            </View>
          )}

          {/* Breakdown */}
          {numAmount >= 5 && (
            <View style={[styles.breakdown, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Deposit amount</Text>
                <Text style={[styles.breakdownValue, { color: colors.text }]}>{formatCurrency(numAmount, "USD")}</Text>
              </View>
              {fee > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Card fee (1.5%)</Text>
                  <Text style={[styles.breakdownValue, { color: colors.error }]}>{formatCurrency(fee, "USD")}</Text>
                </View>
              )}
              <View style={[styles.breakdownDivider, { backgroundColor: colors.border }]} />
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.text, fontWeight: "700" }]}>You'll receive</Text>
                <Text style={[styles.breakdownValue, { color: colors.primary, fontWeight: "800" }]}>{formatCurrency(numAmount, "USD")}</Text>
              </View>
            </View>
          )}

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.error + "12", borderColor: colors.error + "30" }]}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.errorTxt, { color: colors.error, flex: 1 }]}>{error}</Text>
            </View>
          )}

          {/* Confirm */}
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: canConfirm ? colors.primary : colors.border },
              pressed && canConfirm && { opacity: 0.85 },
            ]}
            onPress={handleDeposit}
            disabled={!canConfirm || loading}
            accessibilityRole="button"
            accessibilityLabel="Confirm deposit"
          >
            <Text style={[styles.confirmTxt, { color: canConfirm ? "#fff" : colors.textSecondary }]}>
              {loading ? "Processing…" : `Add ${numAmount >= 5 ? formatCurrency(numAmount, "USD") : "funds"}`}
            </Text>
          </Pressable>

          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            Bank and card funding use secure connected rails. Final settlement times depend on provider processing windows.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, marginBottom: 24 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  fundingHero: { borderRadius: 16, padding: 16, marginBottom: 16 },
  fundingHeroTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 4 },
  fundingHeroSub: { color: "rgba(255,255,255,0.88)", fontSize: 12, lineHeight: 18 },
  balancePill: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 28 },
  balancePillLabel: { fontSize: 13 },
  balancePillValue: { fontSize: 16, fontWeight: "800" },
  sectionLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 },
  amountWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 20, marginBottom: 8 },
  dollarSign: { fontSize: 36, fontWeight: "800", marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: "800", paddingVertical: 18, letterSpacing: -1 },
  presets: { flexDirection: "row", gap: 10, marginBottom: 28, flexWrap: "wrap" },
  preset: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  presetTxt: { fontSize: 14, fontWeight: "700" },
  methods: { gap: 10, marginBottom: 24 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  methodIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  methodSub: { fontSize: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  breakdown: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 20, gap: 4 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  breakdownLabel: { fontSize: 14 },
  breakdownValue: { fontSize: 14, fontWeight: "600" },
  breakdownDivider: { height: 1, marginVertical: 8 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  errorTxt: { fontSize: 13, marginBottom: 8 },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeTxt: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  confirmBtn: { borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 16 },
  confirmTxt: { fontSize: 16, fontWeight: "700" },
  disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  fundingBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  fundingHint: { fontSize: 12, lineHeight: 18 },
  fundingInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  linkBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  linkBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  manageAccountsBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 6,
  },
  manageAccountsTxt: {
    fontSize: 12,
    fontWeight: "700",
  },
  bankRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bankName: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  bankMeta: {
    fontSize: 12,
  },
  // Success
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  successCircle: { width: 110, height: 110, borderRadius: 55, overflow: "hidden", marginBottom: 8 },
  successGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  successSub: { fontSize: 15, textAlign: "center", lineHeight: 23 },
  newBalance: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  doneBtn: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, marginTop: 16 },
  doneBtnTxt: { fontSize: 16, fontWeight: "700", color: "#fff" },
  addMoreBtn: { paddingVertical: 14 },
  addMoreTxt: { fontSize: 15, fontWeight: "600" },
});
