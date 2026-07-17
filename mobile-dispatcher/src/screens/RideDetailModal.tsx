import Ionicons from "@expo/vector-icons/Ionicons";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton, Card, FormField, StatusPill } from "../components/ui";
import { cargoLabel, formatDateTime, formatMoney, rideStatusLabel } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { Ride, RideStatus, UserSummary } from "../types";

const statuses: RideStatus[] = ["pending", "approved", "assigned", "pickup", "transit", "delivered", "cancelled"];

export function RideDetailModal({ ride: initialRide, onClose }: { ride: Ride | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const liveRide = useQuery(api.rides.getRide, initialRide ? { rideId: initialRide._id } : "skip") as Ride | null | undefined;
  const drivers = useQuery(api.users.listActiveDrivers, initialRide ? {} : "skip") as UserSummary[] | undefined;
  const customers = useQuery(api.users.listCustomers, initialRide ? {} : "skip") as UserSummary[] | undefined;
  const approveRide = useMutation(api.rides.approveRide);
  const updatePrice = useMutation(api.rides.updateRidePrice);
  const assignDriver = useMutation(api.rides.assignDriver);
  const unassignDriver = useMutation(api.rides.unassignDriver);
  const forceStatusUpdate = useMutation(api.rides.forceStatusUpdate);
  const sendPaymentLink = useAction(api.rides.sendPaymentLink);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const ride = liveRide ?? initialRide;

  useEffect(() => {
    if (ride) {
      setPrice(ride.price === undefined ? "" : String(ride.price));
      setNotes(ride.dispatcherNotes ?? "");
    }
  }, [ride?._id, ride?.price, ride?.dispatcherNotes]);

  if (!ride) return null;
  const customer = customers?.find((item) => item._id === ride.customerId);
  const driver = drivers?.find((item) => item._id === ride.driverId);

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try {
      await action();
      if (success) Alert.alert("Hotovo", success);
    } catch (error) {
      Alert.alert("Operace se nepodařila", String((error as { message?: string }).message ?? error));
    } finally {
      setBusy(null);
    }
  };

  const savePrice = () => {
    const value = Number(price.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return Alert.alert("Neplatná cena", "Zadejte částku v CZK.");
    if (ride.status === "pending") void run("price", () => approveRide({ rideId: ride._id, price: value, currency: "CZK", dispatcherNotes: notes.trim() || undefined }), "Zakázka byla schválena.");
    else void run("price", () => updatePrice({ rideId: ride._id, price: value, currency: "CZK" }), "Cena byla uložena.");
  };

  const changeStatus = (status: RideStatus) => {
    if (status === ride.status || status === "failed") return;
    Alert.alert("Změnit stav zakázky?", `${rideStatusLabel[ride.status]} → ${rideStatusLabel[status]}`, [
      { text: "Zrušit", style: "cancel" },
      { text: "Změnit", style: status === "cancelled" ? "destructive" : "default", onPress: () => void run(`status-${status}`, () => forceStatusUpdate({ rideId: ride._id, status })) },
    ]);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <View><Text style={styles.eyebrow}>ŘÍZENÍ ZAKÁZKY</Text><Text style={styles.title}>#{ride.rideNumber}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Zavřít" onPress={onClose} style={styles.close}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
          <View style={styles.statusRow}><StatusPill status={ride.status} /><Text style={styles.priceValue}>{formatMoney(ride.price, ride.currency)}</Text></View>

          <Card style={styles.identityCard}>
            <DetailRow label="Zákazník" value={customer?.name ?? customer?.companyName ?? customer?.email ?? "Načítám…"} />
            <DetailRow label="Řidič" value={driver?.name ?? driver?.email ?? (ride.driverId ? "Přiřazený řidič" : "Nepřiřazen")} />
            <DetailRow label="Platba" value={ride.isPaid ? "Uhrazeno" : "Neuhrazeno"} valueColor={ride.isPaid ? colors.success : colors.warning} />
          </Card>

          <Card style={styles.routeCard}>
            <RoutePoint color={colors.primary} label="VYZVEDNUTÍ" address={ride.pickupAddress} name={ride.pickupContactName} phone={ride.pickupContactPhone} time={ride.requestedPickupAt} />
            <View style={styles.routeLine} />
            <RoutePoint color={colors.success} label="DORUČENÍ" address={ride.deliveryAddress} name={ride.deliveryContactName} phone={ride.deliveryContactPhone} time={ride.requestedDeliveryAt} />
          </Card>

          <Text style={styles.sectionTitle}>Cena a schválení</Text>
          <Card style={styles.formCard}>
            <FormField label="Cena CZK" icon="cash-outline" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Zadejte cenu" />
            {ride.status === "pending" ? <FormField label="Poznámka dispečera" value={notes} onChangeText={setNotes} multiline /> : null}
            <AppButton title={ride.status === "pending" ? "Schválit zakázku" : "Uložit cenu"} icon="checkmark-circle-outline" loading={busy === "price"} onPress={savePrice} />
            {ride.price && !ride.isPaid ? <AppButton title="Odeslat platební odkaz" icon="card-outline" variant="secondary" loading={busy === "payment"} onPress={() => void run("payment", () => sendPaymentLink({ rideId: ride._id }), "Platební odkaz byl odeslán zákazníkovi.")} /> : null}
          </Card>

          <Text style={styles.sectionTitle}>Přiřazení řidiče</Text>
          <Card style={styles.driverCard}>
            {ride.driverId ? (
              <View style={styles.assignedRow}><View style={styles.driverAvatar}><Ionicons name="car-sport" size={22} color={colors.primary} /></View><View style={styles.flex}><Text style={styles.driverName}>{driver?.name ?? driver?.email ?? "Přiřazený řidič"}</Text><Text style={styles.muted}>Aktuálně přiřazen k zakázce</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Odebrat řidiče" onPress={() => void run("unassign", () => unassignDriver({ rideId: ride._id }))} style={styles.remove}><Ionicons name="close" size={18} color={colors.danger} /></Pressable></View>
            ) : (
              <View style={styles.driverList}>{drivers?.map((item) => <Pressable key={item._id} accessibilityRole="button" disabled={busy !== null} onPress={() => void run(`driver-${item._id}`, () => assignDriver({ rideId: ride._id, driverId: item._id }))} style={styles.driverRow}><View style={styles.driverAvatar}><Ionicons name="person-outline" size={20} color={colors.primary} /></View><View style={styles.flex}><Text style={styles.driverName}>{item.name ?? item.email}</Text><Text style={styles.muted}>{item.email}</Text></View>{busy === `driver-${item._id}` ? <Text style={styles.loadingText}>Ukládám…</Text> : <Ionicons name="add-circle-outline" size={22} color={colors.primary} />}</Pressable>)}</View>
            )}
            {!ride.driverId && drivers?.length === 0 ? <Text style={styles.muted}>Není dostupný žádný aktivní řidič.</Text> : null}
          </Card>

          <Text style={styles.sectionTitle}>Ruční stav</Text>
          <View style={styles.statusGrid}>{statuses.map((status) => <Pressable key={status} accessibilityRole="radio" accessibilityState={{ checked: status === ride.status }} disabled={busy !== null} onPress={() => changeStatus(status)} style={[styles.statusChoice, status === ride.status && styles.statusChoiceActive, status === "cancelled" && styles.statusDanger]}><Text style={[styles.statusText, status === ride.status && styles.statusTextActive, status === "cancelled" && { color: colors.danger }]}>{rideStatusLabel[status]}</Text></Pressable>)}</View>

          <Text style={styles.sectionTitle}>Informace</Text>
          <Card>
            <DetailRow label="Náklad" value={`${cargoLabel[ride.cargoType]} · ${ride.quantity} ks${ride.weight ? ` · ${ride.weight} kg` : ""}`} />
            <DetailRow label="Popis" value={ride.cargoDescription} />
            {ride.notes ? <DetailRow label="Poznámka" value={ride.notes} /> : null}
            {ride.dispatcherNotes ? <DetailRow label="Interní" value={ride.dispatcherNotes} /> : null}
            {ride.codEnabled ? <DetailRow label="Dobírka" value={formatMoney(ride.codAmount)} /> : null}
            {ride.isFragile ? <DetailRow label="Režim" value="Křehké" /> : null}
            {ride.isRefrigerated ? <DetailRow label="Teplota" value="Chlazené" /> : null}
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

function RoutePoint({ color, label, address, name, phone, time }: { color: string; label: string; address: string; name: string; phone: string; time: number }) {
  return <View style={styles.routePoint}><View style={[styles.routeDot, { backgroundColor: color }]} /><View style={styles.flex}><Text style={styles.cardLabel}>{label}</Text><Text style={styles.address}>{address}</Text><Text style={styles.muted}>{formatDateTime(time)}</Text><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`tel:${phone}`)}><Text style={styles.contact}>{name} · {phone}</Text></Pressable><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)}><Text style={styles.mapLink}>Otevřít v mapě →</Text></Pressable></View></View>;
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 78, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, eyebrow: { color: colors.primary, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 }, title: { color: colors.text, fontWeight: "900", fontSize: 22, marginTop: 2 }, close: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" }, content: { padding: spacing.lg },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.md }, priceValue: { color: colors.primary, fontWeight: "900", fontSize: 16 }, identityCard: { marginBottom: spacing.md }, routeCard: { marginBottom: spacing.xl }, routePoint: { flexDirection: "row", gap: spacing.md }, routeDot: { width: 11, height: 11, borderRadius: 6, marginTop: 5 }, routeLine: { width: 2, height: 25, backgroundColor: colors.border, marginLeft: 4.5, marginVertical: 4 }, flex: { flex: 1 }, cardLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "800", letterSpacing: 1 }, address: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: "700", marginTop: 3 }, muted: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 }, contact: { color: colors.primary, fontSize: 10, fontWeight: "700", marginTop: 5 }, mapLink: { color: colors.info, fontSize: 10, fontWeight: "700", marginTop: 5 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginBottom: spacing.md }, formCard: { gap: spacing.md, marginBottom: spacing.xl }, driverCard: { marginBottom: spacing.xl }, driverList: { gap: spacing.sm }, driverRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, assignedRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md }, driverAvatar: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" }, driverName: { color: colors.text, fontWeight: "800", fontSize: 12 }, remove: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: "rgba(239,68,68,0.12)", alignItems: "center", justifyContent: "center" }, loadingText: { color: colors.primary, fontSize: 9 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl }, statusChoice: { width: "48%", minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm }, statusChoiceActive: { borderColor: colors.primary, backgroundColor: "rgba(245,158,11,0.12)" }, statusDanger: { borderColor: "rgba(239,68,68,0.28)" }, statusText: { color: colors.textMuted, fontSize: 9, fontWeight: "700", textAlign: "center" }, statusTextActive: { color: colors.primary }, detailRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }, detailLabel: { color: colors.textMuted, fontSize: 10, width: 76 }, detailValue: { color: colors.text, fontSize: 11, lineHeight: 16, flex: 1, textAlign: "right", fontWeight: "600" },
});
