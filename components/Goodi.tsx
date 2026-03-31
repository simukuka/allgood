import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useThemeColors } from "@/hooks/useThemeColors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Mood system ─────────────────────────────────────────────────
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

interface MoodConfig {
  bgColor: string;
  glowColor: string;
  eyeShape:
    | "round"
    | "wide"
    | "squint"
    | "sparkle"
    | "worried"
    | "heart"
    | "closed"
    | "angry";
  mouthShape:
    | "smile"
    | "grin"
    | "flat"
    | "frown"
    | "open"
    | "smirk"
    | "tongue"
    | "pout";
  blush: boolean;
  bounce: boolean;
  emoji: string;
}

const MOOD_CONFIGS: Record<GoodiMood, MoodConfig> = {
  happy: {
    bgColor: "#22c55e",
    glowColor: "#22c55e40",
    eyeShape: "round",
    mouthShape: "smile",
    blush: true,
    bounce: true,
    emoji: "😊",
  },
  excited: {
    bgColor: "#8b5cf6",
    glowColor: "#8b5cf640",
    eyeShape: "sparkle",
    mouthShape: "grin",
    blush: true,
    bounce: true,
    emoji: "🤩",
  },
  neutral: {
    bgColor: "#3b82f6",
    glowColor: "#3b82f640",
    eyeShape: "round",
    mouthShape: "smirk",
    blush: false,
    bounce: false,
    emoji: "🙂",
  },
  thinking: {
    bgColor: "#f59e0b",
    glowColor: "#f59e0b40",
    eyeShape: "squint",
    mouthShape: "flat",
    blush: false,
    bounce: false,
    emoji: "🤔",
  },
  warning: {
    bgColor: "#f97316",
    glowColor: "#f9731640",
    eyeShape: "worried",
    mouthShape: "frown",
    blush: false,
    bounce: true,
    emoji: "😟",
  },
  sad: {
    bgColor: "#64748b",
    glowColor: "#64748b40",
    eyeShape: "worried",
    mouthShape: "frown",
    blush: false,
    bounce: false,
    emoji: "😢",
  },
  celebrating: {
    bgColor: "#ec4899",
    glowColor: "#ec489940",
    eyeShape: "sparkle",
    mouthShape: "open",
    blush: true,
    bounce: true,
    emoji: "🎉",
  },
  sleepy: {
    bgColor: "#6366f1",
    glowColor: "#6366f140",
    eyeShape: "closed",
    mouthShape: "flat",
    blush: false,
    bounce: false,
    emoji: "😴",
  },
  angry: {
    bgColor: "#ef4444",
    glowColor: "#ef444440",
    eyeShape: "angry",
    mouthShape: "pout",
    blush: false,
    bounce: true,
    emoji: "😤",
  },
  love: {
    bgColor: "#ec4899",
    glowColor: "#ec489940",
    eyeShape: "heart",
    mouthShape: "smile",
    blush: true,
    bounce: true,
    emoji: "😍",
  },
};

// Random moods Goodi can shift to on its own
const RANDOM_MOODS: GoodiMood[] = [
  "happy",
  "excited",
  "thinking",
  "sleepy",
  "celebrating",
  "neutral",
  "sad",
  "angry",
  "love",
];

// Reaction messages for random mood shifts
const MOOD_REACTIONS: Partial<Record<GoodiMood, string[]>> = {
  happy: ["Life is good! 💚", "Today's a great day!", "Feeling awesome!"],
  excited: [
    "Ooh!! Something exciting!",
    "I can't contain myself! 🎉",
    "LET'S GOOO!",
  ],
  thinking: ["Hmm, let me think...", "What if we tried...", "I wonder... 🤔"],
  sleepy: [
    "*yawns* ...five more minutes",
    "Zzz... oh! I'm awake!",
    "So... sleepy... 😴",
  ],
  sad: [
    "I miss when you used the app more 😢",
    "Feeling a bit lonely here...",
    "Check your budget? That'll cheer me up!",
  ],
  angry: [
    "Grr! Fees are so annoying! 😤",
    "I DON'T like hidden charges!",
    "Banks make me MAD!",
  ],
  love: [
    "I love helping you! 💕",
    "You're doing amazing!",
    "Your finances look beautiful! 😍",
  ],
  celebrating: ["WOOHOO! 🎊", "Time to celebrate!", "Let's party! 🥳"],
  neutral: [
    "Just hanging around~",
    "Doo dee doo...",
    "What should we do today?",
  ],
};

