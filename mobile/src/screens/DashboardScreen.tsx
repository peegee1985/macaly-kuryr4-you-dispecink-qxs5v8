import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RideCard } from "../components/RideCard";
import { AppUpdateCard } from "../components/AppUpdateCard";
import { AppButton, Card, EmptyState, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { sortActiveRides } from "../lib/rideSort";
import { colors, spacing } from "../theme";
import type { DriverUser, Ride, ServiceVisit } from "../types";

export function DashboardScreen({
  user,
  tracking,
  gpsBusy,
  gpsError,
  onGpsToggle,
  onOpenRide,
  onOpenRides,
  onOpenNotifications,
}: {
  user: DriverUser;
  tracking: boolean;
  gpsBusy: boolean;
  gpsError: string | null;
  onGpsToggle: () => void;
  onOpenRide: (ride: Ride) => void;
  onOpenRides: () => void;
  onOpenNotifications: () => void;
}) {
  const rides = useQuery(api.rides.getDriverRides, {}) as Ride[] | undefined;
  const visits = useQuery(api.vending.getDriverTodayVisits, {}) as ServiceVisit[] | undefined;
  const unread = useQuery(api.notifications.getUnreadCount, {}) as number | undefined;

  const active = sortActiveRides((rides ?? []).filter((ride) => !["delivered", "cancelled", "failed"].includes(ride.status)));
  const today = new Date().toDateString();
  const todayCount = (rides ?? []).filter((ride) => new Date(ride.requestedPickupAt).toDateString() === today).length;

  return (
    <Screen>
      <PageHeader
        title={`Ahoj, ${(user.name || "řidiči").split(" ")[0]}`}
        subtitle={user.vehiclePlate ? `${user.vehicleType || "Vozidlo"} · ${user.vehiclePlate}` : "Připraven vyrazit?"}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Otevřít oznámení" onPress={onOpenNotifications} style={styles.notification}>
            <Ionicons name="notifications-outline" color={colors.text} size={22} />
            {unread ? <View style={styles.notificationDot}><Text style={styles.notificationCount}>{Math.min(unread, 9)}</Text></View> : null}
          </Pressable>
        }
      />

      <AppUpdateCard />

      <Card style={[styles.gpsCard, tracking && styles.gpsCardActive]}>
        <View style={styles.gpsTop}>
          <View style={[styles.gpsIcon, tracking && styles.gpsIconActive]}>
            <Ionicons name="navigate" color={tracking ? colors.primaryText : colors.primary} size={22} />
          </View>
          <View style={styles.gpsCopy}>
            <Text style={styles.gpsTitle}>{tracking ? "Poloha se sdílí" : "GPS je vypnutá"}</Text>
            <Text style={styles.gpsSubtitle}>{tracking ? "Dispečer vidí aktuální polohu" : "Zapněte ji na začátku směny"}</Text>
          </View>
          <View style={[styles.liveDot, tracking && styles.liveDotActive]} />
        </View>
        {gpsError ? <Text style={styles.gpsError}>{gpsError}</Text> : null}
        <AppButton
          title={tracking ? "Ukončit sdílení" : "Zahájit směnu a GPS"}
          icon={tracking ? "stop-circle-outline" : "play-circle-outline"}
          variant={tracking ? "secondary" : "primary"}
          loading={gpsBusy}
          onPress={onGpsToggle}
        />
      </Card>

      <View style={styles.stats}>
        <Stat value={active.length} label="Aktivní" color={colors.primary} />
        <Stat value={todayCount} label="Dnes" color={colors.info} />
        <Stat value={(visits ?? []).length} label="Vending" color={colors.success} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Aktivní zakázky</Text>
        <Text style={styles.sectionLink} onPress={onOpenRides}>Zobrazit vše →</Text>
      </View>

      {rides === undefined ? (
        <Card><Text style={styles.loadingText}>Načítám zakázky…</Text></Card>
      ) : active.length === 0 ? (
        <EmptyState icon="checkmark-done" title="Vše hotovo" message="Momentálně nemáte žádnou aktivní zakázku." />
      ) : (
        <View style={styles.list}>
          {active.slice(0, 3).map((ride) => <RideCard key={ride._id} ride={ride} onPress={() => onOpenRide(ride)} />)}
        </View>
      )}
    </Screen>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  notification: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  notificationDot: { position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.background },
  notificationCount: { color: colors.white, fontSize: 9, fontWeight: "900" },
  gpsCard: { gap: spacing.lg, marginBottom: spacing.lg },
  gpsCardActive: { borderColor: "rgba(245,158,11,0.55)" },
  gpsTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  gpsIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  gpsIconActive: { backgroundColor: colors.primary },
  gpsCopy: { flex: 1 },
  gpsTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  gpsSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.textMuted },
  liveDotActive: { backgroundColor: colors.success },
  gpsError: { color: "#FCA5A5", fontSize: 12 },
  stats: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  stat: { flex: 1, alignItems: "center", padding: spacing.md },
  statValue: { fontSize: 25, fontWeight: "900" },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  sectionLink: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  list: { gap: spacing.md },
  loadingText: { color: colors.textMuted, textAlign: "center" },
});
