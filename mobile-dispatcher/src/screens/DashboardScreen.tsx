import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, IconButton, LoadingView, PageHeader, Screen, SectionTitle, StatusPill } from "../components/ui";
import { formatDateTime, formatMoney } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { DispatcherUser, DriverLocation, Ride, VendingOverview } from "../types";

type HrStats = { totalEmployees: number; onShiftToday: number };

export function DashboardScreen({
  user,
  unreadNotifications,
  onOpenNotifications,
  onOpenRide,
  onOpenRides,
  onOpenMap,
  onOpenMore,
}: {
  user: DispatcherUser;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenRide: (ride: Ride) => void;
  onOpenRides: () => void;
  onOpenMap: () => void;
  onOpenMore: () => void;
}) {
  const rides = useQuery(api.rides.getAllRides, {}) as Ride[] | undefined;
  const activity = useQuery(api.rides.getRecentActivity, {}) as Array<Ride & { driverName?: string; updatedAt?: number }> | undefined;
  const locations = useQuery(api.gps.getAllDriverLocations, {}) as DriverLocation[] | undefined;
  const vending = useQuery(api.vending.getDispatcherOverview, {}) as VendingOverview | undefined;
  const hr = useQuery(api.hr.getHrStats, {}) as HrStats | undefined;

  if (!rides) return <LoadingView label="Načítám řídicí centrum…" />;

  const pending = rides.filter((ride) => ride.status === "pending");
  const active = rides.filter((ride) => ["approved", "assigned", "pickup", "transit"].includes(ride.status));
  const today = new Date().toDateString();
  const deliveredToday = rides.filter((ride) => ride.status === "delivered" && new Date(ride.podDeliveredAt ?? ride._creationTime).toDateString() === today);
  const tracking = locations?.filter((item) => item.isTracking) ?? [];
  const revenue = deliveredToday.reduce((sum, ride) => sum + (ride.price ?? 0), 0);

  return (
    <Screen>
      <PageHeader
        title={`Dobrý den, ${user.name?.split(" ")[0] ?? "dispečere"}`}
        subtitle={new Intl.DateTimeFormat("cs-CZ", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
        action={<IconButton icon="notifications-outline" badge={unreadNotifications} label="Oznámení" onPress={onOpenNotifications} />}
      />

      {pending.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={onOpenRides} style={styles.alert}>
          <View style={styles.alertIcon}><Ionicons name="alert-circle" size={25} color={colors.warning} /></View>
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>{pending.length} {pending.length === 1 ? "zásilka čeká" : "zásilky čekají"} na schválení</Text>
            <Text style={styles.alertText}>Doplňte cenu a přiřaďte řidiče.</Text>
          </View>
          <Ionicons name="chevron-forward" size={21} color={colors.warning} />
        </Pressable>
      ) : null}

      <View style={styles.stats}>
        <StatCard icon="time-outline" label="Čeká" value={String(pending.length)} color={colors.warning} />
        <StatCard icon="car-sport-outline" label="Aktivní" value={String(active.length)} color={colors.info} />
        <StatCard icon="checkmark-circle-outline" label="Dnes doručeno" value={String(deliveredToday.length)} color={colors.success} />
        <StatCard icon="cash-outline" label="Dnešní obrat" value={formatMoney(revenue)} color={colors.primary} compact />
      </View>

      <SectionTitle title="Rychlé řízení" />
      <View style={styles.quickGrid}>
        <QuickAction icon="cube-outline" label="Správa zásilek" detail={`${active.length} aktivních`} onPress={onOpenRides} />
        <QuickAction icon="map-outline" label="Živá mapa" detail={`${tracking.length} GPS online`} onPress={onOpenMap} />
        <QuickAction icon="people-outline" label="Lidé a firmy" detail={`${hr?.onShiftToday ?? 0} na směně`} onPress={onOpenMore} />
        <QuickAction icon="construct-outline" label="Vending servis" detail={`${vending?.openIncidents ?? 0} incidentů`} onPress={onOpenMore} />
      </View>

      <SectionTitle title="Čekající zásilky" action={<Pressable accessibilityRole="button" onPress={onOpenRides}><Text style={styles.link}>Všechny →</Text></Pressable>} />
      {pending.length === 0 ? (
        <Card style={styles.emptyCard}><Ionicons name="checkmark-done" size={25} color={colors.success} /><Text style={styles.emptyText}>Všechny nové zásilky jsou vyřešené.</Text></Card>
      ) : (
        <View style={styles.list}>
          {pending.slice(0, 4).map((ride) => <RideRow key={ride._id} ride={ride} onPress={() => onOpenRide(ride)} />)}
        </View>
      )}

      <SectionTitle title="Živá aktivita" />
      <Card style={styles.activityCard}>
        {(activity ?? []).slice(0, 6).map((item, index) => (
          <View key={item._id} style={[styles.activityRow, index > 0 && styles.activityBorder]}>
            <View style={styles.activityDot} />
            <View style={styles.activityCopy}>
              <View style={styles.activityHeading}>
                <Text style={styles.activityTitle}>#{item.rideNumber}</Text>
                <StatusPill status={item.status} />
              </View>
              <Text style={styles.activityText} numberOfLines={1}>{item.deliveryAddress}{item.driverName ? ` · ${item.driverName}` : ""}</Text>
            </View>
            <Text style={styles.activityTime}>{formatDateTime(item.updatedAt ?? item._creationTime)}</Text>
          </View>
        ))}
        {(activity ?? []).length === 0 ? <Text style={styles.emptyText}>Zatím žádná aktivita.</Text> : null}
      </Card>

      <View style={styles.healthRow}>
        <Health label="GPS online" value={`${tracking.length}/${locations?.length ?? 0}`} ok={tracking.length > 0} />
        <Health label="Na směně" value={String(hr?.onShiftToday ?? 0)} ok={(hr?.onShiftToday ?? 0) > 0} />
        <Health label="Vending offline" value={String(vending?.offlineLocations ?? 0)} ok={(vending?.offlineLocations ?? 0) === 0} />
      </View>
    </Screen>
  );
}

function StatCard({ icon, label, value, color, compact }: { icon: ComponentProps<typeof Ionicons>["name"]; label: string; value: string; color: string; compact?: boolean }) {
  return (
    <Card style={styles.statCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, compact && styles.statValueCompact]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function QuickAction({ icon, label, detail, onPress }: { icon: ComponentProps<typeof Ionicons>["name"]; label: string; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quick, pressed && styles.pressed]}>
      <View style={styles.quickIcon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
      <Text style={styles.quickTitle}>{label}</Text>
      <Text style={styles.quickDetail}>{detail}</Text>
    </Pressable>
  );
}

function RideRow({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.rideRow, pressed && styles.pressed]}>
      <View style={styles.rideCopy}>
        <Text style={styles.rideNumber}>#{ride.rideNumber}</Text>
        <Text style={styles.route} numberOfLines={1}>{ride.pickupAddress}</Text>
        <Text style={styles.route} numberOfLines={1}>→ {ride.deliveryAddress}</Text>
      </View>
      <View style={styles.rideMeta}><Text style={styles.price}>{formatMoney(ride.price)}</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></View>
    </Pressable>
  );
}

