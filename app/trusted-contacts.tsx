import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  ensureTrustedContact,
  getContacts,
  setContactTrusted,
} from "@/lib/data";
import type { Contact } from "@/lib/database.types";

export default function TrustedContactsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");

  const trustedCount = useMemo(
    () => contacts.filter((c) => c.is_favorite).length,
    [contacts],
  );

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const rows = await getContacts(user.id);
    setContacts(rows);
    setLoading(false);
  }

  async function toggleTrusted(contactId: string, value: boolean) {
    if (!user) return;
    const { error } = await setContactTrusted(user.id, contactId, value);
    if (error) {
      Alert.alert("Could not update trusted contact", error);
      return;
    }
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, is_favorite: value } : c)),
    );
  }

  async function addTrusted() {
    if (!user) return;
    const cleanName = name.trim();
    const cleanValue = emailOrPhone.trim();

    if (!cleanName || !cleanValue) {
      Alert.alert("Missing details", "Please add both name and email or phone.");
      return;
    }

    const isEmail = cleanValue.includes("@");

    setSaving(true);
    const { error } = await ensureTrustedContact({
      userId: user.id,
      contactName: cleanName,
      contactEmail: isEmail ? cleanValue : null,
      contactPhone: isEmail ? null : cleanValue,
    });
    setSaving(false);

    if (error) {
      Alert.alert("Could not save trusted contact", error);
      return;
    }

    setName("");
    setEmailOrPhone("");
    await load();
  }

  return (
    <ScreenLayout edges={["top"]}>
      <ScreenHeader title="Trusted Contacts" />

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.summary,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryRow}>
            <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Secure Transfers</Text>
          </View>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}> 
            Mark people you send to often as trusted. Trusted contacts get faster transfer confirmation.
          </Text>
          <Text style={[styles.summaryCount, { color: colors.primary }]}> 
            {trustedCount} trusted contact{trustedCount === 1 ? "" : "s"}
          </Text>
        </View>

        <View
          style={[
            styles.addCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>Add trusted contact</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
            ]}
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            placeholder="Email or phone"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
          <Pressable
            onPress={addTrusted}
            disabled={saving}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: colors.primary, opacity: pressed || saving ? 0.75 : 1 },
            ]}
          >
            <Text style={styles.addButtonText}>{saving ? "Saving..." : "Add trusted contact"}</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.listCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>Your contacts</Text>

          {loading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading contacts...</Text>
          ) : contacts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contacts yet. Send money once and they will appear here.</Text>
          ) : (
            contacts.map((contact, index) => (
              <View
                key={contact.id}
                style={[
                  styles.contactRow,
                  index < contacts.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactName, { color: colors.text }]}>{contact.contact_name}</Text>
                  <Text style={[styles.contactMeta, { color: colors.textSecondary }]}> 
                    {contact.contact_email || contact.contact_phone || "No address"}
                  </Text>
                </View>
                <Switch
                  value={contact.is_favorite}
                  onValueChange={(value) => toggleTrusted(contact.id, value)}
                  trackColor={{ false: colors.border, true: colors.primary + "80" }}
                  thumbColor={contact.is_favorite ? colors.primary : colors.textSecondary}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 42,
    gap: 14,
  },
  summary: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 19,
  },
  summaryCount: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
  },
  addCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
  },
  contactMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