// Map screen → default mood
function getScreenMood(screen: string): GoodiMood {
  switch (screen) {
    case "home":
      return "happy";
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

// ── Face components ─────────────────────────────────────────────
function GoodiEyes({
  shape,
  size,
}: {
  shape: MoodConfig["eyeShape"];
  size: "sm" | "lg";
}) {
  const s = size === "lg" ? 1.6 : 1;
  const eyeW = 6 * s;
  const eyeH = 6 * s;
  const gap = size === "lg" ? 18 : 11;

  const renderEye = (side: "left" | "right") => {
    switch (shape) {
      case "sparkle":
        return (
          <View
            style={{
              width: eyeW + 2,
              height: eyeH + 2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: eyeW,
                height: eyeH,
                borderRadius: eyeW / 2,
                backgroundColor: "#fff",
              }}
            />
            <View
              style={{
                position: "absolute",
                top: -1 * s,
                [side === "left" ? "right" : "left"]: -1 * s,
                width: 3 * s,
                height: 3 * s,
                borderRadius: 1.5 * s,
                backgroundColor: "#fde68a",
              }}
            />
          </View>
        );
      case "heart":
        return (
          <View style={{ alignItems: "center" }}>
            <Text
              style={{ fontSize: size === "lg" ? 14 : 8, marginTop: -2 * s }}
            >
              ❤️
            </Text>
          </View>
        );
      case "closed":
        return (
          <View
            style={{
              width: eyeW + 2,
              height: 2 * s,
              borderRadius: 1,
              backgroundColor: "#fff",
              transform: [{ rotate: side === "left" ? "-5deg" : "5deg" }],
            }}
          />
        );
      case "angry":
        return (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: eyeW + 3,
                height: 2 * s,
                borderRadius: 1,
                backgroundColor: "#fff",
                marginBottom: 1 * s,
                transform: [{ rotate: side === "left" ? "20deg" : "-20deg" }],
              }}
            />
            <View
              style={{
                width: eyeW,
                height: eyeH * 0.8,
                borderRadius: eyeW / 2,
                backgroundColor: "#fff",
              }}
            />
          </View>
        );
      case "wide":
        return (
          <View
            style={{
              width: eyeW + 2,
              height: eyeH + 4,
              borderRadius: (eyeH + 4) / 2,
              backgroundColor: "#fff",
            }}
          />
        );
      case "squint":
        return (
          <View
            style={{
              width: eyeW + 2,
              height: eyeH - 2 * s,
              borderRadius: eyeW / 2,
              backgroundColor: "#fff",
            }}
          />
        );
      case "worried":
        return (
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: eyeW + 2,
                height: 2 * s,
                borderRadius: 1,
                backgroundColor: "#fff",
                marginBottom: 1 * s,
                transform: [{ rotate: side === "left" ? "-15deg" : "15deg" }],
              }}
            />
            <View
              style={{
                width: eyeW,
                height: eyeH,
                borderRadius: eyeW / 2,
                backgroundColor: "#fff",
              }}
            />
          </View>
        );
      default:
        return (
          <View
            style={{
              width: eyeW,
              height: eyeH,
              borderRadius: eyeW / 2,
              backgroundColor: "#fff",
            }}
          />
        );
    }
  };

  return (
    <View style={{ flexDirection: "row", gap, alignItems: "center" }}>
      {renderEye("left")}
      {renderEye("right")}
    </View>
  );
}

