import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
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
import SignatureCanvas, { type SignatureViewRef } from "react-native-signature-canvas";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SlideToConfirm } from "../components/SlideToConfirm";
import { AppButton, Card, StatusPill } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime, formatMoney } from "../lib/format";
import { colors, radius, spacing } from "../theme";
import type { Ride, RideStatus } from "../types";

type PickedPhoto = { uri: string; mimeType?: string | null };
type UploadedPOD = { photoIds: string[]; signatureId?: string; failedItems: string[] };

const MAX_POD_PHOTOS = 4;
const SIGNATURE_WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; width: 100%; height: 100%; margin: 0; }
  .m-signature-pad--body { border: none; left: 0; right: 0; top: 0; bottom: 0; }
  .m-signature-pad--footer { display: none; margin: 0; }
  body, html { width: 100%; height: 100%; overflow: hidden; background: #fff; }
`;

export function RideDetailModal({ ride, onClose }: { ride: Ride | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const liveRide = useQuery(api.rides.getRide, ride ? { rideId: ride._id } : "skip") as Ride | null | undefined;
  const current = liveRide ?? ride;
  const updateStatus = useMutation(api.rides.updateRideStatus);
  const selfAssign = useMutation(api.rides.selfAssignRide);
  const reorderStops = useMutation(api.rides.reorderStops);
  const generateUploadUrl = useMutation(api.rides.generateUploadUrl);
  const submitPOD = useMutation(api.rides.submitPOD);
  const signatureRef = useRef<SignatureViewRef>(null);
  const [busy, setBusy] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [podMode, setPodMode] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [codCollected, setCodCollected] = useState(false);

  useEffect(() => {
    setPodMode(false);
    setRecipient("");
    setPhotos([]);
    setSignature(null);
    setSignatureError(null);
    setScrollEnabled(true);
    setCodCollected(false);
  }, [ride?._id]);

  if (!current) return null;

  const sortedStops = current.isMultiStop
    ? [...(current.stops ?? [])].sort((a, b) => a.order - b.order)
    : [];

  const openMap = async (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    await Linking.openURL(url);
  };

  const openFullRoute = async () => {
    const origin = encodeURIComponent(current.pickupAddress);
    const destination = encodeURIComponent(current.deliveryAddress);
    const waypoints = sortedStops.map((stop) => stop.address).join("|");
    const waypointParam = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : "";
    await Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointParam}&travelmode=driving`,
    );
  };

  const call = async (phone?: string) => {
    if (phone) await Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };

  const moveStop = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sortedStops.length) return;

    const next = [...sortedStops];
    [next[index], next[target]] = [next[target]!, next[index]!];
    const normalized = next.map((stop, stopIndex) => ({ ...stop, order: stopIndex + 1 }));

    setReordering(true);
    try {
      await reorderStops({ rideId: current._id, stops: normalized });
    } catch (cause) {
      Alert.alert("Pořadí nelze uložit", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setReordering(false);
    }
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
    if (photos.length >= MAX_POD_PHOTOS) {
      Alert.alert("Limit fotografií", `K jednomu doručení lze přidat nejvýše ${MAX_POD_PHOTOS} fotografie.`);
      return;
    }

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
      const asset = result.assets[0];
      setPhotos((currentPhotos) => [
        ...currentPhotos,
        { uri: asset.uri, mimeType: asset.mimeType },
      ].slice(0, MAX_POD_PHOTOS));
    }
  };

  const uploadFile = async (fileUri: string, mimeType: string) => {
    const uploadUrl = await generateUploadUrl();
    const response = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": mimeType },
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Soubor se nepodařilo nahrát (HTTP ${response.status}).`);
    }
    const payload = JSON.parse(response.body) as { storageId?: string };
    if (!payload.storageId) throw new Error("Server nevrátil identifikátor souboru.");
    return payload.storageId;
  };

  const uploadPhoto = async (picked: PickedPhoto) =>
    uploadFile(picked.uri, picked.mimeType || "image/jpeg");

  const uploadSignature = async (dataUrl: string) => {
    const base64 = dataUrl.match(/^data:image\/png;base64,(.+)$/)?.[1];
    if (!base64 || !FileSystem.cacheDirectory) throw new Error("Podpis nemá platný formát.");

    const signatureUri = `${FileSystem.cacheDirectory}pod-signature-${current._id}-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(signatureUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    try {
      return await uploadFile(signatureUri, "image/png");
    } finally {
      await FileSystem.deleteAsync(signatureUri, { idempotent: true }).catch(() => undefined);
    }
  };

  const uploadPOD = async (): Promise<UploadedPOD> => {
    const photoResults = await Promise.allSettled(photos.map(uploadPhoto));
    const photoIds = photoResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failedItems: string[] = photoResults.some((result) => result.status === "rejected") ? ["fotografie"] : [];

    let signatureId: string | undefined;
    if (signature) {
      try {
        signatureId = await uploadSignature(signature);
      } catch {
        failedItems.push("podpis");
      }
    }

    return { photoIds, signatureId, failedItems };
  };

  const confirmWithoutPOD = (message: string) => {
    Alert.alert(
      "Dokončit bez dokladu?",
      `${message}\n\nDoručení bude uloženo bez fotografie a podpisu.`,
      [
        { text: "Zpět", style: "cancel" },
        { text: "Dokončit bez POD", style: "destructive", onPress: () => void finishDelivery(true) },
      ],
    );
  };

  const finishDelivery = async (withoutPOD = false) => {
    if (!recipient.trim()) {
      Alert.alert("Chybí příjemce", "Zadejte jméno osoby, která zásilku převzala.");
      return;
    }
    if (!withoutPOD && photos.length === 0 && !signature) {
      confirmWithoutPOD("Nebyla pořízena fotografie ani podpis.");
      return;
    }

    setBusy(true);
    try {
      const uploaded = withoutPOD
        ? { photoIds: [], signatureId: undefined, failedItems: [] }
        : await uploadPOD();

      if (!withoutPOD && uploaded.photoIds.length === 0 && !uploaded.signatureId) {
        setBusy(false);
        confirmWithoutPOD("Fotografii ani podpis se nepodařilo nahrát.");
        return;
      }

      await submitPOD({
        rideId: current._id,
        photoIds: uploaded.photoIds,
        signatureId: uploaded.signatureId,
        recipientName: recipient.trim(),
        codCollected: current.codEnabled ? codCollected : undefined,
      });
      const warning = uploaded.failedItems.length
        ? `\n\nNepodařilo se uložit: ${uploaded.failedItems.join(" a ")}. Ostatní doklad byl uložen.`
        : withoutPOD ? "\n\nZakázka byla dokončena bez POD." : "";
      Alert.alert("Doručení potvrzeno", `Zakázka #${current.rideNumber} je dokončena.${warning}`, [
        { text: "Hotovo", onPress: onClose },
      ]);
    } catch (cause) {
      Alert.alert("Doručení nelze potvrdit", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setBusy(false);
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
    setSignatureError(null);
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
        <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <Pressable onPress={podMode ? () => setPodMode(false) : onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{podMode ? "Doklad o doručení" : `Zakázka #${current.rideNumber}`}</Text>
            <Text style={styles.headerSub}>{formatDateTime(current.requestedPickupAt)}</Text>
          </View>
          {!podMode ? <StatusPill status={current.status} /> : null}
        </View>

        <ScrollView
          scrollEnabled={scrollEnabled}
          contentContainerStyle={[styles.content, { paddingBottom: primaryAction && !podMode ? 104 + insets.bottom : spacing.xxl + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
                <View style={styles.fieldTitleRow}>
                  <Text style={styles.fieldLabel}>Fotografie doručené zásilky (doporučeno)</Text>
                  <Text style={styles.fieldCounter}>{photos.length}/{MAX_POD_PHOTOS}</Text>
                </View>
                {photos.length ? (
                  <View style={styles.photoGrid}>
                    {photos.map((photo, index) => (
                      <View key={`${photo.uri}-${index}`} style={styles.photoWrap}>
                        <Image source={{ uri: photo.uri }} style={styles.photo} />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Odebrat fotografii ${index + 1}`}
                          onPress={() => setPhotos((currentPhotos) => currentPhotos.filter((_, photoIndex) => photoIndex !== index))}
                          style={styles.removePhoto}
                        >
                          <Ionicons name="close" size={18} color={colors.white} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
                {photos.length < MAX_POD_PHOTOS ? (
                  <AppButton
                    title={photos.length ? "Přidat další fotografii" : "Vyfotit zásilku"}
                    icon="camera-outline"
                    variant="secondary"
                    onPress={() => void takePhoto()}
                  />
                ) : null}
              </View>
              <View>
                <View style={styles.fieldTitleRow}>
                  <Text style={styles.fieldLabel}>Podpis příjemce (doporučeno)</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Vymazat podpis" onPress={clearSignature} hitSlop={8}>
                    <Text style={styles.clearSignature}>Vymazat</Text>
                  </Pressable>
                </View>
                <View style={styles.signaturePad}>
                  <SignatureCanvas
                    ref={signatureRef}
                    onBegin={() => setScrollEnabled(false)}
                    onEnd={() => {
                      setScrollEnabled(true);
                      signatureRef.current?.readSignature();
                    }}
                    onOK={(value) => {
                      setSignature(value);
                      setSignatureError(null);
                    }}
                    onEmpty={() => setSignature(null)}
                    onClear={() => setSignature(null)}
                    onError={(error) => {
                      setScrollEnabled(true);
                      setSignatureError(error.message || "Podpisovou plochu se nepodařilo načíst.");
                    }}
                    imageType="image/png"
                    penColor="#111827"
                    backgroundColor="#FFFFFF"
                    minWidth={1.1}
                    maxWidth={3}
                    webStyle={SIGNATURE_WEB_STYLE}
                    style={styles.signatureCanvas}
                    webviewContainerStyle={styles.signatureCanvas}
                    androidLayerType="hardware"
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    webviewProps={{ cacheEnabled: false, allowFileAccess: false }}
                  />
                </View>
                <Text style={[styles.signatureHelp, signature && styles.signatureReady]}>
                  {signature ? "Podpis je zaznamenaný" : "Příjemce se podepíše prstem do bílé plochy"}
                </Text>
                {signatureError ? <Text style={styles.signatureError}>{signatureError}</Text> : null}
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
              <Text style={styles.podFallbackHelp}>Stačí fotografie nebo podpis. Pokud technika selže, lze zakázku po potvrzení dokončit i bez POD.</Text>
              <AppButton title="Uzavřít jako doručené" icon="checkmark-done" loading={busy} onPress={() => void finishDelivery()} />
            </View>
          ) : (
            <View style={styles.details}>
              {sortedStops.length ? (
                <Card style={styles.multiStopSummary}>
                  <View style={styles.multiStopSummaryCopy}>
                    <View style={styles.multiStopIcon}>
                      <Ionicons name="git-branch-outline" size={21} color={colors.info} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.multiStopTitle}>Vícezastávková trasa</Text>
                      <Text style={styles.multiStopSubtitle}>{sortedStops.length} mezizastávek · pořadí lze upravit šipkami</Text>
                    </View>
                  </View>
                  <AppButton title="Navigovat celou trasu" icon="navigate-outline" variant="secondary" onPress={() => void openFullRoute()} />
                </Card>
              ) : null}

              <RouteStop
                label="VYZVEDNUTÍ"
                address={current.pickupAddress}
                name={current.pickupContactName}
                phone={current.pickupContactPhone}
                color={colors.primary}
                onMap={() => void openMap(current.pickupAddress)}
                onCall={() => void call(current.pickupContactPhone)}
              />

              {sortedStops.map((stop, index) => (
                <RouteStop
                  key={`${stop.address}-${stop.contactPhone}`}
                  label={`ZASTÁVKA ${index + 1}`}
                  address={stop.address}
                  name={stop.contactName}
                  phone={stop.contactPhone}
                  notes={stop.notes}
                  color={colors.info}
                  onMap={() => void openMap(stop.address)}
                  onCall={() => void call(stop.contactPhone)}
                  onMoveUp={index > 0 ? () => void moveStop(index, -1) : undefined}
                  onMoveDown={index < sortedStops.length - 1 ? () => void moveStop(index, 1) : undefined}
                  reorderDisabled={reordering}
                />
              ))}

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
          <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <SlideToConfirm
              label={primaryAction}
              color={current.status === "approved" ? colors.success : colors.primary}
              disabled={busy}
              onConfirm={() => performPrimaryAction()}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function RouteStop({
  label,
  address,
  name,
  phone,
  notes,
  color,
  onMap,
  onCall,
  onMoveUp,
  onMoveDown,
  reorderDisabled,
}: {
  label: string;
  address: string;
  name?: string;
  phone?: string;
  notes?: string;
  color: string;
  onMap: () => void;
  onCall: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  reorderDisabled?: boolean;
}) {
  return (
    <Card>
      <View style={styles.stopHeader}>
        <View style={styles.stopTitleWrap}>
          <View style={[styles.stopDot, { backgroundColor: color }]} />
          <Text style={[styles.cardLabel, { color }]}>{label}</Text>
        </View>
        {onMoveUp || onMoveDown ? (
          <View style={styles.orderControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Posunout zastávku nahoru" disabled={!onMoveUp || reorderDisabled} onPress={onMoveUp} style={[styles.orderButton, (!onMoveUp || reorderDisabled) && styles.orderButtonDisabled]}>
              <Ionicons name="arrow-up" size={17} color={colors.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Posunout zastávku dolů" disabled={!onMoveDown || reorderDisabled} onPress={onMoveDown} style={[styles.orderButton, (!onMoveDown || reorderDisabled) && styles.orderButtonDisabled]}>
              <Ionicons name="arrow-down" size={17} color={colors.text} />
            </Pressable>
          </View>
        ) : null}
      </View>
      <Text style={styles.address}>{address}</Text>
      {name ? <Text style={styles.contact}>{name}</Text> : null}
      {phone ? <Text style={styles.phone}>{phone}</Text> : null}
      {notes ? <Text style={styles.stopNotes}>{notes}</Text> : null}
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
  modalHeader: { minHeight: 76, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.text, fontWeight: "900", fontSize: 17 },
  headerSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  content: { padding: spacing.lg },
  details: { gap: spacing.md },
  podForm: { gap: spacing.lg },
  multiStopSummary: { gap: spacing.md, borderColor: "rgba(59,130,246,0.38)" },
  multiStopSummaryCopy: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  multiStopIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(59,130,246,0.12)" },
  multiStopTitle: { color: colors.text, fontWeight: "900", fontSize: 14 },
  multiStopSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  stopHeader: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  stopTitleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  stopDot: { width: 9, height: 9, borderRadius: 5 },
  orderControls: { flexDirection: "row", gap: 6 },
  orderButton: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  orderButtonDisabled: { opacity: 0.25 },
  cardLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  address: { color: colors.text, fontSize: 17, fontWeight: "800", lineHeight: 23 },
  contact: { color: colors.text, fontSize: 13, marginTop: spacing.sm },
  phone: { color: colors.primary, fontSize: 13, fontWeight: "700", marginTop: 3 },
  stopNotes: { color: colors.warning, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
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
  bottomAction: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  fieldTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  fieldLabel: { color: colors.text, fontWeight: "800", fontSize: 12 },
  fieldCounter: { color: colors.textMuted, fontWeight: "800", fontSize: 11 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, color: colors.text, paddingHorizontal: spacing.md, fontSize: 15 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  photoWrap: { width: "48.5%", aspectRatio: 16 / 10, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surfaceRaised },
  photo: { width: "100%", height: "100%" },
  removePhoto: { position: "absolute", top: 6, right: 6, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.72)" },
  clearSignature: { color: colors.primary, fontSize: 11, fontWeight: "800" },
  signaturePad: { height: 210, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.white },
  signatureCanvas: { flex: 1, width: "100%", height: 206 },
  signatureHelp: { color: colors.textMuted, fontSize: 10, marginTop: 6 },
  signatureReady: { color: colors.success, fontWeight: "800" },
  signatureError: { color: "#FCA5A5", fontSize: 11, marginTop: 4 },
  podFallbackHelp: { color: colors.textMuted, fontSize: 10, lineHeight: 16 },
  codToggle: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  codToggleActive: { borderColor: "rgba(34,197,94,0.55)" },
  codValue: { color: colors.success, fontWeight: "800", marginTop: 3 },
});
