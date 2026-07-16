import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { RideCard } from "../components/RideCard";
import { EmptyState, LoadingView, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { Ride } from "../types";

type Filter = "all" | "pending" | "active" | "delivered" | "issues";
const filters: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Vše" },
  { key: "pending", label: "Čeká" },
  { key: "active", label: "Aktivní" },
  { key: "delivered", label: "Hotovo" },
  { key: "issues", label: "Problém" },
];

export function RidesScreen({
  onOpenRide,
  onNewRide,
}: {
  onOpenRide: (ride: Ride) => void;
  onNewRide: () => void;
}) {
  const rides = useQuery(api.rides.getAllRides, {}) as Ride[] | undefined;
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () =>
      (rides ?? [])
        .filter((ride) => {
          const matchesStatus =
            filter === "pending"
              ? ride.status === "pending"
              : filter === "active"
                ? ["approved", "assigned", "pickup", "transit"].includes(
                    ride.status,
                  )
                : filter === "delivered"
                  ? ride.status === "delivered"
                  : filter === "issues"
                    ? ["cancelled", "failed"].includes(ride.status)
                    : true;
          const query = search.trim().toLocaleLowerCase("cs");
          return (
            matchesStatus &&
            (!query ||
              [
                ride.rideNumber,
                ride.pickupAddress,
                ride.deliveryAddress,
                ride.pickupContactName,
                ride.deliveryContactName,
              ].some((value) => value.toLocaleLowerCase("cs").includes(query)))
          );
        })
        .sort(
          (a, b) =>
            a.requestedPickupAt - b.requestedPickupAt ||
            a._creationTime - b._creationTime,
        ),
    [filter, rides, search],
  );

  if (!rides) return <LoadingView label="Načítám všechny zásilky…" />;

  return (
    <Screen>
      <PageHeader
        title="Zásilky"
        subtitle={`${rides.length} zakázek · nejbližší termín nahoře`}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nová zásilka"
            onPress={onNewRide}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color={colors.primaryText} />
          </Pressable>
        }
      />
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Číslo, adresa nebo kontakt…"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCapitalize="none"
        />
        {search ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vymazat hledání"
            onPress={() => setSearch("")}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filters}>
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {visible.length === 0 ? (
        <EmptyState
          icon="file-tray-outline"
          title="Nic nenalezeno"
          message="Změňte filtr nebo hledaný výraz."
        />
      ) : (
        <View style={styles.list}>
          {visible.map((ride) => (
            <RideCard
              key={ride._id}
              ride={ride}
              onPress={() => onOpenRide(ride)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  search: { color: colors.text, flex: 1, fontSize: 13 },
  filters: { flexDirection: "row", gap: 5, marginBottom: spacing.lg },
  filter: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.45)",
  },
  filterText: { color: colors.textMuted, fontSize: 9, fontWeight: "800" },
  filterTextActive: { color: colors.primary },
  list: { gap: spacing.md },
});