function GoodiMouth({
  shape,
  size,
}: {
  shape: MoodConfig["mouthShape"];
  size: "sm" | "lg";
}) {
  const s = size === "lg" ? 1.6 : 1;
  switch (shape) {
    case "grin":
      return (
        <View
          style={{
            width: 16 * s,
            height: 8 * s,
            borderBottomLeftRadius: 10 * s,
            borderBottomRightRadius: 10 * s,
            backgroundColor: "#fff",
            marginTop: 3 * s,
          }}
        />
      );
    case "smile":
      return (
        <View
          style={{
            width: 12 * s,
            height: 6 * s,
            borderBottomLeftRadius: 8 * s,
            borderBottomRightRadius: 8 * s,
            borderWidth: 2 * s,
            borderTopWidth: 0,
            borderColor: "#fff",
            marginTop: 2 * s,
          }}
        />
      );
    case "open":
      return (
        <View
          style={{
            width: 10 * s,
            height: 10 * s,
            borderRadius: 5 * s,
            backgroundColor: "#fff",
            marginTop: 3 * s,
          }}
        />
      );
    case "frown":
      return (
        <View
          style={{
            width: 12 * s,
            height: 6 * s,
            borderTopLeftRadius: 8 * s,
            borderTopRightRadius: 8 * s,
            borderWidth: 2 * s,
            borderBottomWidth: 0,
            borderColor: "#fff",
            marginTop: 4 * s,
          }}
        />
      );
    case "tongue":
      return (
        <View style={{ alignItems: "center", marginTop: 2 * s }}>
          <View
            style={{
              width: 12 * s,
              height: 5 * s,
              borderBottomLeftRadius: 8 * s,
              borderBottomRightRadius: 8 * s,
              backgroundColor: "#fff",
            }}
          />
          <View
            style={{
              width: 4 * s,
              height: 4 * s,
              borderBottomLeftRadius: 3 * s,
              borderBottomRightRadius: 3 * s,
              backgroundColor: "#f87171",
              marginTop: -1,
            }}
          />
        </View>
      );
    case "pout":
      return (
        <View
          style={{
            width: 8 * s,
            height: 5 * s,
            borderRadius: 4 * s,
            backgroundColor: "#fff",
            marginTop: 3 * s,
          }}
        />
      );
    case "smirk":
      return (
        <View
          style={{
            width: 10 * s,
            height: 4 * s,
            borderBottomLeftRadius: 2 * s,
            borderBottomRightRadius: 8 * s,
            borderWidth: 2 * s,
            borderTopWidth: 0,
            borderColor: "#fff",
            marginTop: 2 * s,
          }}
        />
      );
    default: // flat
      return (
        <View
          style={{
            width: 10 * s,
            height: 2 * s,
            borderRadius: 1 * s,
            backgroundColor: "#fff",
            marginTop: 3 * s,
          }}
        />
      );
  }
}

function Blush({ visible, size }: { visible: boolean; size: "sm" | "lg" }) {
  if (!visible) return null;
  const s = size === "lg" ? 1.6 : 1;
  const blushSize = 5 * s;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: size === "lg" ? 28 : 18,
        marginTop: -1 * s,
      }}
    >
      <View
        style={{
          width: blushSize,
          height: blushSize * 0.6,
          borderRadius: blushSize / 2,
          backgroundColor: "rgba(255,255,255,0.35)",
        }}
      />
      <View
        style={{
          width: blushSize,
          height: blushSize * 0.6,
          borderRadius: blushSize / 2,
          backgroundColor: "rgba(255,255,255,0.35)",
        }}
      />
    </View>
  );
}

