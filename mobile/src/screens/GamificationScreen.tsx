import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { useState, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";

type Cadence = "daily" | "weekly" | "monthly";
type Section = Cadence | "badges";
type IconName = ComponentProps<typeof Ionicons>["name"];

type Profile = {
  lifetimeXp: number;
  level: number;
  seasonXp: number;
  currentStreak: number;
  longestStreak: number;
  title: string;
  xpToNextLevel: number;
  xpCurrentLevel: number;
};

type Challenge = {
  _id: string;
  templateCode: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  status: string;
  expiresAt: number;
};

type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

type Badge = {
  code: string;
  name: string;
  description: string;
  iconKey: string;
  currentTier?: BadgeTier;
  nextTier?: BadgeTier;
  nextTierThreshold?: number;
  metricValue: number;
};

const sections: Array<{ key: Section; label: string }> = [
  { key: "daily", label: "Dnes" },
  { key: "weekly", label: "Týden" },
  { key: "monthly", label: "Měsíc" },
  { key: "badges", label: "Odznaky" },
];

const badgeColors: Record<BadgeTier, string> = {
  bronze: "#CD7F32",
  silver: "#C0C7D1",
  gold: "#F6C344",
  platinum: "#8BE4F0",
};

const badgeIcons: Record<string, IconName> = {
  "badge-icon-first-delivery": "cube",
  "badge-icon-always-on-time": "time",
  "badge-icon-pod-professional": "document-text",
  "badge-icon-multi-stop-master": "git-branch",
  "badge-icon-reliable-partner": "shield-checkmark",
  "badge-icon-customer-favorite": "star",
  "badge-icon-team-player": "people",
  "badge-icon-perfect-week": "calendar",
  "badge-icon-deliveries-250": "ribbon",
  "badge-icon-k4y-legend": "trophy",
};

export function GamificationScreen() {
  const [section, setSection] = useState<Section>("daily");
  const profile = useQuery(api.gamification.getMyProfile, {}) as Profile | null | undefined;
  const daily = useQuery(api.gamification.getMyChallenges, { cadence: "daily" }) as Challenge[] | undefined;
  const weekly = useQuery(api.gamification.getMyChallenges, { cadence: "weekly" }) as Challenge[] | undefined;
  const monthly = useQuery(api.gamification.getMyChallenges, { cadence: "monthly" }) as Challenge[] | undefined;
  const badges = useQuery(api.gamification.getMyBadges, {}) as Badge[] | undefined;

  const challenges = section === "daily" ? daily : section === "weekly" ? weekly : monthly;
  const loading = profile === undefined || (section === "badges" ? badges === undefined : challenges === undefined);

  return (
    <Screen>
      <PageHeader title="Výzvy a odznaky" subtitle="Odměny za spolehlivou práci" />

      <ProfileCard profile={profile} />

      <View accessibilityRole="tablist" style={styles.tabs}>
        {sections.map((item) => {
          const active = item.key === section;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSection(item.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Načítám gamifikaci…</Text>
        </View>
      ) : section === "badges" ? (
        <BadgeGrid badges={badges ?? []} />
      ) : (
        <ChallengeList challenges={challenges ?? []} />
      )}
    </Screen>
  );
}

function ProfileCard({ profile }: { profile: Profile | null | undefined }) {
  const levelSpan = Math.max(1, (profile?.xpToNextLevel ?? 1) - (profile?.xpCurrentLevel ?? 0));
  const progress = profile
    ? Math.min(1, Math.max(0, (profile.lifetimeXp - profile.xpCurrentLevel) / levelSpan))
    : 0;

  return (
    <Card style={styles.profileCard}>
      <View style={styles.profileTop}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNumber}>{profile?.level ?? 1}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileTitle}>{profile?.title ?? "Nováček"}</Text>
          <Text style={styles.profileXp}>{profile?.lifetimeXp ?? 0} XP celkem</Text>
        </View>
        <View style={styles.streak}>
          <Ionicons name="flame" color={colors.primary} size={18} />
          <Text style={styles.streakText}>{profile?.currentStreak ?? 0}</Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.profileMeta}>
        <Text style={styles.profileMetaText}>Level {profile?.level ?? 1}</Text>
        <Text style={styles.profileMetaText}>{profile?.seasonXp ?? 0} XP v sezóně</Text>
      </View>
    </Card>
  );
}

