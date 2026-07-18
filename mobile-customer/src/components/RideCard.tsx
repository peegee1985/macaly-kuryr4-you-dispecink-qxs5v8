import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { cargoLabel, formatDateTime, formatMoney, isActiveRide, rideStatusColor } from "../lib/format";
import { colors, radius, spacing } from "../theme";
import type { Ride } from "../types";
import { StatusPill } from "./ui";

export function RideCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  const accent = rideStatusColor[ride.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Zásilka ${ride.rideNumber}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.number}>#{ride.rideNumber}</Text>
          <Text style={styles.cargo}>{cargoLabel[ride.cargoType]} · {ride.quantity} ks</Text>
        </View>
        <StatusPill status={ride.status} />
      </View>

      <View style={styles.route}>
        <View style={styles.routeMarks}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={styles.line} />
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.routeCopy}>
          <Text style={styles.address} numberOfLines={1}>{ride.pickupAddress}</Text>
          <Text style={styles.addressMuted} numberOfLines={1}>{ride.deliveryAddress}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.footerText}>{formatDateTime(ride.requestedPickupAt)}</Text>
        </View>
        <Text style={[styles.price, isActiveRide(ride.status) && ride.price === undefined && styles.priceMuted]}>
          {formatMoney(ride.price, ride.currency)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, overflow: "hidden" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md },
  headerCopy: { flex: 1 },
  number: { color: colors.text, fontWeight: "900", fontSize: 15 },
  cargo: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  route: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  routeMarks: { alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 1, height: 20, backgroundColor: colors.border },
  routeCopy: { flex: 1, gap: 11 },
  address: { color: colors.text, fontSize: 13, fontWeight: "600" },
  addressMuted: { color: colors.textMuted, fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  footerText: { color: colors.textMuted, fontSize: 10 },
  price: { color: colors.primary, fontSize: 11, fontWeight: "800", textAlign: "right" },
  priceMuted: { color: colors.textMuted, fontWeight: "600" },
});