// ── Particle burst on tap ───────────────────────────────────────
function ParticleBurst({ active, color }: { active: boolean; color: string }) {
  const particles = useRef(
    Array.from({ length: 6 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    if (!active) return;
    particles.forEach((p, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 30 + Math.random() * 20;
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(1);
      Animated.parallel([
        Animated.timing(p.x, {
          toValue: Math.cos(angle) * dist,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: Math.sin(angle) * dist,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(p.scale, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [active]);

  if (!active) return null;

  return (
    <>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            opacity: p.opacity,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              { scale: p.scale },
            ],
          }}
        />
      ))}
    </>
  );
}

// ── Thought bubble ──────────────────────────────────────────────
function ThoughtBubble({
  text,
  visible,
  color,
}: {
  text: string;
  visible: boolean;
  color: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      // Auto-hide after 3s
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.5,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      scale.setValue(0.5);
    }
  }, [visible, text]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.thoughtBubble, { opacity, transform: [{ scale }] }]}
    >
      <View
        style={[
          styles.thoughtContent,
          { backgroundColor: color + "20", borderColor: color + "40" },
        ]}
      >
        <Text style={[styles.thoughtText, { color }]}>{text}</Text>
      </View>
      {/* Little bubbles leading to Goodi */}
      <View style={[styles.thoughtDot1, { backgroundColor: color + "30" }]} />
      <View style={[styles.thoughtDot2, { backgroundColor: color + "20" }]} />
    </Animated.View>
  );
}

// ── Main component ──────────────────────────────────────────────
interface GoodiProps {
  screen?: "home" | "send" | "invest" | "vision" | "settings";
  mood?: GoodiMood;
}