function ChallengeList({ challenges }: { challenges: Challenge[] }) {
  if (challenges.length === 0) {
    return <EmptyState icon="trophy-outline" title="Výzvy se připravují" message="Za okamžik se objeví cíle pro toto období." />;
  }

  return (
    <View style={styles.list}>
      {challenges.map((challenge) => {
        const completed = challenge.status === "completed";
        const progress = Math.min(1, challenge.target > 0 ? challenge.progress / challenge.target : 0);
        return (
          <Card key={challenge._id} style={[styles.challenge, completed && styles.challengeCompleted]}>
            <View style={styles.challengeTop}>
              <View style={[styles.challengeIcon, completed && styles.challengeIconCompleted]}>
                <Ionicons name={completed ? "checkmark" : "flag"} color={completed ? colors.primaryText : colors.primary} size={19} />
              </View>
              <View style={styles.challengeCopy}>
                <Text style={styles.challengeName}>{challenge.name}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
              </View>
              <Text style={styles.reward}>+{challenge.xpReward} XP</Text>
            </View>
            <View style={styles.challengeTrack}>
              <View style={[styles.challengeFill, { width: `${progress * 100}%` }, completed && styles.challengeFillCompleted]} />
            </View>
            <View style={styles.challengeMeta}>
              <Text style={styles.challengeValue}>{formatMetric(challenge.progress, challenge.target, challenge.templateCode)}</Text>
              <Text style={styles.challengeExpiry}>{completed ? "Splněno" : expiryLabel(challenge.expiresAt)}</Text>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function BadgeGrid({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) {
    return <EmptyState icon="ribbon-outline" title="Odznaky se připravují" message="První odznak získáš dokončením zásilky." />;
  }

  return (
    <View style={styles.badgeGrid}>
      {badges.map((badge) => {
        const tier = badge.currentTier;
        const color = tier ? badgeColors[tier] : colors.textMuted;
        return (
          <Card key={badge.code} style={[styles.badgeCard, !tier && styles.badgeLocked]}>
            <View style={[styles.badgeFrame, { borderColor: color, backgroundColor: `${color}18` }]}>
              <Ionicons name={badgeIcons[badge.iconKey] ?? "ribbon"} color={color} size={27} />
            </View>
            <Text style={styles.badgeName}>{badge.name}</Text>
            <Text style={[styles.badgeTier, { color }]}>{tier ? tierLabel(tier) : "Zamčeno"}</Text>
            <Text style={styles.badgeMetric}>
              {badge.nextTierThreshold ? `${badge.metricValue} / ${badge.nextTierThreshold}` : `${badge.metricValue}`}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}

function formatMetric(progress: number, target: number, code: string): string {
  if (code.includes("rating")) return `${progress.toFixed(1)} / ${target.toFixed(1)}`;
  if (target <= 1) return `${Math.round(progress * 100)} / ${Math.round(target * 100)} %`;
  return `${Math.floor(progress)} / ${target}`;
}

function expiryLabel(expiresAt: number): string {
  return `Do ${new Date(expiresAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}`;
}

function tierLabel(tier: BadgeTier): string {
  return ({ bronze: "Bronz", silver: "Stříbro", gold: "Zlato", platinum: "Platina" } as const)[tier];
}

const styles = StyleSheet.create({
  profileCard: { marginBottom: spacing.lg, borderColor: "rgba(245,158,11,0.45)" },
  profileTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  levelBadge: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  levelNumber: { color: colors.primaryText, fontSize: 24, fontWeight: "900" },
  profileCopy: { flex: 1 },
  profileTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
  profileXp: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.10)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill },
  streakText: { color: colors.primary, fontWeight: "900" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: "hidden", marginTop: spacing.lg },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  profileMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  profileMetaText: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  tabs: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.surfaceRaised },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  tabTextActive: { color: colors.primary },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  loadingText: { color: colors.textMuted, fontSize: 12 },
  list: { gap: spacing.md },
  challenge: { gap: spacing.md },
  challengeCompleted: { borderColor: "rgba(34,197,94,0.45)" },
  challengeTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  challengeIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  challengeIconCompleted: { backgroundColor: colors.success },
  challengeCopy: { flex: 1 },
  challengeName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  challengeDescription: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  reward: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  challengeTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: "hidden" },
  challengeFill: { height: "100%", borderRadius: 4, backgroundColor: colors.primary },
  challengeFillCompleted: { backgroundColor: colors.success },
  challengeMeta: { flexDirection: "row", justifyContent: "space-between" },
  challengeValue: { color: colors.text, fontSize: 11, fontWeight: "800" },
  challengeExpiry: { color: colors.textMuted, fontSize: 11 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  badgeCard: { width: "47.5%", alignItems: "center", padding: spacing.md },
  badgeLocked: { opacity: 0.55 },
  badgeFrame: { width: 64, height: 64, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  badgeName: { color: colors.text, fontSize: 12, fontWeight: "800", textAlign: "center", minHeight: 32 },
  badgeTier: { fontSize: 10, fontWeight: "900", textTransform: "uppercase", marginTop: 3 },
  badgeMetric: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
});
