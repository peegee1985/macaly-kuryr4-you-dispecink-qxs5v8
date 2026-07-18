import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton, Card, LoadingView } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime, visitStatusLabel } from "../lib/format";
import { colors, radius, spacing } from "../theme";
import type { ServiceVisit } from "../types";

export function VisitDetailModal({ visit, onClose }: { visit: ServiceVisit | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const detail = useQuery(api.vending.getVisit, visit ? { visitId: visit._id } : "skip") as ServiceVisit | null | undefined;
  const acceptVisit = useMutation(api.vending.driverAcceptVisit);
  const startNavigation = useMutation(api.vending.driverStartNavigation);
  const startVisit = useMutation(api.vending.driverStartVisit);
  const updateChecklist = useMutation(api.vending.driverUpdateChecklist);
  const completeChecklist = useMutation(api.vending.driverCompleteChecklist);
  const completeVisit = useMutation(api.vending.driverCompleteVisit);
  const generateUploadUrl = useMutation(api.vending.generateUploadUrl);
  const addPhoto = useMutation(api.vending.addVisitPhoto);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");

  const current = detail ?? visit;
  if (!visit) return null;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      Alert.alert("Akci nelze dokončit", cause instanceof Error ? cause.message : "Zkuste to znovu.");
    } finally {
      setBusy(false);
    }
  };

  const navigate = async () => {
    if (!current) return;
    await run(async () => {
      await startNavigation({ visitId: current._id });
      const location = current.location;
      const query = location?.lat && location?.lng ? `${location.lat},${location.lng}` : location?.address || "";
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
    });
  };

  const arrive = async () => {
    if (!current) return;
    await run(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      const position = permission.granted
        ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        : null;
      await startVisit({
        visitId: current._id,
        lat: position?.coords.latitude ?? 0,
        lng: position?.coords.longitude ?? 0,
      });
    });
  };

  const toggleChecklist = async (index: number, completed: boolean) => {
    if (!current?.checklist) return;
    await run(() => updateChecklist({
      checklistId: current.checklist!._id,
      itemIndex: index,
      completed,
    }));
  };

  const takePhoto = async () => {
    if (!current) return;
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Fotoaparát není povolen", "Povolte fotoaparát v nastavení telefonu.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.72 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    await run(async () => {
      const uploadUrl = await generateUploadUrl();
      const blob = await (await fetch(asset.uri)).blob();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType || "image/jpeg" },
        body: blob,
      });
      if (!response.ok) throw new Error("Fotografii se nepodařilo nahrát.");
      const { storageId } = (await response.json()) as { storageId: string };
      const position = await Location.getLastKnownPositionAsync();
      await addPhoto({
        visitId: current._id,
        storageId,
        category: "other",
        lat: position?.coords.latitude,
        lng: position?.coords.longitude,
      });
    });
  };

  const finish = async () => {
    if (!current) return;
    const incomplete = current.checklist?.items.some((item) => !item.completed);
    if (incomplete) {
      Alert.alert("Checklist není hotový", "Nejdřív potvrďte všechny položky checklistu.");
      return;
    }
    await run(async () => {
      if (current.checklist && !current.checklist.completedAt) {
        await completeChecklist({ checklistId: current.checklist._id });
      }
      await completeVisit({ visitId: current._id, driverNotes: notes.trim() || undefined });
      Alert.alert("Návštěva dokončena", "Servisní návštěva byla úspěšně uzavřena.", [{ text: "Hotovo", onPress: onClose }]);
    });
  };

  const primary = async () => {
    if (!current) return;
    if (["scheduled", "assigned"].includes(current.status)) await run(() => acceptVisit({ visitId: current._id }));
    else if (current.status === "accepted") await navigate();
    else if (current.status === "en_route") await arrive();
    else if (current.status === "in_progress") await finish();
  };

  const primaryLabel = current ? {
    scheduled: "Přijmout návštěvu",
    assigned: "Přijmout návštěvu",
    accepted: "Vyrazit a navigovat",
    en_route: "Jsem na místě",
    in_progress: "Dokončit návštěvu",
  }[current.status] : undefined;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <Pressable onPress={onClose} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{current?.location?.name || "Servisní návštěva"}</Text>
            <Text style={styles.headerSub}>{current?.visitNumber}</Text>
          </View>
          {current ? <Text style={styles.headerStatus}>{visitStatusLabel[current.status] || current.status}</Text> : null}
        </View>

        {detail === undefined ? <LoadingView label="Načítám návštěvu…" /> : detail === null ? (
          <View style={styles.errorState}>
            <Ionicons name="lock-closed-outline" size={32} color={colors.danger} />
            <Text style={styles.errorTitle}>Detail není přístupný</Text>
            <Text style={styles.errorText}>Zkontrolujte přiřazení návštěvy řidiči.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: primaryLabel ? 108 + insets.bottom : spacing.xxl + insets.bottom }]} showsVerticalScrollIndicator={false}>
            <Card style={styles.locationCard}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.address}>{current?.location?.address}</Text>
                <Text style={styles.time}>{current ? formatDateTime(current.scheduledAt) : ""}</Text>
              </View>
              <Pressable onPress={() => void navigate()} style={styles.mapButton}>
                <Ionicons name="navigate" size={19} color={colors.primaryText} />
              </Pressable>
            </Card>

            {current?.location?.accessInstructions || current?.location?.pinCode ? (
              <Card style={styles.accessCard}>
                <Text style={styles.sectionLabel}>PŘÍSTUP K AUTOMATU</Text>
                {current.location.pinCode ? (
                  <View style={styles.pinRow}>
                    <Text style={styles.pinLabel}>PIN</Text>
                    <Text selectable style={styles.pin}>{current.location.pinCode}</Text>
                  </View>
                ) : null}
                {current.location.accessInstructions ? <Text style={styles.instructions}>{current.location.accessInstructions}</Text> : null}
              </Card>
            ) : null}

            {current?.status === "in_progress" ? (
              <>
                <Text style={styles.sectionTitle}>Checklist</Text>
                {current.checklist?.items.length ? (
                  <Card style={styles.checklist}>
                    {current.checklist.items.map((item, index) => (
                      <Pressable key={item.itemId} style={styles.checkItem} onPress={() => void toggleChecklist(index, !item.completed)}>
                        <Ionicons name={item.completed ? "checkbox" : "square-outline"} size={25} color={item.completed ? colors.success : colors.textMuted} />
                        <Text style={[styles.checkText, item.completed && styles.checkTextDone]}>{item.text}</Text>
                      </Pressable>
                    ))}
                  </Card>
                ) : (
                  <Card><Text style={styles.emptyText}>Pro tuto návštěvu není checklist.</Text></Card>
                )}

                <Text style={styles.sectionTitle}>Fotodokumentace</Text>
                <View style={styles.photos}>
                  {current.photos?.map((photo) => photo.url ? <Image key={photo._id} source={{ uri: photo.url }} style={styles.photo} /> : null)}
                  <Pressable onPress={() => void takePhoto()} style={styles.addPhoto}>
                    <Ionicons name="camera-outline" size={26} color={colors.primary} />
                    <Text style={styles.addPhotoText}>Přidat foto</Text>
                  </Pressable>
                </View>

                <Text style={styles.sectionTitle}>Poznámka řidiče</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Průběh návštěvy, doplněné zboží…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.notes}
                />
              </>
            ) : null}
          </ScrollView>
        )}

        {detail && primaryLabel ? (
          <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <AppButton title={primaryLabel} icon="arrow-forward-circle-outline" loading={busy} onPress={() => void primary()} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 76, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  headerSub: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  headerStatus: { color: colors.primary, fontWeight: "800", fontSize: 11 },
  content: { padding: spacing.lg, gap: spacing.md },
  locationCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  locationIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  address: { color: colors.text, fontWeight: "800", fontSize: 14, lineHeight: 19 },
  time: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  mapButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  accessCard: { gap: spacing.md, borderColor: "rgba(245,158,11,0.38)" },
  sectionLabel: { color: colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  pinRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: spacing.md },
  pinLabel: { color: colors.textMuted, fontWeight: "800" },
  pin: { color: colors.primary, fontSize: 24, fontWeight: "900", letterSpacing: 4 },
  instructions: { color: colors.text, fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: spacing.sm },
  checklist: { paddingVertical: 4 },
  checkItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  checkText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 19 },
  checkTextDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  emptyText: { color: colors.textMuted, textAlign: "center" },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photo: { width: "31.5%", aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surfaceRaised },
  addPhoto: { width: "31.5%", aspectRatio: 1, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 4 },
  addPhotoText: { color: colors.primary, fontSize: 10, fontWeight: "800" },
  notes: { minHeight: 100, textAlignVertical: "top", color: colors.text, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 13, lineHeight: 19 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  errorState: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  errorTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.md },
  errorText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
});
