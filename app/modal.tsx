import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, Text, View } from "react-native";

import { ScreenLayout } from "@/components/ScreenLayout";
import { useThemeColors } from "@/hooks/useThemeColors";

export default function ModalScreen() {
  const colors = useThemeColors();

  return (
    <ScreenLayout scroll={false} edges={["top"]} horizontalPadding={24}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons
            name="information-circle-outline"
            size={32}
            color={colors.primary}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            Transaction Details
          </Text>
        </View>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Amount
          </Text>
          <Text style={[styles.amount, { color: colors.text }]}>$250.00</Text>
          <View style={styles.separator} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Status
          </Text>
          <Text style={[styles.status, { color: colors.success }]}>
            Completed
          </Text>
        </View>
      </View>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  amount: {
    fontSize: 32,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  status: {
    fontSize: 16,
    fontWeight: "600",
  },
});
