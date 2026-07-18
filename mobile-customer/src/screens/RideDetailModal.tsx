import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton, Card, StatusPill } from "../components/ui";
import { cargoLabel, formatDateTime, formatMoney } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { Ride, TrackingRide } from "../types";

type PodData = {
  podDeliveredAt?: number;
  podRecipientName?: string;
  signatureUrl?: string;
  photoUrls: string[];
  rideNumber: string;
  deliveryAddress: string;
};

export function RideDetailModal({ ride, onClose }: { ride: Ride | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const tracking = useQuery(api.rides.getRideByTrackingToken, ride ? { token: ride.trackingToken } : "skip") as TrackingRide | null | undefined;
  const pod = useQuery(api.rides.getPODData, ride?.status === "delivered" ? { rideId: ride._id } : "skip") as PodData | null | undefined;
  if (!ride) return null;

  // Živé sledování vede na webovou mapu (Leaflet) — stejná stránka,
  // kterou dostává příjemce v SMS.
  const openTracking = () => {
    void Linking.openURL(`https://www.kuryr4you.cz/sledovani/${ride.trackingToken}`);
  };

  const openPayment = () => {
    if (ride.stripePaymentUrl) void Linking.openURL(ride.stripePaymentUrl);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <View>
            <Text style={styles.eyebrow}>DETAIL ZÁSILKY</Text>
            <Text style={styles.title}>#{ride.rideNumber}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Zavřít" onPress={onClose} style={styles.close}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
          <View style={styles.statusRow}>
            <StatusPill status={ride.status} />
            <Text style={styles.price}>{formatMoney(ride.price, ride.currency)}</Text>
          </View>

          <Progress status={ride.status} />

          <Card style={styles.routeCard}>
            <RoutePoint icon="radio-button-on" color={colors.primary} label="Vyzvednutí" address={ride.pickupAddress} contact={ride.pickupContactName} phone={ride.pickupContactPhone} time={ride.requestedPickupAt} />
            <View style={styles.routeLine} />
            <RoutePoint icon="location" color={colors.success} label="Doručení" address={ride.deliveryAddress} contact={ride.deliveryContactName} phone={ride.deliveryContactPhone} time={ride.requestedDeliveryAt} />
          </Card>

          {tracking?.driverName ? (
            <Card style={styles.driverCard}>
              <View style={styles.driverIcon}><Ionicons name="car-sport-outline" size={24} color={colors.primary} /></View>
              <View style={styles.driverCopy}>
                <Text style={styles.cardLabel}>PŘIŘAZENÝ ŘIDIČ</Text>
                <Text style={styles.driverName}>{tracking.driverName}</Text>
                {tracking.estimatedDeliveryAt ? <Text style={styles.muted}>Odhad doručení: {formatDateTime(tracking.estimatedDeliveryAt)}</Text> : null}
              </View>
            </Card>
          ) : null}
          {["assigned", "pickup", "transit"].includes(ride.status) ? (
            <AppButton title="Sledovat zásilku na mapě" icon="map-outline" variant="secondary" onPress={openTracking} style={styles.locationButton} />
          ) : null}

          {!ride.isPaid && ride.stripePaymentUrl ? (
            <AppButton title="Zaplatit online" icon="card-outline" onPress={openPayment} style={styles.locationButton} />
          ) : null}

          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Informace o zásilce</Text>
            <DetailRow label="Typ" value={cargoLabel[ride.cargoType]} />
            <DetailRow label="Popis" value={ride.cargoDescription} />
            <DetailRow label="Množství" value={`${ride.quantity} ks`} />
            {ride.weight ? <DetailRow label="Hmotnost" value={`${ride.weight} kg`} /> : null}
            {ride.price ? <DetailRow label="Cena" value={`${ride.price.toLocaleString("cs-CZ")} ${ride.currency ?? "Kč"}`} /> : null}
            <DetailRow label="Platba" value={ride.isPaid ? "Uhrazeno" : "Čeká na úhradu"} />
            {ride.notes ? <DetailRow label="Poznámka" value={ride.notes} /> : null}
            {ride.dispatcherNotes ? <DetailRow label="Dispečer" value={ride.dispatcherNotes} /> : null}
          </Card>

          {ride.status === "delivered" && pod ? (
            <Card style={styles.podCard}>
              <Text style={styles.sectionTitle}>Doklad o doručení</Text>
              {pod.podRecipientName ? <DetailRow label="Převzal" value={pod.podRecipientName} /> : null}
              {pod.podDeliveredAt ? <DetailRow label="Doručeno" value={formatDateTime(pod.podDeliveredAt)} /> : null}
              {pod.photoUrls.length > 0 ? (
                <View style={styles.photos}>{pod.photoUrls.map((url) => <Image key={url} source={{ uri: url }} style={styles.photo} resizeMode="cover" />)}</View>
              ) : null}
              {pod.signatureUrl ? (
                <View style={styles.signatureWrap}>
                  <Text style={styles.cardLabel}>PODPIS PŘÍJEMCE</Text>
                  <Image source={{ uri: pod.signatureUrl }} style={styles.signature} resizeMode="contain" />
                </View>
              ) : null}
            </Card>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Progress({ status }: { status: Ride["status"] }) {
  const steps = ["Přijato", "Řidič", "Doručeno"];
  const active = status === "delivered" ? 2 : ["assigned", "pickup", "transit"].includes(status) ? 1 : 0;
  const failed = status === "cancelled" || status === "failed";
  return (
    <View style={styles.progress}>
      {steps.map((label, index) => (
        <View key={label} style={styles.progressPart}>
          <View style={[styles.progressCircle, index <= active && !failed && styles.progressCircleActive, failed && styles.progressCircleFailed]}>
            <Text style={[styles.progressNumber, index <= active && !failed && styles.progressNumberActive]}>{failed ? "×" : index < active ? "✓" : index + 1}</Text>
          </View>
          <Text style={[styles.progressLabel, index <= active && !failed && styles.progressLabelActive]}>{label}</Text>
          {index < steps.length - 1 ? <View style={[styles.progressConnector, index < active && !failed && styles.progressConnectorActive]} /> : null}
        </View>
      ))}
    </View>
  );
}

function RoutePoint({ icon, color, label, address, contact, phone, time }: { icon: "radio-button-on" | "location"; color: string; label: string; address: string; contact: string; phone: string; time: number }) {
  return (
    <View style={styles.routePoint}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={styles.routeCopy}>
        <Text style={styles.cardLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.address}>{address}</Text>
        <Text style={styles.muted}>{formatDateTime(time)}</Text>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`tel:${phone}`)}>
          <Text style={styles.contact}>{contact} · {phone}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 78, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: colors.text, fontWeight: "900", fontSize: 22, marginTop: 2 },
  close: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.lg },
  price: { color: colors.primary, fontWeight: "900", fontSize: 15, flex: 1, textAlign: "right" },
  progress: { flexDirection: "row", marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
  progressPart: { flex: 1, alignItems: "center", position: "relative" },
  progressCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center", zIndex: 2 },
  progressCircleActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  progressCircleFailed: { borderColor: colors.danger, backgroundColor: "rgba(239,68,68,0.15)" },
  progressNumber: { color: colors.textMuted, fontWeight: "900", fontSize: 11 },
  progressNumberActive: { color: colors.primaryText },
  progressLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", marginTop: 6 },
  progressLabelActive: { color: colors.text },
  progressConnector: { position: "absolute", height: 2, backgroundColor: colors.border, left: "65%", right: "-35%", top: 14, zIndex: 1 },
  progressConnectorActive: { backgroundColor: colors.success },
  routeCard: { marginBottom: spacing.md },
  routePoint: { flexDirection: "row", gap: spacing.md },
  routeCopy: { flex: 1 },
  routeLine: { width: 2, height: 28, backgroundColor: colors.border, marginLeft: 9, marginVertical: 4 },
  cardLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  address: { color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 3 },
  muted: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  contact: { color: colors.primary, fontSize: 11, fontWeight: "700", marginTop: 6 },
  driverCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  driverIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  driverCopy: { flex: 1 },
  driverName: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 2 },
  locationButton: { marginBottom: spacing.md },
  detailsCard: { marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.md },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.md },
  detailLabel: { color: colors.textMuted, fontSize: 12, width: 82 },
  detailValue: { color: colors.text, fontSize: 12, fontWeight: "600", flex: 1, textAlign: "right", lineHeight: 18 },
  podCard: { marginBottom: spacing.md },
  photos: { gap: spacing.sm, marginTop: spacing.md },
  photo: { width: "100%", height: 190, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  signatureWrap: { marginTop: spacing.lg, gap: spacing.sm },
  signature: { width: "100%", height: 120, borderRadius: radius.md, backgroundColor: colors.white },
});
