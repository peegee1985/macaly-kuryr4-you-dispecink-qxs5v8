import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, StatusPill } from "./ui";
import { formatDateTime, formatMoney } from "../lib/format";
import { colors, spacing } from "../theme";
import type { Ride } from "../types";

export function RideCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.number}>#{ride.rideNumber}</Text>
            <Text style={styles.time}>{formatDateTime(ride.requestedPickupAt)}</Text>
          </View>
          <StatusPill status={ride.status} />
        </View>

        <View style={styles.route}>
          <View style={styles.routeRail}>
            <View style={[styles.dot, styles.pickupDot]} />
            <View style={styles.line} />
            <View style={[styles.dot, styles.deliveryDot]} />
          </View>
          <View style={styles.routeCopy}>
            <View>
              <Text style={styles.routeLabel}>VYZVEDNUTÍ</Text>
              <Text style={styles.address} numberOfLines={2}>{ride.pickupAddress}</Text>
            </View>
            <View>
              <Text style={styles.routeLabel}>DORUČENÍ</Text>
              <Text style={styles.address} numberOfLines={2}>{ride.deliveryAddress}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.meta}>
            <Ionicons name="cube-outline" size={15} color={colors.textMuted} />
            <Text style={styles.metaText}>{ride.cargoDescription || ride.cargoType || "Zásilka"}</Text>
          </View>
          {ride.price !== undefined ? <Text style={styles.price}>{formatMoney(ride.price, ride.currency)}</Text> : null}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  card: { gap: spacing.lg },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  number: { color: colors.text, fontSize: 18, fontWeight: "900" },
  time: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  route: { flexDirection: "row", gap: spacing.md },
  routeRail: { width: 14, alignItems: "center", paddingVertical: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  pickupDot: { backgroundColor: colors.background, borderColor: colors.primary },
  deliveryDot: { backgroundColor: colors.success, borderColor: colors.success },
  line: { flex: 1, width: 2, minHeight: 34, backgroundColor: colors.border },
  routeCopy: { flex: 1, gap: spacing.lg },
  routeLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 1.2, fontWeight: "800" },
  address: { color: colors.text, fontSize: 14, fontWeight: "600", marginTop: 3, lineHeight: 19 },
  footer: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  meta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: colors.textMuted, fontSize: 12, flexShrink: 1 },
  price: { color: colors.primary, fontWeight: "800", fontSize: 13, marginRight: spacing.sm },
});
