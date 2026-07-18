import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, PageHeader, Screen } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime, visitStatusLabel } from "../lib/format";
import { colors, radius, spacing } from "../theme";
import type { ServiceVisit } from "../types";

export function VendingScreen({ onOpenVisit }: { onOpenVisit: (visit: ServiceVisit) => void }) {
  const visits = useQuery(api.vending.getDriverTodayVisits, {}) as ServiceVisit[] | undefined;

  return (
    <Screen>
      <PageHeader title="Vending" subtitle="Servisní návštěvy na dnešek a zítřek" />

      {visits === undefined ? (
        <Card><Text style={styles.loading}>Načítám návštěvy…</Text></Card>
      ) : visits.length === 0 ? (
        <EmptyState icon="storefront-outline" title="Žádné návštěvy" message="Na dnešek ani zítřek nemáte naplánovaný vending." />
      ) : (
        <View style={styles.list}>
          {visits.map((visit) => <VisitCard key={visit._id} visit={visit} onPress={() => onOpenVisit(visit)} />)}
        </View>
      )}
    </Screen>
  );
}

function VisitCard({ visit, onPress }: { visit: ServiceVisit; onPress: () => void }) {
  const location = visit.location;
  const statusColor = visit.status === "in_progress" ? colors.primary : visit.status === "completed" ? colors.success : colors.info;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <View style={styles.top}>
          <View style={styles.icon}>
            <Ionicons name="storefront" size={22} color={colors.primary} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.name}>{location?.name || "Servisní lokace"}</Text>
            <Text style={styles.number}>{visit.visitNumber}</Text>
          </View>
          <View style={[styles.status, { backgroundColor: `${statusColor}1F`, borderColor: `${statusColor}55` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{visitStatusLabel[visit.status] || visit.status}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={17} color={colors.textMuted} />
          <Text style={styles.rowText} numberOfLines={2}>{location?.address || "Adresa není uvedena"}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={17} color={colors.textMuted} />
          <Text style={styles.rowText}>{formatDateTime(visit.scheduledAt)}</Text>
          {visit.estimatedDuration ? <Text style={styles.duration}>· {visit.estimatedDuration} min</Text> : null}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { color: colors.textMuted, textAlign: "center" },
  list: { gap: spacing.md },
  pressed: { opacity: 0.72 },
  card: { gap: spacing.md },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  name: { color: colors.text, fontWeight: "800", fontSize: 15 },
  number: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  status: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 10, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowText: { color: colors.textMuted, fontSize: 12, flexShrink: 1 },
  duration: { color: colors.textMuted, fontSize: 12 },
  chevron: { marginLeft: "auto" },
});
