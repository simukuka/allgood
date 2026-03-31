import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Button } from "@/components/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { createMoneyRequest, getContacts } from "@/lib/data";
import { hapticSuccess } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";
import type { CurrencyCode } from "@/utils/currency";

export default function RequestMoneyScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const { user, profile } = useAuth();
  const t = useTranslation(preferences.language);
  const userCurrency = (profile?.currency as CurrencyCode) || "USD";

  const [contacts, setContacts] = useState<
    Array<{
      id: string;
      flag_emoji: string | null;
      contact_name: string;
      contact_email: string | null;
      contact_phone: string | null;
    }>
  >([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    setContactsLoading(true);
    try {
      const data = await getContacts(user.id);
      setContacts(
        data.map((c) => ({
          id: c.id,
          flag_emoji: c.flag_emoji,
          contact_name: c.contact_name,
          contact_email: c.contact_email,
          contact_phone: c.contact_phone,
        })),
      );
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  if (sent) {
    return (
      <ScreenLayout
        scroll={false}
        footer={
          <View style={styles.footer}>
            <Button
              title={t("backToHome")}
              onPress={() => router.replace("/(tabs)")}
            />
          </View>
        }
      >
        <View style={styles.successContent}>
          <View style={[styles.successIcon, styles.successShadow]}>
            <Ionicons name="checkmark" size={56} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            {t("requestSentTitle")}
          </Text>
          <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
            {t("requestSentDesc")}
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const handleSubmit = async () => {
    if (!user || !profile || !selectedContact) return;
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return;

    const selected = contacts.find((c) => c.id === selectedContact);
    if (!selected) return;

    setSending(true);
    setSubmitError(null);

    try {
      const emailLookup = selected.contact_email?.trim();
      const phoneLookup = selected.contact_phone?.trim();
      if (!emailLookup && !phoneLookup) {
        throw new Error("This contact needs a valid email or phone to request money.");
      }

      const lookupColumn = emailLookup ? "email" : "phone";
      const lookupValue = emailLookup || phoneLookup || "";

      const { data: payerProfile, error: payerError } = await supabase
        .from("profiles")
        .select("id")
        .eq(lookupColumn, lookupValue)
        .maybeSingle();

      if (payerError) {
        throw new Error("Could not verify that contact right now. Please try again.");
      }

      if (!payerProfile?.id) {
        throw new Error("This contact is not on AllGood yet, so a real request cannot be sent.");
      }

      const { error } = await createMoneyRequest({
        payerUserId: payerProfile.id,
        requesterUserId: user.id,
        requesterName: profile.full_name || "AllGood Member",
        requesterEmail: profile.email,
        amount: amountNumber,
        currency: userCurrency,
        note: note.trim() || `money_request:from=${selected.contact_name}`,
      });

      if (error) {
        throw new Error(error);
      }

      hapticSuccess();
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenLayout
      footer={
        <View style={styles.footer}>
          <Button
            title={sending ? "Sending..." : t("sendRequest")}
            onPress={handleSubmit}
            disabled={
              sending || selectedContact === null || !amount || parseFloat(amount) <= 0
            }
          />
        </View>
      }
    >
      <ScreenHeader title={t("requestMoney")} />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("requestFrom").toUpperCase()}
      </Text>
      <View style={styles.contactList}>
        {contactsLoading ? (
          <View style={styles.contactLoadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : contacts.length > 0 ? (
          contacts.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.contactCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                },
                selectedContact === c.id && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + "08",
                },
              ]}
              onPress={() => setSelectedContact(c.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={c.contact_name}
            >
              <Text style={styles.contactFlag}>{c.flag_emoji || "🌍"}</Text>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: colors.text }]}>
                  {c.contact_name}
                </Text>
                <Text
                  style={[styles.contactEmail, { color: colors.textSecondary }]}
                >
                  {c.contact_email || c.contact_phone || ""}
                </Text>
              </View>
              {selectedContact === c.id && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No contacts yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Add contacts through your send flow first, then request money here.</Text>
          </View>
        )}
      </View>

      {submitError && (
        <Text style={[styles.errorText, { color: colors.error }]}>{submitError}</Text>
      )}

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("requestAmount").toUpperCase()}
      </Text>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: colors.cardBg, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.inputPrefix, { color: colors.primary }]}>$</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="0.00"
          placeholderTextColor={colors.border}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>
          {userCurrency}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("addNote").toUpperCase()}
      </Text>
      <TextInput
        style={[
          styles.noteInput,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder={t("noteHint")}
        placeholderTextColor={colors.textSecondary}
        value={note}
        onChangeText={setNote}
        multiline
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  contactList: { gap: 10, marginBottom: 28 },
  contactLoadingWrap: { alignItems: "center", paddingVertical: 32 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  contactFlag: { fontSize: 28 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  contactEmail: { fontSize: 13 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
    gap: 4,
  },
  inputPrefix: { fontSize: 24, fontWeight: "700" },
  input: { fontSize: 24, fontWeight: "700", flex: 1, padding: 0 },
  inputSuffix: { fontSize: 14, fontWeight: "600" },
  noteInput: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 13,
    marginTop: -16,
    marginBottom: 16,
  },
  footer: { padding: 28, paddingBottom: 32 },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successShadow: {
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  successTitle: { fontSize: 28, fontWeight: "800", marginBottom: 10 },
  successDesc: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
