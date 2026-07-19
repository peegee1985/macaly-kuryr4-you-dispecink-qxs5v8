import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { XpStarArtwork } from "./GamificationArtwork";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";

type GamificationProfile = {
  level: number;
  title: string;
  lifetimeXp: number;
  xpCurrentLevel: number;
  xpToNextLevel: number;
  currentStreak: number;
};

type Challenge = {
  _id: string;
  status: string;
};

export function GamificationSummaryCard({ onPress }: { onPress: () => void }) {
  const profile = useQuery(api.gamification.getMyProfile, {}) as GamificationProfile | null | undefined;
  const daily = useQuery(api.gamification.getMyChallenges, { cadence: "daily" }) as Challenge[] | undefined;

  if (profile === undefined) return null;

  const completed = (daily ?? []).filter((challenge) => challenge.status === "completed").length;
  const total = daily?.length ?? 0;
  const levelSpan = Math.max(1, profile ? profile.xpToNextLevel - profile.xpCurrentLevel : 1);
  const levelProgress = profile
    ? Math.min(1, Math.max(0, (profile.lifetimeXp - profile.xpCurrentLevel) / levelSpan))
    : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Otevřít výzvy a odznaky"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <XpStarArtwork size={46} />
      <View style={styles.copy}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{profile ? `Level ${profile.level} · ${profile.title}` : "Výzvy a odznaky"}</Text>
          <Ionicons name="chevron-forward" color={colors.textMuted} size={18} />
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${levelProgress * 100}%` }]} />
        </View>
        <Text style={styles.meta}>
          {total > 0 ? `Dnes splněno ${completed}/${total}` : "Otevři dnešní výzvy"}
          {profile?.currentStreak ? ` · Série ${profile.currentStreak} dní` : ""}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(245,158,11,0.10)",
    borderColor: "rgba(245,158,11,0.45)",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pressed: { opacity: 0.78 },
  copy: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.text, fontSize: 14, fontWeight: "800", flex: 1 },
  track: {
    height: 6,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 6, fontWeight: "600" },
});
