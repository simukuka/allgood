import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";

export type GoodiMood =
  | "happy"
  | "excited"
  | "neutral"
  | "thinking"
  | "warning"
  | "sad"
  | "celebrating"
  | "sleepy"
  | "angry"
  | "love";

interface GoodiProps {
  screen?: "home" | "send" | "invest" | "vision" | "settings";
  mood?: GoodiMood;
}

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const envUrl = process.env.EXPO_PUBLIC_APP_URL;
  if (envUrl) return envUrl;
  const fromExpo = (Constants.expoConfig?.extra as any)?.appUrl;
  return fromExpo || "https://allgood-kappa.vercel.app";
}

function getScreenMood(screen: string): GoodiMood {
  switch (screen) {
    case "send":
      return "thinking";
    case "invest":
      return "neutral";
    case "vision":
      return "excited";
    case "settings":
      return "neutral";
    default:
      return "happy";
  }
}

const STARTERS = [
  "How much did I spend this month?",
  "What is my top expense category?",
  "How can I improve my Financial Passport score?",
  "Give me a savings plan for this month.",
];

export function Goodi({ screen = "home", mood }: GoodiProps) {
  const { preferences } = useApp();
  const { session } = useAuth();
  const colors = useThemeColors();
  const t = useTranslation(preferences.language);

  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "I am your AllGood Money Coach. Ask me anything about your spending, transfers, and Financial Passport.",
    },
  ]);

  const currentMood = mood || getScreenMood(screen);
  const moodColor =
    currentMood === "excited"
      ? "#8b5cf6"
      : currentMood === "thinking"
        ? "#f59e0b"
        : currentMood === "warning"
          ? "#f97316"
          : currentMood === "sad"
            ? "#64748b"
            : currentMood === "celebrating"
              ? "#ec4899"
              : currentMood === "sleepy"
                ? "#6366f1"
                : currentMood === "angry"
                  ? "#ef4444"
                  : currentMood === "love"
                    ? "#ec4899"
                    : "#22c55e";

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const canSend = useMemo(
    () => input.trim().length > 0 && !sending,
    [input, sending],
  );

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Keep one lightweight loop only to avoid frame drops in money screens.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadHistory = useCallback(async () => {
    if (historyLoaded || !session?.access_token) return;

    setHistoryLoading(true);
    try {
      const resp = await fetch(`${apiBaseUrl}/api/ai/money-chat`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await resp.json();
      if (!resp.ok) return;

      const rows = Array.isArray(data?.messages) ? data.messages : [];
      if (rows.length > 0) {
        setMessages((prev) => [
          prev[0],
          ...rows.map((row: any) => ({
            id: String(row.id),
            role: row.role === "assistant" ? "assistant" : "user",
            text: String(row.text || ""),
          })),
        ]);
      }
      setHistoryLoaded(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [apiBaseUrl, historyLoaded, session?.access_token]);

  const openChat = useCallback(() => {
    setVisible(true);
    loadHistory();
  }, [loadHistory]);

  async function sendMessage(seedText?: string) {
    const content = (seedText || input).trim();
    if (!content || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: content,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const token = session?.access_token;
      if (!token) throw new Error("Sign in to chat with your money coach.");

      const resp = await fetch(`${apiBaseUrl}/api/ai/money-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: content }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || "Could not get a response right now.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: String(data.reply || "I could not generate a response."),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "Could not reach your Money Coach.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!preferences.goodiEnabled) return null;

  const moodLabelKey = `goodiMood_${currentMood}` as any;
  const moodLabel =
    t(moodLabelKey) !== moodLabelKey
      ? t(moodLabelKey)
      : currentMood.charAt(0).toUpperCase() + currentMood.slice(1);

  return (
    <>
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: pulse }] }]}>
        <Pressable
          style={[styles.fab, { backgroundColor: moodColor }]}
          onPress={openChat}
          accessibilityRole="button"
          accessibilityLabel="Open AI Money Coach"
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </Pressable>
      </Animated.View>

      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <Pressable
            style={[styles.chatCard, { backgroundColor: colors.cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.headerRow}>
              <View style={[styles.avatar, { backgroundColor: moodColor }]}>
                <Ionicons name="sparkles" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>Goodi</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {moodLabel}
                </Text>
              </View>
              <Pressable onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.startersWrap}>
              {STARTERS.map((starter) => (
                <Pressable
                  key={starter}
                  style={({ pressed }) => [
                    styles.starter,
                    {
                      backgroundColor: colors.primary + "12",
                      borderColor: colors.primary + "35",
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                  onPress={() => sendMessage(starter)}
                >
                  <Text style={[styles.starterText, { color: colors.primary }]}>
                    {starter}
                  </Text>
                </Pressable>
              ))}
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                style={styles.chatList}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.bubble,
                        {
                          alignSelf: isUser ? "flex-end" : "flex-start",
                          backgroundColor: isUser ? colors.primary : colors.background,
                          borderColor: isUser ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          { color: isUser ? "#fff" : colors.text },
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  );
                })}

                {historyLoading && (
                  <View
                    style={[
                      styles.typing,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.typingText, { color: colors.textSecondary }]}>
                      Loading chat memory...
                    </Text>
                  </View>
                )}

                {sending && (
                  <View
                    style={[
                      styles.typing,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.typingText, { color: colors.textSecondary }]}>
                      Thinking with your money context...
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask about spending, transfers, savings"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
                <Pressable
                  onPress={() => sendMessage()}
                  disabled={!canSend}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: !canSend || pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Ionicons name="send" size={16} color="#fff" />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    right: 20,
    bottom: 90,
    zIndex: 100,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 110,
  },
  chatCard: {
    width: "100%",
    maxHeight: "78%",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  startersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  starter: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  starterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chatList: {
    flex: 1,
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    maxWidth: "90%",
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  typing: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  typingText: {
    fontSize: 12,
  },
  inputRow: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 90,
    fontSize: 14,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
