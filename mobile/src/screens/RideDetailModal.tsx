import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppButton, Card, StatusPill } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime, formatMoney } from "../lib/format";
import { colors, radius, spacing } from "../theme";
import type { Ride, RideStatus } from "../types";

type PickedPhoto = { uri: string; mimeType?: string | null };

export function RideDetailModal({ ride, onClose }: { ride: Ride | null; onClose: () => void }) {
  const liveRide = useQuery(api.rides.getRide, ride ? { rideId: ride._id } : "skip") as Ride | null | undefined;
  const current = liveRide ?? ride;
  const updateStatus = useMutation(api.rides.updateRideStatus);
  const selfAssign = useMutation(api.rides.selfAssignRide);
  const generateUploadUrl = useMutation(api.rides.generateUploadUrl);
  const submitPOD = useMutation(api.rides.submitPOD);
  const [busy, setBusy] = useState(false);
  const [podMode, setPodMode] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [codCollected, setCodCollected] = useState(false);

  useEffect(() => {
    if (!ride) {
      setPodMode(false);
      setRecipient("");
      setPhoto(null);
      setCodCollected(false);
    }
  }, [ride]);

  if (!current) return null;

  const openMap = async (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    await Linking.openURL(url);
  };

  const call = async (phone?: string) => {
    if (phone) await Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };

  const performPrimaryAction = async () => {
    setBusy(true);
    try {
      if (current.status === "approved") {
        await selfAssign({ rideId: current._id });
      } else if (current.status === "assigned") {
        await updateStatus({ rideId: current._id, status: "pickup" });
      } else if (current.status === "pickup") {
        await updateStatus({ rideId: current._id, status: "transit" });
      } else if (current.status === "transit") {
        setPodMode(true);
      }
    } catch (cause) {
      Alert.alert("Akci nelze dokončit", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Fotoaparát není povolen", "Povolte fotoaparát v nastavení telefonu.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.72,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
    }
  };

  const uploadPhoto = async (picked: PickedPhoto) => {
    const uploadUrl = await generateUploadUrl();
    const blob = await (await fetch(picked.uri)).blob();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": picked.mimeType || "image/jpeg" },
      body: blob,
    });
    if (!response.ok) throw new Error("Fotografii se nepodařilo nahrát.");
    const payload = (await response.json()) as { storageId: string };
    return payload.storageId;
  };

  const finishDelivery = async () => {
    if (!recipient.trim()) {
      Alert.alert("Chybí příjemce", "Zadejte jméno osoby, která zásilku převzala.");
      return;
    }
    if (!photo) {
      Alert.alert("Chybí fotografie", "Vyfoťte zásilku jako doklad o doručení.");
      return;
    }

    setBusy(true);
    try {
      const storageId = await uploadPhoto(photo);
      await submitPOD({
        rideId: current._id,
        photoIds: [storageId],
        recipientName: recipient.trim(),
        codCollected: current.codEnabled ? codCollected : undefined,
      });
      Alert.alert("Doručení potvrzeno", `Zakázka #${current.rideNumber} je dokončena.`, [
        { text: "Hotovo", onPress: onClose },
      ]);
    } catch (cause) {
      Alert.alert("Doručení nelze potvrdit", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setBusy(false);
    }
  };

  const primaryActions: Partial<Record<RideStatus, string>> = {
    approved: "Přijmout zakázku",
    assigned: "Zahájit vyzvednutí",
    pickup: "Potvrdit převzetí",
    transit: "Potvrdit doručení",
  };
  const primaryAction = primaryActions[current.status];

  return (
    <Modal visible={Boolean(ride)} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.modalHeader}>
          <Pressable onPress={podMode ? () => setPodMode(false) : onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{podMode ? "Doklad o doručení" : `Zakázka #${current.rideNumber}`}</Text>
            <Text style={styles.headerSub}>{formatDateTime(current.requestedPickupAt)}</Text>
          </View>
          {!podMode ? <StatusPill status={current.status} /> : null}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {podMode ? (
            <View style={styles.podForm}>
              <Card>
                <Text style={styles.cardLabel}>DORUČOVACÍ ADRESA</Text>
                <Text style={styles.address}>{current.deliveryAddress}</Text>
              </Card>
              <View>
                <Text style={styles.fieldLabel}>Jméno příjemce *</Text>
                <TextInput
                  value={recipient}
                  onChangeText={setRecipient}
                  placeholder="Kdo zásilku převzal"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Fotografie doručené zásilky *</Text>
                {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} /> : null}
                <AppButton
                  title={photo ? "Vyfotit znovu" : "Vyfotit zásilku"}
                  icon="camera-outline"
                  variant="secondary"
                  onPress={() => void takePhoto()}
                />
              </View>
              {current.codEnabled ? (
                <Pressable style={[styles.codToggle, codCollected && styles.codToggleActive]} onPress={() => setCodCollected((value) => !value)}>
                  <Ionicons name={codCollected ? "checkbox" : "square-outline"} size={24} color={codCollected ? colors.success : colors.textMuted} />
                  <View style={styles.flex}>
                    <Text style={styles.codTitle}>Dobírka převzata</Text>
                    <Text style={styles.codValue}>{formatMoney(current.codAmount, current.currency)}</Text>
                  </View>
                </Pressable>
              ) : null}
              <AppButton title="Uzavřít jako doručené" icon="checkmark-done" loading={busy} onPress={() => void finishDelivery()} />
            </View>
          ) : (
            <View style={styles.details}>
              <RouteStop
                label="VYZVEDNUTÍ"
                address={current.pickupAddress}
                name={current.pickupContactName}
                phone={current.pickupContactPhone}
                color={colors.primary}
                onMap={() => void openMap(current.pickupAddress)}
                onCall={() => void call(current.pickupContactPhone)}
              />
              <RouteStop
                label="DORUČENÍ"
                address={current.deliveryAddress}
                name={current.deliveryContactName}
                phone={current.deliveryContactPhone}
                color={colors.success}
                onMap={() => void openMap(current.deliveryAddress)}
                onCall={() => void call(current.deliveryContactPhone)}
              />

              <View style={styles.infoGrid}>
                <Info label="NÁKLAD" value={current.cargoDescription || current.cargoType || "Zásilka"} icon="cube-outline" />
                <Info label="ODMĚNA" value={formatMoney(current.price, current.currency)} icon="cash-outline" />
                <Info label="DORUČENÍ" value={formatDateTime(current.requestedDeliveryAt)} icon="time-outline" />
                <Info label="HMOTNOST" value={current.weight ? `${current.weight} kg` : "—"} icon="barbell-outline" />
              </View>

              {current.notes || current.dispatcherNotes ? (
                <Card>
                  <Text style={styles.cardLabel}>POZNÁMKY</Text>
                  {current.notes ? <Text style={styles.notes}>{current.notes}</Text> : null}
                  {current.dispatcherNotes ? <Text style={styles.notes}>{current.dispatcherNotes}</Text> : null}
                </Card>
              ) : null}

              {current.codEnabled ? (
                <Card style={styles.codCard}>
                  <Ionicons name="wallet-outline" color={colors.warning} size={25} />
                  <View style={styles.flex}>
                    <Text style={styles.codTitle}>Dobírka</Text>
                    <Text style={styles.codHelp}>Při doručení vyberte od příjemce</Text>
                  </View>
                  <Text style={styles.codAmount}>{formatMoney(current.codAmount, current.currency)}</Text>
                </Card>
              ) : null}
            </View>
          )}
        </ScrollView>

        {!podMode && primaryAction ? (
          <View style={styles.bottomAction}>
            <AppButton title={primaryAction} icon="arrow-forward-circle-outline" loading={busy} onPress={() => void performPrimaryAction()} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function RouteStop({ label, address, name, phone, color, onMap, onCall }: { label: string; address: string; name?: string; phone?: string; color: string; onMap: () => void; onCall: () => void }) {
  return (
    <Card>
      <View style={styles.stopHeader}>
        <View style={[styles.stopDot, { backgroundColor: color }]} />
        <Text style={[styles.cardLabel, { color }]}>{label}</Text>
      </View>
      <Text style={styles.address}>{address}</Text>
      {name ? <Text style={styles.contact}>{name}</Text> : null}
      {phone ? <Text style={styles.phone}>{phone}</Text> : null}
      <View style={styles.stopActions}>
        <AppButton title="Navigovat" icon="navigate-outline" variant="secondary" onPress={onMap} style={styles.flex} />
        {phone ? <AppButton title="Volat" icon="call-outline" variant="secondary" onPress={onCall} style={styles.flex} /> : null}
      </View>
    </Card>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof Ionicons>["name"] }) {
  return (
    <Card style={styles.infoCard}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  modalHeader: { paddingTop: 48, minHeight: 106, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.text, fontWeight: "900", fontSize: 17 },
  headerSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  content: { padding: spacing.lg, paddingBottom: 120 },
  details: { gap: spacing.md },
  podForm: { gap: spacing.lg },
  stopHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  stopDot: { width: 9, height: 9, borderRadius: 5 },
  cardLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  address: { color: colors.text, fontSize: 17, fontWeight: "800", lineHeight: 23 },
  contact: { color: colors.text, fontSize: 13, marginTop: spacing.sm },
  phone: { color: colors.primary, fontSize: 13, fontWeight: "700", marginTop: 3 },
  stopActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  flex: { flex: 1 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  infoCard: { width: "48.5%", minHeight: 110, gap: 7 },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  notes: { color: colors.text, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  codCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  codTitle: { color: colors.text, fontWeight: "800", fontSize: 14 },
  codHelp: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  codAmount: { color: colors.warning, fontWeight: "900", fontSize: 16 },
  bottomAction: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, padding: spacing.lg, paddingBottom: 24 },
  fieldLabel: { color: colors.text, fontWeight: "800", fontSize: 12, marginBottom: spacing.sm },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, color: colors.text, paddingHorizontal: spacing.md, fontSize: 15 },
  photo: { width: "100%", aspectRatio: 16 / 10, borderRadius: radius.md, marginBottom: spacing.sm, backgroundColor: colors.surfaceRaised },
  codToggle: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  codToggleActive: { borderColor: "rgba(34,197,94,0.55)" },
  codValue: { color: colors.success, fontWeight: "800", marginTop: 3 },
});