export function Goodi({ screen = "home", mood: moodOverride }: GoodiProps) {
  const [visible, setVisible] = useState(false);
  const { preferences } = useApp();
  const colors = useThemeColors();
  const t = useTranslation(preferences.language);

  // Autonomous mood system
  const screenMood = getScreenMood(screen);
  const [currentMood, setCurrentMood] = useState<GoodiMood>(
    moodOverride ?? screenMood,
  );
  const [reactionText, setReactionText] = useState("");
  const [showThought, setShowThought] = useState(false);
  const [tapBurst, setTapBurst] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const config = MOOD_CONFIGS[currentMood];

  // ── Animation refs ────────────────────────────────────
  const bounceY = useRef(new Animated.Value(0)).current;
  const bounceX = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const squishX = useRef(new Animated.Value(1)).current;
  const squishY = useRef(new Animated.Value(1)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const posX = useRef(new Animated.Value(0)).current;
  const posY = useRef(new Animated.Value(0)).current;

  // Track if component is mounted
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // ── Random mood shifts ────────────────────────────────
  useEffect(() => {
    if (moodOverride) return; // Don't random-shift if mood is forced

    const moodTimer = setInterval(
      () => {
        if (!mounted.current) return;
        // 30% chance to shift mood
        if (Math.random() < 0.3) {
          const newMood =
            RANDOM_MOODS[Math.floor(Math.random() * RANDOM_MOODS.length)];
          setCurrentMood(newMood);

          // Show a thought bubble with reaction
          const reactions = MOOD_REACTIONS[newMood];
          if (reactions) {
            const text =
              reactions[Math.floor(Math.random() * reactions.length)];
            setReactionText(text);
            setShowThought(true);
            setTimeout(() => {
              if (mounted.current) setShowThought(false);
            }, 3500);
          }
        }
      },
      8000 + Math.random() * 7000,
    ); // Every 8-15 seconds

    return () => clearInterval(moodTimer);
  }, [moodOverride, screen]);

  // Reset to screen mood when screen changes
  useEffect(() => {
    if (!moodOverride) {
      setCurrentMood(screenMood);
    }
  }, [screen, moodOverride]);

  // ── Wandering movement ────────────────────────────────
  useEffect(() => {
    const wander = () => {
      if (!mounted.current) return;
      const targetX = (Math.random() - 0.5) * 24;
      const targetY = (Math.random() - 0.5) * 16;
      Animated.parallel([
        Animated.spring(posX, {
          toValue: targetX,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(posY, {
          toValue: targetY,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const wanderTimer = setInterval(wander, 4000 + Math.random() * 3000);
    return () => clearInterval(wanderTimer);
  }, []);

  // ── Core animations ───────────────────────────────────
  useEffect(() => {
    // Bounce animation differs by mood
    const bounceSpeed =
      currentMood === "excited" || currentMood === "celebrating" ? 500 : 800;
    const bounceHeight =
      currentMood === "excited"
        ? -10
        : currentMood === "celebrating"
          ? -12
          : -6;

    if (config.bounce) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceY, {
            toValue: bounceHeight,
            duration: bounceSpeed,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceY, {
            toValue: 0,
            duration: bounceSpeed,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else if (currentMood === "sleepy") {
      // Gentle sway when sleepy
      Animated.loop(
        Animated.sequence([
          Animated.timing(tiltAnim, {
            toValue: 8,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(tiltAnim, {
            toValue: -8,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      bounceY.setValue(0);
      tiltAnim.setValue(0);
    }

    // Side-to-side wiggle for angry
    if (currentMood === "angry") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(wiggleAnim, {
            toValue: 4,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(wiggleAnim, {
            toValue: -4,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(wiggleAnim, {
            toValue: 3,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(wiggleAnim, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.delay(1200),
        ]),
      ).start();
    } else {
      wiggleAnim.setValue(0);
    }

    // Lateral bounce for excited
    if (currentMood === "excited" || currentMood === "celebrating") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceX, {
            toValue: 4,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceX, {
            toValue: -4,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      bounceX.setValue(0);
    }

    // Pulse glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Blink — faster when excited, slower when sleepy
    const blinkRate =
      currentMood === "sleepy" ? 2000 : currentMood === "excited" ? 5000 : 3500;
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.1,
          duration: currentMood === "sleepy" ? 200 : 80,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: currentMood === "sleepy" ? 400 : 80,
          useNativeDriver: true,
        }),
      ]).start();
    }, blinkRate);

    return () => clearInterval(blinkInterval);
  }, [currentMood]);

  // ── Tap interaction ───────────────────────────────────
  const handleTap = useCallback(() => {
    setTapCount((c) => c + 1);

    // Squish animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(squishX, {
          toValue: 1.3,
          tension: 300,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(squishY, {
          toValue: 0.7,
          tension: 300,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(squishX, {
          toValue: 0.85,
          tension: 200,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(squishY, {
          toValue: 1.15,
          tension: 200,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(squishX, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(squishY, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Particle burst
    setTapBurst(false);
    setTimeout(() => setTapBurst(true), 10);

    // React to taps
    setTapCount((count) => {
      if (count >= 5) {
        // Too many taps — get annoyed!
        setCurrentMood("angry");
        setReactionText("Hey! Stop poking me! 😤");
        setShowThought(true);
        setTimeout(() => {
          if (mounted.current) {
            setShowThought(false);
            setCurrentMood("happy");
          }
        }, 3000);
        return 0;
      } else if (count === 3) {
        setCurrentMood("excited");
        setReactionText("Hehe that tickles! 🤭");
        setShowThought(true);
        setTimeout(() => {
          if (mounted.current) setShowThought(false);
        }, 2500);
      } else {
        // Single tap — open chat
        setVisible(true);
      }
      return count;
    });
  }, []);

  // Reset tap count after inactivity
  useEffect(() => {
    if (tapCount > 0) {
      const timer = setTimeout(() => setTapCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [tapCount]);

  // ── Drag to move ──────────────────────────────────────
  const dragOffset = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        // @ts-ignore - extractOffset
        posX.extractOffset();
        posY.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: posX, dy: posY }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        posX.flattenOffset();
        posY.flattenOffset();
        // Snap back with a spring
        Animated.parallel([
          Animated.spring(posX, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(posY, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
        // React to being dragged
        setCurrentMood("excited");
        setReactionText("Wheee! 🎢");
        setShowThought(true);
        setTimeout(() => {
          if (mounted.current) {
            setShowThought(false);
            setCurrentMood(screenMood);
          }
        }, 2000);
      },
    }),
  ).current;

  if (!preferences.goodiEnabled) return null;

  // i18n mood-aware messages
  const messageKey = `goodi_${currentMood}_${screen}` as any;
  const fallbackKey = `goodi_${currentMood}` as any;
  const message =
    t(messageKey) !== messageKey
      ? t(messageKey)
      : t(fallbackKey) !== fallbackKey
        ? t(fallbackKey)
        : t("goodiDefault" as any);

  // Mood label for the chat header
  const moodLabel = t(`goodiMood_${currentMood}` as any);

  const tiltRotate = tiltAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: ["-10deg", "10deg"],
  });

  return (
    <>
      {/* Thought bubble */}
      <View style={styles.thoughtContainer}>
        <ThoughtBubble
          text={reactionText}
          visible={showThought}
          color={config.bgColor}
        />
      </View>

      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            backgroundColor: config.glowColor,
            transform: [
              { scale: pulseAnim },
              { translateX: posX },
              { translateY: Animated.add(posY, bounceY) },
            ],
          },
        ]}
      />

      {/* FAB — the character */}
      <Animated.View
        style={[
          styles.fabWrap,
          {
            transform: [
              {
                translateX: Animated.add(
                  Animated.add(posX, bounceX),
                  wiggleAnim,
                ),
              },
              { translateY: Animated.add(posY, bounceY) },
              { scaleX: squishX },
              { scaleY: squishY },
              { rotate: tiltRotate },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: config.bgColor }]}
          onPress={handleTap}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.faceContainer, { opacity: blinkAnim }]}>
            <GoodiEyes shape={config.eyeShape} size="sm" />
          </Animated.View>
          <GoodiMouth shape={config.mouthShape} size="sm" />
          <Blush visible={config.blush} size="sm" />

          {/* Particle burst */}
          <ParticleBurst active={tapBurst} color={config.bgColor} />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat modal */}
      <Modal visible={visible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={[styles.chatBubble, { backgroundColor: colors.cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header with large face */}
            <View style={styles.chatHeader}>
              <View
                style={[styles.chatAvatar, { backgroundColor: config.bgColor }]}
              >
                <GoodiEyes shape={config.eyeShape} size="lg" />
                <GoodiMouth shape={config.mouthShape} size="lg" />
                <Blush visible={config.blush} size="lg" />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.goodiTitle, { color: colors.text }]}>
                  Goodi
                </Text>
                <View style={styles.moodBadge}>
                  <View
                    style={[
                      styles.moodDot,
                      { backgroundColor: config.bgColor },
                    ]}
                  />
                  <Text
                    style={[styles.moodText, { color: colors.textSecondary }]}
                  >
                    {moodLabel !== `goodiMood_${currentMood}`
                      ? moodLabel
                      : currentMood.charAt(0).toUpperCase() +
                        currentMood.slice(1)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Message bubble */}
            <View
              style={[
                styles.messageBubble,
                { backgroundColor: config.bgColor + "12" },
              ]}
            >
              <Text style={[styles.message, { color: colors.text }]}>
                {message}
              </Text>
            </View>

            {/* Mood indicator strip */}
            <View style={styles.moodStrip}>
              {(Object.keys(MOOD_CONFIGS) as GoodiMood[]).map((m) => (
                <View
                  key={m}
                  style={[
                    styles.moodStripDot,
                    {
                      backgroundColor: MOOD_CONFIGS[m].bgColor,
                      opacity: m === currentMood ? 1 : 0.2,
                      transform: [{ scale: m === currentMood ? 1.4 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>

            {/* Quick emotion context tip */}
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              {t("goodiTip" as any) !== "goodiTip"
                ? t("goodiTip" as any)
                : "Tap me, drag me, or just watch — I've got personality! ✨"}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  glowRing: {
    position: "absolute",
    bottom: 82,
    right: 12,
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  fabWrap: {
    position: "absolute",
    bottom: 90,
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  faceContainer: {
    alignItems: "center",
  },
  // Thought bubble
  thoughtContainer: {
    position: "absolute",
    bottom: 155,
    right: 10,
    zIndex: 99,
  },
  thoughtBubble: {
    alignItems: "flex-end",
  },
  thoughtContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 180,
  },
  thoughtText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  thoughtDot1: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 20,
  },
  thoughtDot2: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
    marginRight: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingRight: 20,
    paddingBottom: 150,
  },
  chatBubble: {
    borderRadius: 24,
    padding: 20,
    width: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1 },
  goodiTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodText: {
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 4,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
  },
  moodStrip: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  moodStripDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tipText: {
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});