function Health({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.health}>
      <View style={[styles.healthDot, { backgroundColor: ok ? colors.success : colors.warning }]} />
      <Text style={styles.healthLabel}>{label}</Text>
      <Text style={styles.healthValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.42)", borderRadius: radius.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  alertIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center" },
  alertCopy: { flex: 1 }, alertTitle: { color: "#FCD34D", fontWeight: "900", fontSize: 13 }, alertText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  statCard: { width: "48%", minHeight: 112, padding: spacing.md }, statValue: { color: colors.text, fontWeight: "900", fontSize: 27, marginTop: spacing.sm }, statValueCompact: { fontSize: 18 }, statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  quick: { width: "48%", minHeight: 118, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  quickIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" }, quickTitle: { color: colors.text, fontWeight: "800", fontSize: 13, marginTop: spacing.sm }, quickDetail: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  pressed: { opacity: 0.72 }, link: { color: colors.primary, fontWeight: "800", fontSize: 12 }, list: { gap: spacing.sm, marginBottom: spacing.xl },
  rideRow: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }, rideCopy: { flex: 1 }, rideNumber: { color: colors.text, fontWeight: "900", fontSize: 14 }, route: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, rideMeta: { alignItems: "flex-end", gap: spacing.sm }, price: { color: colors.primary, fontWeight: "900", fontSize: 12 },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl }, emptyText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  activityCard: { marginBottom: spacing.xl }, activityRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }, activityBorder: { borderTopWidth: 1, borderTopColor: colors.border }, activityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }, activityCopy: { flex: 1 }, activityHeading: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, activityTitle: { color: colors.text, fontWeight: "800", fontSize: 11 }, activityText: { color: colors.textMuted, fontSize: 10, marginTop: 3 }, activityTime: { color: colors.textMuted, fontSize: 8, maxWidth: 80, textAlign: "right" },
  healthRow: { gap: spacing.sm, marginBottom: spacing.lg }, health: { minHeight: 42, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }, healthDot: { width: 7, height: 7, borderRadius: 4 }, healthLabel: { color: colors.textMuted, fontSize: 11, flex: 1 }, healthValue: { color: colors.text, fontWeight: "900", fontSize: 12 },
});
