import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticLight } from "@/lib/haptics";
import { type AppNotification, getNotifications } from "@/lib/data";

const ICON_CFG: Record<AppNotification["type"], { icon: any; color: string }> = {
  transfer_sent:     { icon: "arrow-up-circle",       color: "#3b82f6" },
  transfer_received: { icon: "arrow-down-circle",     color: "#10b981" },
  transfer_failed:   { icon: "close-circle",          color: "#ef4444" },
  transfer_pending:  { icon: "time",                  color: "#f59e0b" },
  deposit:           { icon: "add-circle",            color: "#8b5cf6" },
};

function NotifCard({
  notif,
  index,
  onPress,
}: {
  notif: AppNotification;
  index: number;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const op  = useSharedValue(0);
  const ty  = useSharedValue(20);

  useEffect(() => {
    op.value = withDelay(index * 55, withTiming(1, { duration: 320 }));
    ty.value = withDelay(index * 55, withSpring(0, { damping: 18, stiffness: 120 }));
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));
  const cfg   = ICON_CFG[notif.type];

  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[
          s.card,
          {
            backgroundColor: notif.read ? colors.cardBg : colors.primary + "08",
            borderColor:     notif.read ? colors.border  : colors.primary + "28",
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={notif.title}
      >
        <View style={[s.iconWrap, { backgroundColor: cfg.color + "18" }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>
        <View style={s.content}>
          <View style={s.titleRow}>
            <Text
              style={[s.title, { color: colors.text }, !notif.read && { fontWeight: "700" }]}
              numberOfLines={1}
            >
              {notif.title}
            </Text>
            {!notif.read && (
              <View style={[s.dot, { backgroundColor: colors.primary }]} />
            )}
          </View>
          <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={2}>
            {notif.description}
          </Text>
          <Text style={[s.time, { color: colors.textSecondary }]}>{notif.time}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const colors    = useThemeColors();
  const { user }  = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } catch (e) {
      console.warn("notifications load error", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    hapticLight();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    hapticLight();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Group by recency
  const todayNotifs    = notifications.filter(n => n.time.includes("just now") || n.time.includes("m ago") || n.time.includes("h ago"));
  const earlierNotifs  = notifications.filter(n => !n.time.includes("just now") && !n.time.includes("m ago") && !n.time.includes("h ago"));

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} accessibilityRole="button" accessibilityLabel="Mark all as read">
            <Text style={[s.markAll, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 76 }} />
        )}
      </View>

      {unreadCount > 0 && (
        <View style={[s.unreadBanner, { backgroundColor: colors.primary + "12" }]}>
          <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />
          <Text style={[s.unreadTxt, { color: colors.primary }]}>
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[s.loadingTxt, { color: colors.textSecondary }]}>Loading notifications…</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.empty}>
          <View style={[s.emptyIcon, { backgroundColor: colors.cardBg }]}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.textSecondary} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>All caught up</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>
            Notifications from your transfers and deposits will appear here.
          </Text>
          <Pressable
            style={[s.sendBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/send")}
            accessibilityRole="button"
            accessibilityLabel="Send money"
          >
            <Text style={s.sendBtnTxt}>Send your first transfer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {todayNotifs.length > 0 && (
            <>
              <Text style={[s.section, { color: colors.textSecondary }]}>TODAY</Text>
              <View style={s.group}>
                {todayNotifs.map((n, i) => (
                  <NotifCard key={n.id} notif={n} index={i} onPress={() => {
                    markRead(n.id);
                    router.push({ pathname: "/transaction-detail", params: { id: n.transactionId } });
                  }} />
                ))}
              </View>
            </>
          )}
          {earlierNotifs.length > 0 && (
            <>
              <Text style={[s.section, { color: colors.textSecondary }]}>EARLIER</Text>
              <View style={s.group}>
                {earlierNotifs.map((n, i) => (
                  <NotifCard key={n.id} notif={n} index={todayNotifs.length + i} onPress={() => {
                    markRead(n.id);
                    router.push({ pathname: "/transaction-detail", params: { id: n.transactionId } });
                  }} />
                ))}
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  markAll:     { fontSize: 13, fontWeight: "600" },

  unreadBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
  unreadTxt: { fontSize: 13, fontWeight: "600" },

  loader:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { fontSize: 14 },

  empty:       { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyIcon:   { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle:  { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySub:    { fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  sendBtn:     { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  sendBtnTxt:  { fontSize: 15, fontWeight: "700", color: "#fff" },

  scroll:  { paddingHorizontal: 16, paddingTop: 8 },
  section: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 16, marginBottom: 8, marginLeft: 4 },
  group:   { gap: 8 },

  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 14, borderWidth: 1,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  content:  { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  title:    { fontSize: 14, fontWeight: "600", flex: 1 },
  dot:      { width: 7, height: 7, borderRadius: 3.5 },
  desc:     { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  time:     { fontSize: 11, fontWeight: "500" },
});
