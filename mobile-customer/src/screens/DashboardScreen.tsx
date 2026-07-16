import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RideCard } from "../components/RideCard";
import { AppUpdateCard } from "../components/AppUpdateCard";
import { AppButton, Card, EmptyState, IconButton, PageHeader, Screen, SectionTitle } from "../components/ui";
import { isActiveRide } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { CustomerUser, Ride } from "../types";

export function DashboardScreen({
  user,
  unreadNotifications,
  onOpenNotifications,
  onOpenRide,
  onNewRide,
  onOpenRides,
  onOpenProfile,
}: {
  user: CustomerUser;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenRide: (ride: Ride) => void;
  onNewRide: () => void;
  onOpenRides: () => void;
  onOpenProfile: () => void;
}) {
  const rides = useQuery(api.rides.getMyRides, {}) as Ride[] | undefined;
  const activeRides = rides?.filter((ride) => isActiveRide(ride.status)) ?? [];
  const delivered = rides?.filter((ride) => ride.status === "delivered") ?? [];
  const firstName = user.name?.split(" ")[0] || "zákazníku";

  return (
    <Screen>
      <PageHeader
        title={`Dobrý den, ${firstName}`}
        subtitle={activeRides.length > 0 ? `${activeRides.length} aktivní zásilka právě probíhá` : "Vše doručeno. Připraveni na další zásilku?"}
        action={<IconButton icon="notifications-outline" badge={unreadNotifications} label="Oznámení" onPress={onOpenNotifications} />}
      />

      <AppUpdateCard />

      <AppButton title="Objednat novou zásilku" icon="add" onPress={onNewRide} style={styles.primaryAction} />

      <View style={styles.stats}>
        <StatCard icon="cube-outline" label="Aktivní" value={String(activeRides.length)} color={colors.primary} />
        <StatCard icon="checkmark-circle-outline" label="Doručeno" value={String(delivered.length)} color={colors.success} />
        <StatCard icon="layers-outline" label="Celkem" value={String(rides?.length ?? 0)} color={colors.info} />
      </View>

      <SectionTitle
        title="Aktivní zásilky"
        action={activeRides.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={onOpenRides}><Text style={styles.link}>Všechny →</Text></Pressable>
        ) : undefined}
      />
      {activeRides.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Žádné aktivní zásilky"
          message="Novou přepravu vytvoříte během několika minut."
          action={<AppButton title="Objednat zásilku" onPress={onNewRide} />}
        />
      ) : (
        <View style={styles.list}>
          {activeRides.slice(0, 4).map((ride) => <RideCard key={ride._id} ride={ride} onPress={() => onOpenRide(ride)} />)}
        </View>
      )}

      {user.corporateStatus === "none" ? (
        <Card style={styles.corporateCard}>
          <View style={styles.corporateIcon}><Ionicons name="business-outline" size={22} color={colors.primary} /></View>
          <View style={styles.corporateCopy}>
            <Text style={styles.corporateTitle}>Firemní účet a 14denní fakturace</Text>
            <Text style={styles.corporateText}>Ideální pro pravidelné zásilky bez platby při každé objednávce.</Text>
            <Pressable accessibilityRole="button" onPress={onOpenProfile}><Text style={styles.link}>Požádat o firemní účet →</Text></Pressable>
          </View>
        </Card>
      ) : null}
      {user.corporateStatus === "pending" ? (
        <Card style={styles.statusCard}>
          <Ionicons name="time-outline" size={23} color={colors.warning} />
          <View style={styles.corporateCopy}>
            <Text style={styles.corporateTitle}>Žádost se zpracovává</Text>
            <Text style={styles.corporateText}>Dispečer vaši žádost brzy posoudí.</Text>
          </View>
        </Card>
      ) : null}
      {user.corporateStatus === "approved" ? (
        <Card style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={23} color={colors.success} />
          <View style={styles.corporateCopy}>
            <Text style={styles.corporateTitle}>Firemní účet je aktivní</Text>
            <Text style={styles.corporateText}>Fakturace probíhá každých 14 dní.</Text>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

function StatCard({ icon, label, value, color }: { icon: "cube-outline" | "checkmark-circle-outline" | "layers-outline"; label: string; value: string; color: string }) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}><Ionicons name={icon} size={20} color={color} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  primaryAction: { marginBottom: spacing.lg },
  stats: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  statCard: { flex: 1, padding: spacing.md },
  statIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  statValue: { color: colors.text, fontWeight: "900", fontSize: 22 },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  link: { color: colors.primary, fontSize: 12, fontWeight: "800", paddingVertical: spacing.xs },
  list: { gap: spacing.md },
  corporateCard: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  statusCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl },
  corporateIcon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  corporateCopy: { flex: 1 },
  corporateTitle: { color: colors.text, fontWeight: "800", fontSize: 14 },
  corporateText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3, marginBottom: spacing.sm },
});
