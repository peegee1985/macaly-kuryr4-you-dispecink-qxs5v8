import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { GamificationBadge, StreakFlameArtwork, XpStarArtwork, type BadgeTier } from "../components/GamificationArtwork";
import { AppButton, Card, EmptyState, FormField, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { colors, radius, spacing } from "../theme";

type LeaderboardDriver = {
  userId: string;
  name: string;
  role: string;
  level: number;
  lifetimeXp: number;
  xpInLevel: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  badgeCount: number;
};

type DriverProfile = {
  lifetimeXp: number;
  level: number;
  seasonXp: number;
  currentStreak: number;
  longestStreak: number;
  title: string;
};

type DriverChallenge = {
  _id: string;
  name: string;
  cadence: string;
  progress: number;
  target: number;
  xpReward: number;
  status: string;
  expiresAt: number;
};

type DriverBadge = {
  code: string;
  name: string;
  iconKey: string;
  tier: BadgeTier;
  awardedAt: number;
};

type AuditEvent = {
  _id: string;
  eventKey: string;
  type: string;
  xp: number;
  occurredAt: number;
  isManual?: boolean;
  reason?: string;
  dispatcherName?: string;
};

type ChallengeTemplate = {
  _id: string;
  code: string;
  name: string;
  cadence: string;
  metric: string;
  target?: number;
  xpReward: number;
  active: boolean;
};

export function GamificationAdminScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"leaderboard" | "templates">("leaderboard");
  const [selected, setSelected] = useState<LeaderboardDriver | null>(null);

  if (selected) {
    return <DriverGamificationDetail driver={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <Screen>
      <PageHeader title="Gamifikace" subtitle="Výkon, odznaky a výzvy řidičů" onBack={onBack} />
      <View accessibilityRole="tablist" style={styles.tabs}>
        <TabButton label="Žebříček" active={tab === "leaderboard"} onPress={() => setTab("leaderboard")} />
        <TabButton label="Šablony výzev" active={tab === "templates"} onPress={() => setTab("templates")} />
      </View>
      {tab === "leaderboard" ? <Leaderboard onSelect={setSelected} /> : <ChallengeTemplates />}
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Leaderboard({ onSelect }: { onSelect: (driver: LeaderboardDriver) => void }) {
  const drivers = useQuery(api.gamification.getAllDriversLeaderboard, {}) as LeaderboardDriver[] | undefined;

  if (drivers === undefined) return <Loading label="Načítám žebříček…" />;
  if (drivers.length === 0) {
    return <EmptyState icon="trophy-outline" title="Žádní řidiči" message="Gamifikace se zobrazí po načtení řidičských účtů." />;
  }

  const totalXp = drivers.reduce((sum, driver) => sum + driver.lifetimeXp, 0);
  const totalBadges = drivers.reduce((sum, driver) => sum + driver.badgeCount, 0);
  const averageLevel = Math.round((drivers.reduce((sum, driver) => sum + driver.level, 0) / drivers.length) * 10) / 10;

  return (
    <>
      <View style={styles.summaryGrid}>
        <Summary value={String(drivers.length)} label="Řidičů" icon="people" />
        <Summary value={String(totalXp)} label="XP celkem" icon="star" />
        <Summary value={String(totalBadges)} label="Odznaků" icon="ribbon" />
        <Summary value={String(averageLevel)} label="Prům. level" icon="trending-up" />
      </View>
      <Text style={styles.sectionTitle}>Žebříček řidičů</Text>
      <View style={styles.list}>
        {drivers.map((driver, index) => {
          const progress = Math.min(1, Math.max(0, driver.xpInLevel / Math.max(1, driver.xpForNextLevel)));
          return (
            <Pressable
              key={driver.userId}
              accessibilityRole="button"
              accessibilityLabel={`Otevřít gamifikaci řidiče ${driver.name}`}
              onPress={() => onSelect(driver)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Card style={styles.driverCard}>
                <View style={[styles.rank, index < 3 && styles.rankTop]}>
                  <Text style={[styles.rankText, index < 3 && styles.rankTextTop]}>{index + 1}</Text>
                </View>
                <View style={styles.driverCopy}>
                  <View style={styles.rowBetween}>
                    <Text numberOfLines={1} style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.levelPill}>Lvl {driver.level}</Text>
                  </View>
                  <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.meta}>{driver.lifetimeXp} XP</Text>
                    <Text style={styles.meta}>{driver.badgeCount} odznaků · série {driver.currentStreak}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" color={colors.textMuted} size={20} />
              </Card>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function Summary({ value, label, icon }: { value: string; label: string; icon: "people" | "star" | "ribbon" | "trending-up" }) {
  return (
    <Card style={styles.summaryCard}>
      <Ionicons name={icon} color={colors.primary} size={19} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Card>
  );
}

function DriverGamificationDetail({ driver, onBack }: { driver: LeaderboardDriver; onBack: () => void }) {
  const profile = useQuery(api.gamification.getDriverGamificationProfile, { driverId: driver.userId }) as DriverProfile | null | undefined;
  const challenges = useQuery(api.gamification.getDriverActiveChallenges, { driverId: driver.userId }) as DriverChallenge[] | undefined;
  const badges = useQuery(api.gamification.getDriverBadges, { driverId: driver.userId }) as DriverBadge[] | undefined;
  const audit = useQuery(api.gamification.getDriverAuditHistory, { driverId: driver.userId, limit: 30 }) as AuditEvent[] | undefined;
  const award = useMutation(api.gamification.manualAward);
  const [xp, setXp] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submitAward = async () => {
    const value = Number(xp.replace(",", "."));
    if (!Number.isInteger(value) || value === 0 || value < -2000 || value > 2000) {
      Alert.alert("Neplatné XP", "Zadejte celé číslo od −2 000 do +2 000, kromě nuly.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Chybí důvod", "Ruční ocenění nebo korekce musí mít uvedený důvod.");
      return;
    }
    setSaving(true);
    try {
      await award({ driverId: driver.userId, xp: value, reason: reason.trim() });
      setXp("");
      setReason("");
      Alert.alert("Uloženo", value > 0 ? `Řidiči bylo přidáno ${value} XP.` : `Řidiči bylo odečteno ${Math.abs(value)} XP.`);
    } catch (error) {
      Alert.alert("Ocenění se nepodařilo", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageHeader title={driver.name} subtitle="Detail gamifikace řidiče" onBack={onBack} />
      <Card style={styles.profileCard}>
        <XpStarArtwork size={58} />
        <View style={styles.driverCopy}>
          <Text style={styles.profileTitle}>Level {profile?.level ?? driver.level} · {profile?.title ?? "Nováček"}</Text>
          <Text style={styles.profileXp}>{profile?.lifetimeXp ?? driver.lifetimeXp} XP celkem · {profile?.seasonXp ?? 0} XP v sezóně</Text>
        </View>
        <View style={styles.streak}><StreakFlameArtwork size={24} /><Text style={styles.streakText}>{profile?.currentStreak ?? driver.currentStreak}</Text></View>
      </Card>

      <Text style={styles.sectionTitle}>Ruční ocenění nebo korekce</Text>
      <Card style={styles.formCard}>
        <FormField label="XP (−2 000 až +2 000)" value={xp} onChangeText={setXp} keyboardType="numbers-and-punctuation" placeholder="např. 250 nebo -100" />
        <FormField label="Povinný důvod" value={reason} onChangeText={setReason} multiline placeholder="Proč XP přidáváte nebo odebíráte?" />
        <AppButton title={saving ? "Ukládám…" : "Uložit do auditu"} icon="checkmark-circle-outline" loading={saving} onPress={() => void submitAward()} />
      </Card>

      <Text style={styles.sectionTitle}>Aktivní výzvy</Text>
      {challenges === undefined ? <Loading label="Načítám výzvy…" /> : challenges.length === 0 ? (
        <EmptyState icon="flag-outline" title="Bez aktivních výzev" message="Řidič nyní nemá žádnou aktivní výzvu." />
      ) : (
        <View style={styles.list}>{challenges.map((challenge) => <ChallengeRow key={challenge._id} challenge={challenge} />)}</View>
      )}

      <Text style={styles.sectionTitle}>Získané odznaky</Text>
      {badges === undefined ? <Loading label="Načítám odznaky…" /> : badges.length === 0 ? (
        <EmptyState icon="ribbon-outline" title="Zatím bez odznaků" message="Odznaky se udělují automaticky podle výkonu řidiče." />
      ) : (
        <View style={styles.badgeGrid}>
          {badges.map((badge) => (
            <Card key={`${badge.code}:${badge.tier}`} style={styles.badgeCard}>
              <GamificationBadge iconKey={badge.iconKey} tier={badge.tier} size={78} />
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeTier}>{tierLabel(badge.tier)}</Text>
            </Card>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Audit změn XP</Text>
      {audit === undefined ? <Loading label="Načítám audit…" /> : audit.length === 0 ? (
        <EmptyState icon="time-outline" title="Audit je prázdný" message="První změna XP se zde objeví automaticky." />
      ) : (
        <View style={styles.list}>{audit.map((event) => <AuditRow key={event._id} event={event} />)}</View>
      )}
    </Screen>
  );
}

function ChallengeRow({ challenge }: { challenge: DriverChallenge }) {
  const progress = Math.min(1, challenge.target > 0 ? challenge.progress / challenge.target : 0);
  return (
    <Card style={styles.compactCard}>
      <View style={styles.rowBetween}>
        <View style={styles.driverCopy}><Text style={styles.itemTitle}>{challenge.name}</Text><Text style={styles.meta}>{cadenceLabel(challenge.cadence)} · do {new Date(challenge.expiresAt).toLocaleDateString("cs-CZ")}</Text></View>
        <Text style={styles.reward}>+{challenge.xpReward} XP</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      <Text style={styles.meta}>{formatNumber(challenge.progress)} / {formatNumber(challenge.target)}</Text>
    </Card>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  const positive = event.xp >= 0;
  return (
    <Card style={styles.auditCard}>
      <View style={[styles.auditIcon, { backgroundColor: positive ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)" }]}>
        <Ionicons name={positive ? "add" : "remove"} color={positive ? colors.success : colors.danger} size={19} />
      </View>
      <View style={styles.driverCopy}>
        <Text style={styles.itemTitle}>{event.reason || eventTypeLabel(event.type)}</Text>
        <Text style={styles.meta}>{formatDateTime(event.occurredAt)}{event.dispatcherName ? ` · ${event.dispatcherName}` : ""}</Text>
      </View>
      <Text style={[styles.auditXp, { color: positive ? colors.success : colors.danger }]}>{positive ? "+" : ""}{event.xp} XP</Text>
    </Card>
  );
}

function ChallengeTemplates() {
  const templates = useQuery(api.gamification.listChallengeTemplates, {}) as ChallengeTemplate[] | undefined;
  if (templates === undefined) return <Loading label="Načítám šablony…" />;
  if (templates.length === 0) return <EmptyState icon="options-outline" title="Žádné šablony" message="Šablony se objeví po inicializaci gamifikace." />;
  return (
    <View style={styles.list}>
      <Text style={styles.help}>Změna ovlivní nově vytvářené výzvy. Úpravy jsou serverové a platí pro řidičskou aplikaci.</Text>
      {templates.map((template) => <TemplateEditor key={template._id} template={template} />)}
    </View>
  );
}

function TemplateEditor({ template }: { template: ChallengeTemplate }) {
  const update = useMutation(api.gamification.updateChallengeTemplate);
  const [xp, setXp] = useState(String(template.xpReward));
  const [target, setTarget] = useState(template.target === undefined ? "" : String(template.target));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const xpValue = Number(xp.replace(",", "."));
    const targetValue = target.trim() ? Number(target.replace(",", ".")) : undefined;
    if (!Number.isFinite(xpValue) || xpValue < 50 || xpValue > 2000 || (targetValue !== undefined && (!Number.isFinite(targetValue) || targetValue < 0))) {
      Alert.alert("Neplatné hodnoty", "XP musí být 50–2 000 a cíl nesmí být záporný.");
      return;
    }
    setSaving(true);
    try {
      await update({ templateId: template._id, xpReward: xpValue, ...(targetValue === undefined ? {} : { target: targetValue }) });
      Alert.alert("Uloženo", `Šablona „${template.name}“ byla aktualizována.`);
    } catch (error) {
      Alert.alert("Uložení se nepodařilo", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (active: boolean) => {
    try {
      await update({ templateId: template._id, active });
    } catch (error) {
      Alert.alert("Změna se nepodařila", errorMessage(error));
    }
  };

  return (
    <Card style={styles.templateCard}>
      <View style={styles.rowBetween}>
        <View style={styles.driverCopy}><Text style={styles.itemTitle}>{template.name}</Text><Text style={styles.meta}>{cadenceLabel(template.cadence)} · {template.metric}</Text></View>
        <Switch
          accessibilityLabel={`${template.active ? "Deaktivovat" : "Aktivovat"} výzvu ${template.name}`}
          value={template.active}
          onValueChange={(value) => void setActive(value)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>
      <View style={styles.fieldRow}>
        <FormField style={styles.field} label="Odměna XP" value={xp} onChangeText={setXp} keyboardType="numeric" />
        <FormField style={styles.field} label="Cíl" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="adaptivní" />
      </View>
      <AppButton title="Uložit šablonu" variant="secondary" loading={saving} onPress={() => void save()} />
    </Card>
  );
}

function Loading({ label }: { label: string }) {
  return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.meta}>{label}</Text></View>;
}

function tierLabel(tier: BadgeTier): string {
  return ({ bronze: "Bronz", silver: "Stříbro", gold: "Zlato", platinum: "Platina" } as const)[tier];
}

function cadenceLabel(cadence: string): string {
  return ({ daily: "Denní", weekly: "Týdenní", monthly: "Měsíční" } as Record<string, string>)[cadence] ?? cadence;
}

function eventTypeLabel(type: string): string {
  return ({ ride_completed: "Dokončená zásilka", challenge_completed: "Splněná výzva", manual_award: "Ruční úprava XP" } as Record<string, string>)[type] ?? type;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("cs-CZ", { maximumFractionDigits: 2 });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.surfaceRaised },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: colors.primary },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  summaryCard: { width: "47.5%", padding: spacing.md },
  summaryValue: { color: colors.text, fontSize: 23, fontWeight: "900", marginTop: spacing.xs },
  summaryLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900", marginTop: spacing.xl, marginBottom: spacing.md },
  list: { gap: spacing.md },
  driverCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  rank: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  rankTop: { backgroundColor: "rgba(245,158,11,0.16)", borderWidth: 1, borderColor: "rgba(245,158,11,0.45)" },
  rankText: { color: colors.textMuted, fontSize: 13, fontWeight: "900" },
  rankTextTop: { color: colors.primary },
  driverCopy: { flex: 1, minWidth: 0 },
  driverName: { color: colors.text, fontSize: 14, fontWeight: "900", flex: 1 },
  levelPill: { color: colors.primary, fontSize: 11, fontWeight: "900", backgroundColor: "rgba(245,158,11,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: "hidden", marginVertical: spacing.sm },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: colors.primary },
  meta: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderColor: "rgba(245,158,11,0.45)" },
  profileTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  profileXp: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  streak: { flexDirection: "row", alignItems: "center", gap: 3 },
  streakText: { color: colors.primary, fontWeight: "900" },
  formCard: { gap: spacing.md },
  compactCard: { gap: spacing.sm },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  reward: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  badgeCard: { width: "47.5%", alignItems: "center", padding: spacing.md },
  badgeName: { color: colors.text, fontSize: 11, fontWeight: "800", textAlign: "center", minHeight: 30 },
  badgeTier: { color: colors.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase", marginTop: 3 },
  auditCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  auditIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  auditXp: { fontSize: 12, fontWeight: "900" },
  help: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.xs },
  templateCard: { gap: spacing.md },
  fieldRow: { flexDirection: "row", gap: spacing.md },
  field: { flex: 1 },
  loading: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  pressed: { opacity: 0.72 },
});
