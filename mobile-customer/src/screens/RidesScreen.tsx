import { useQuery } from "convex/react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { RideCard } from "../components/RideCard";
import { EmptyState, LoadingView, PageHeader, Screen } from "../components/ui";
import { isActiveRide } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { Ride } from "../types";
import { useState } from "react";

type Filter = "all" | "active" | "delivered" | "cancelled";
const filters: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Vše" },
  { key: "active", label: "Aktivní" },
  { key: "delivered", label: "Doručeno" },
  { key: "cancelled", label: "Zrušeno" },
];

export function RidesScreen({ onOpenRide, onNewRide }: { onOpenRide: (ride: Ride) => void; onNewRide: () => void }) {
  const rides = useQuery(api.rides.getMyRides, {}) as Ride[] | undefined;
  const [filter, setFilter] = useState<Filter>("all");
  if (!rides) return <LoadingView label="Načítám vaše zásilky…" />;

  const visible = rides.filter((ride) => {
    if (filter === "active") return isActiveRide(ride.status);
    if (filter === "delivered") return ride.status === "delivered";
    if (filter === "cancelled") return ride.status === "cancelled" || ride.status === "failed";
    return true;
  });

  return (
    <Screen>
      <PageHeader title="Moje zásilky" subtitle={`${rides.length} zásilek celkem`} />
      <View style={styles.filters}>
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} key={item.key} onPress={() => setFilter(item.key)} style={[styles.filter, active && styles.filterActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {visible.length === 0 ? (
        <EmptyState icon="cube-outline" title="Žádné zásilky" message={filter === "all" ? "Zatím jste nevytvořili žádnou zásilku." : "V této kategorii nejsou žádné zásilky."} />
      ) : (
        <View style={styles.list}>{visible.map((ride) => <RideCard key={ride._id} ride={ride} onPress={() => onOpenRide(ride)} />)}</View>
      )}
      <Pressable accessibilityRole="button" onPress={onNewRide} style={styles.floatingButton}>
        <Text style={styles.floatingText}>+ Nová zásilka</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", gap: 6, marginBottom: spacing.lg },
  filter: { flex: 1, minHeight: 38, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  filterActive: { backgroundColor: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.45)" },
  filterText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  filterTextActive: { color: colors.primary },
  list: { gap: spacing.md },
  floatingButton: { minHeight: 50, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  floatingText: { color: colors.primaryText, fontSize: 14, fontWeight: "900" },
});
