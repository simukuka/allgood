import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  getBankAccounts,
  removeBankAccount,
  setDefaultBankAccount,
} from "@/lib/data";
import type { BankAccount } from "@/lib/database.types";
import { formatCurrency } from "@/utils/currency";

export default function BankAccountsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const rows = await getBankAccounts(user.id);
    setAccounts(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const onSetDefault = async (accountId: string) => {
    if (!user) return;
    const { error } = await setDefaultBankAccount(user.id, accountId);
    if (error) {
      setError(error);
      return;
    }
    setError(null);
    await loadAccounts();
  };

  const onRemove = async (accountId: string) => {
    if (!user) return;
    const { error } = await removeBankAccount(user.id, accountId);
    if (error) {
      setError(error);
      return;
    }
    setError(null);
    await loadAccounts();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.cardBg }]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Linked Bank Accounts</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>Loading linked accounts...</Text>
        ) : accounts.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.cardBg }]}> 
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No linked bank accounts yet</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>Go to Add Funds and link your first bank account.</Text>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.replace("/deposit")}
            >
              <Text style={styles.actionBtnText}>Go to Add Funds</Text>
            </Pressable>
          </View>
        ) : (
          accounts.map((account) => (
            <View
              key={account.id}
              style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBg }]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.bankName, { color: colors.text }]}>
                  {account.bank_name} •••• {account.account_last4}
                </Text>
                {account.is_default && (
                  <View style={[styles.defaultPill, { backgroundColor: colors.primary + "20" }]}> 
                    <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.muted, { color: colors.textSecondary }]}> 
                Holder: {account.account_holder}
              </Text>
              <Text style={[styles.muted, { color: colors.textSecondary }]}> 
                Available: {formatCurrency(account.available_balance, "USD")}
              </Text>

              <View style={styles.actionsRow}>
                {!account.is_default && (
                  <Pressable
                    style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                    onPress={() => onSetDefault(account.id)}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Set Default</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.dangerBtn, { borderColor: colors.error }]}
                  onPress={() => onRemove(account.id)}
                >
                  <Text style={[styles.dangerBtnText, { color: colors.error }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {error && (
          <View style={[styles.errorCard, { borderColor: colors.error + "55", backgroundColor: colors.error + "12" }]}> 
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "700" },
  content: { padding: 20, gap: 12, paddingBottom: 36 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bankName: { fontSize: 14, fontWeight: "700" },
  muted: { fontSize: 12, lineHeight: 18 },
  defaultPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  defaultText: { fontSize: 11, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: { fontSize: 12, fontWeight: "700" },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dangerBtnText: { fontSize: 12, fontWeight: "700" },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700" },
  actionBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  errorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 12, fontWeight: "600" },
});
