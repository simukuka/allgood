import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useTranslation } from "@/constants/i18n";
import { useApp } from "@/contexts/AppContext";
import { useThemeColors } from "@/hooks/useThemeColors";

const LESSONS = [
  {
    icon: "book",
    title: "beginnerGuide",
    desc: "beginnerGuideDesc",
    color: "#3b82f6",
    duration: "8 min",
    progress: 0.6,
    videoUrl: "https://www.youtube.com/results?search_query=personal+finance+basics+for+immigrants+USA",
  },
  {
    icon: "card",
    title: "creditScore101",
    desc: "creditScore101Desc",
    color: "#8b5cf6",
    duration: "12 min",
    progress: 0.3,
    videoUrl: "https://www.youtube.com/results?search_query=how+to+build+credit+score+in+USA+without+SSN+ITIN",
  },
  {
    icon: "wallet",
    title: "savingStrategies",
    desc: "savingStrategiesDesc",
    color: "#22c55e",
    duration: "10 min",
    progress: 0,
    videoUrl: "https://www.youtube.com/results?search_query=saving+money+strategies+beginners+2024",
  },
  {
    icon: "calculator",
    title: "taxBasics",
    desc: "taxBasicsDesc",
    color: "#f59e0b",
    duration: "15 min",
    progress: 0,
    videoUrl: "https://www.youtube.com/results?search_query=ITIN+tax+filing+guide+immigrants+USA",
  },
  {
    icon: "pie-chart",
    title: "budgeting101",
    desc: "budgeting101Desc",
    color: "#ec4899",
    duration: "6 min",
    progress: 0,
    videoUrl: "https://www.youtube.com/results?search_query=how+to+budget+money+beginners+50+30+20+rule",
  },
];

export default function LearningHubScreen() {
  const colors = useThemeColors();
  const { preferences } = useApp();
  const t = useTranslation(preferences.language);

  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const completedCount = LESSONS.filter((l) => l.progress >= 1).length;
  const inProgressCount = LESSONS.filter(
    (l) => l.progress > 0 && l.progress < 1,
  ).length;

  return (
    <ScreenLayout>
      <ScreenHeader title={t("learningHubTitle")} />

      {/* Progress overview */}
      <View
        style={[
          styles.progressCard,
          { backgroundColor: colors.primary + "10" },
        ]}
      >
        <View style={styles.progressStats}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>
              {completedCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("completed")}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: "#f59e0b" }]}>
              {inProgressCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("inProgress")}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.textSecondary }]}>
              {LESSONS.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t("totalLessons")}
            </Text>
          </View>
        </View>
        <View
          style={[styles.overallBar, { backgroundColor: colors.border + "60" }]}
        >
          <View
            style={[
              styles.overallProgress,
              {
                backgroundColor: colors.primary,
                width: `${
                  (LESSONS.reduce((s, l) => s + l.progress, 0) /
                    LESSONS.length) *
                  100
                }%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Lesson cards */}
      <View style={styles.lessonList}>
        {LESSONS.map((lesson, i) => {
          const isExpanded = expandedLesson === i;
          const statusColor =
            lesson.progress >= 1
              ? "#22c55e"
              : lesson.progress > 0
                ? "#f59e0b"
                : colors.textSecondary;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.lessonCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setExpandedLesson(isExpanded ? null : i)}
              activeOpacity={0.7}
            >
              <View style={styles.lessonTop}>
                <View
                  style={[
                    styles.lessonIcon,
                    { backgroundColor: lesson.color + "15" },
                  ]}
                >
                  <Ionicons
                    name={lesson.icon as any}
                    size={22}
                    color={lesson.color}
                  />
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={[styles.lessonTitle, { color: colors.text }]}>
                    {t(lesson.title as any)}
                  </Text>
                  <View style={styles.lessonMeta}>
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.lessonDuration,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {lesson.duration}
                    </Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text style={[styles.lessonStatus, { color: statusColor }]}>
                      {lesson.progress >= 1
                        ? t("completed")
                        : lesson.progress > 0
                          ? `${Math.round(lesson.progress * 100)}%`
                          : t("notStarted")}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>

              {lesson.progress > 0 && lesson.progress < 1 && (
                <View
                  style={[
                    styles.lessonBar,
                    { backgroundColor: colors.border + "60" },
                  ]}
                >
                  <View
                    style={[
                      styles.lessonProgress,
                      {
                        backgroundColor: lesson.color,
                        width: `${lesson.progress * 100}%`,
                      },
                    ]}
                  />
                </View>
              )}

              {isExpanded && (
                <View
                  style={[
                    styles.expandedContent,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text
                    style={[styles.lessonDesc, { color: colors.textSecondary }]}
                  >
                    {t(lesson.desc as any)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.startBtn, { backgroundColor: lesson.color }]}
                    activeOpacity={0.8}
                    onPress={() => Linking.openURL(lesson.videoUrl)}
                    accessibilityLabel={lesson.progress > 0 ? "Continue lesson on YouTube" : "Start lesson on YouTube"}
                    accessibilityRole="link"
                  >
                    <Ionicons
                      name="logo-youtube"
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.startBtnText}>
                      {lesson.progress > 0 ? t("continue") : t("startLesson")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  progressCard: { borderRadius: 16, padding: 20, marginBottom: 24 },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  stat: { alignItems: "center" },
  statNum: { fontSize: 24, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: "500" },
  overallBar: { height: 6, borderRadius: 3 },
  overallProgress: { height: 6, borderRadius: 3 },
  lessonList: { gap: 12 },
  lessonCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  lessonTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  lessonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  lessonMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  lessonDuration: { fontSize: 12 },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  lessonStatus: { fontSize: 12, fontWeight: "600" },
  lessonBar: { height: 4, marginHorizontal: 16, borderRadius: 2 },
  lessonProgress: { height: 4, borderRadius: 2 },
  expandedContent: {
    borderTopWidth: 1,
    padding: 16,
    gap: 14,
  },
  lessonDesc: { fontSize: 14, lineHeight: 20 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  startBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
