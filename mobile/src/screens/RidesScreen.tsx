import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { RideCard } from "../components/RideCard";
import { AppButton, Card, EmptyState, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { sortActiveRides, sortAvailableRides, sortRideHistory } from "../lib/rideSort";
import { colors, radius, spacing } from "../theme";
import type { Ride } from "../types";

type RideFilter = "active" | "available" | "history";

export function RidesScreen({ onOpenRide }: { onOpenRide: (ride: Ride) => void }) {
  const rides = useQuery(api.rides.getDriverRides, {}) as Ride[] | undefined;
  const available = useQuery(api.rides.getAvailableRides, {}) as Ride[] | undefined;
  const rejectRide = useMutation(api.rides.rejectRide);
  const [filter, setFilter] = useState<RideFilter>("active");
  const [busyId, setBusyId] = useState<string | null>(null);

  const shown = useMemo(() => {
    if (filter === "available") return sortAvailableRides(available ?? []);
    if (filter === "history") {
      return sortRideHistory((rides ?? []).filter((ride) => ["delivered", "cancelled", "failed"].includes(ride.status)));
    }
    return sortActiveRides((rides ?? []).filter((ride) => !["delivered", "cancelled", "failed"].includes(ride.status)));
  }, [available, filter, rides]);

  const reject = (ride: Ride) => {
    Alert.alert("Odmítnout zakázku?", `Zakázka #${ride.rideNumber} se skryje ze seznamu volných.`, [
      { text: "Zpět", style: "cancel" },
      {
        text: "Odmítnout",
        style: "destructive",
        onPress: async () => {
          setBusyId(ride._id);
          try {
            await rejectRide({ rideId: ride._id });
          } catch (cause) {
            Alert.alert("Zakázku nelze odmítnout", cause instanceof Error ? cause.message : "Zkuste to znovu.");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const loading = filter === "available" ? available === undefined : rides === undefined;

  return (
    <Screen>
      <PageHeader title="Zakázky" subtitle="Přiřazené i volné jízdy na jednom místě" />

      <View style={styles.filters}>
        <FilterButton label="Aktivní" active={filter === "active"} onPress={() => setFilter("active")} />
        <FilterButton label={`Volné${available?.length ? ` ${available.length}` : ""}`} active={filter === "available"} onPress={() => setFilter("available")} />
        <FilterButton label="Historie" active={filter === "history"} onPress={() => setFilter("history")} />
      </View>

      {loading ? (
        <Card><Text style={styles.loading}>Načítám zakázky…</Text></Card>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={filter === "available" ? "radio-outline" : "cube-outline"}
          title={filter === "available" ? "Žádné volné zakázky" : "Seznam je prázdný"}
          message={filter === "available" ? "Nové zakázky se tu objeví okamžitě po schválení dispečerem." : "V této kategorii nejsou žádné zakázky."}
        />
      ) : (
        <View style={styles.list}>
          {shown.map((ride) => (
            <View key={ride._id} style={styles.item}>
              <RideCard ride={ride} onPress={() => onOpenRide(ride)} />
              {filter === "available" ? (
                <View style={styles.availableActions}>
                  <AppButton title="Detail a přijetí" icon="checkmark-circle-outline" onPress={() => onOpenRide(ride)} style={styles.flex} />
                  <AppButton
                    title="Skrýt"
                    icon="close-outline"
                    variant="secondary"
                    loading={busyId === ride._id}
                    onPress={() => reject(ride)}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filter, active && styles.filterActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", padding: 4, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  filter: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  filterActive: { backgroundColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: colors.primaryText },
  loading: { color: colors.textMuted, textAlign: "center" },
  list: { gap: spacing.lg },
  item: { gap: spacing.sm },
  availableActions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
});
