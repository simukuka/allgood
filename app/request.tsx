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
import { getContacts } from "@/lib/data";
import { hapticSuccess } from "@/lib/haptics";

const FALLBACK_CONTACTS = [
  {
    id: "fb1",
    flag_emoji: "🇲🇽",
    contact_name: "Maria G.",
    contact_email: "maria@email.com",
  },
  {
    id: "fb2",
    flag_emoji: "🇨🇴",
    contact_name: "Carlos R.",
    contact_email: "carlos@email.com",
  },
  {
    id: "fb3",
    flag_emoji: "🇧🇷",
    contact_name: "Sofia L.",
    contact_email: "sofia@email.com",
  },
];

export default function RequestMoneyScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const { user } = useAuth();
  const t = useTranslation(preferences.language);

  const [contacts, setContacts] = useState<
    Array<{
      id: string;
      flag_emoji: string | null;
      contact_name: string;
      contact_email: string | null;
    }>
  >([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    setContactsLoading(true);
    try {
      const data = await getContacts(user.id);
      setContacts(
        data.length > 0
          ? data.map((c) => ({
              id: c.id,
              flag_emoji: c.flag_emoji,
              contact_name: c.contact_name,
              contact_email: c.contact_email,
            }))
          : FALLBACK_CONTACTS,
      );
    } catch {
      setContacts(FALLBACK_CONTACTS);
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

  return (
    <ScreenLayout
      footer={
        <View style={styles.footer}>
          <Button
            title={t("sendRequest")}
            onPress={() => {
              hapticSuccess();
              setSent(true);
            }}
            disabled={
              selectedContact === null || !amount || parseFloat(amount) <= 0
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
        ) : (
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
                  {c.contact_email || ""}
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
        )}
      </View>

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
          USD
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
