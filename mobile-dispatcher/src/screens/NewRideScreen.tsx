import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, FormField, PageHeader, Screen, SectionTitle } from "../components/ui";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { CargoType, UserSummary } from "../types";

const cargoOptions: Array<{ key: CargoType; label: string; icon: "mail-outline" | "cube-outline" | "file-tray-stacked-outline" | "layers-outline" | "ellipsis-horizontal" }> = [
  { key: "envelope", label: "Obálka", icon: "mail-outline" },
  { key: "parcel", label: "Balík", icon: "cube-outline" },
  { key: "box", label: "Krabice", icon: "file-tray-stacked-outline" },
  { key: "pallet", label: "Paleta", icon: "layers-outline" },
  { key: "other", label: "Jiné", icon: "ellipsis-horizontal" },
];

export function NewRideScreen({ onCreated, onCancel }: { onCreated: (rideId: string) => void; onCancel: () => void }) {
  const customers = useQuery(api.users.listCustomers, {}) as UserSummary[] | undefined;
  const drivers = useQuery(api.users.listActiveDrivers, {}) as UserSummary[] | undefined;
  const createRide = useMutation(api.rides.createRideAsDispatcher);
  const [customerId, setCustomerId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupName, setPickupName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [cargoType, setCargoType] = useState<CargoType>("parcel");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [fragile, setFragile] = useState(false);
  const [refrigerated, setRefrigerated] = useState(false);
  const [pickupOffset, setPickupOffset] = useState(1);
  const [busy, setBusy] = useState(false);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLocaleLowerCase("cs");
    return (customers ?? []).filter((item) => !query || `${item.name ?? ""} ${item.email} ${item.companyName ?? ""}`.toLocaleLowerCase("cs").includes(query)).slice(0, 8);
  }, [customerSearch, customers]);
  const selectedCustomer = customers?.find((item) => item._id === customerId);

  const submit = async () => {
    const qty = Number(quantity);
    const parsedPrice = price ? Number(price.replace(",", ".")) : undefined;
    const parsedWeight = weight ? Number(weight.replace(",", ".")) : undefined;
    if (!customerId || !pickupAddress.trim() || !pickupName.trim() || !pickupPhone.trim() || !deliveryAddress.trim() || !deliveryName.trim() || !deliveryPhone.trim() || !description.trim() || !Number.isFinite(qty) || qty < 1) {
      Alert.alert("Chybí údaje", "Vyberte zákazníka a vyplňte všechna povinná pole.");
      return;
    }
    if ((parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) || (parsedWeight !== undefined && (!Number.isFinite(parsedWeight) || parsedWeight < 0))) {
      Alert.alert("Neplatná hodnota", "Zkontrolujte cenu a hmotnost.");
      return;
    }
    setBusy(true);
    try {
      const pickupAt = Date.now() + pickupOffset * 60 * 60 * 1000;
      const rideId = await createRide({
        customerId,
        pickupAddress: pickupAddress.trim(), pickupContactName: pickupName.trim(), pickupContactPhone: pickupPhone.trim(), requestedPickupAt: pickupAt,
        deliveryAddress: deliveryAddress.trim(), deliveryContactName: deliveryName.trim(), deliveryContactPhone: deliveryPhone.trim(), requestedDeliveryAt: pickupAt + 2 * 60 * 60 * 1000,
        cargoType, cargoDescription: description.trim(), quantity: qty,
        weight: parsedWeight, price: parsedPrice, notes: notes.trim() || undefined, dispatcherNotes: notes.trim() || undefined,
        driverId: driverId || undefined, isFragile: fragile, isRefrigerated: refrigerated,
      });
      onCreated(String(rideId));
    } catch (error) {
      Alert.alert("Zakázku se nepodařilo vytvořit", String((error as { message?: string }).message ?? error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen withBottomTabs={false}>
      <PageHeader title="Nová zakázka" subtitle="Vytvoření zásilky za zákazníka" onBack={onCancel} />
      <SectionTitle title="1. Zákazník" />
      {selectedCustomer ? (
        <Pressable accessibilityRole="button" onPress={() => setCustomerId("")} style={styles.selectedUser}><View style={styles.avatar}><Ionicons name="person" size={20} color={colors.primary} /></View><View style={styles.userCopy}><Text style={styles.userName}>{selectedCustomer.name ?? selectedCustomer.email}</Text><Text style={styles.userEmail}>{selectedCustomer.email}</Text></View><Text style={styles.change}>Změnit</Text></Pressable>
      ) : (
        <Card style={styles.selector}>
          <FormField label="Vyhledat zákazníka" icon="search-outline" value={customerSearch} onChangeText={setCustomerSearch} placeholder="Jméno, firma nebo e-mail" />
          <View style={styles.userList}>{filteredCustomers.map((item) => <Pressable key={item._id} accessibilityRole="button" onPress={() => { setCustomerId(item._id); setPickupName(item.name ?? ""); setPickupPhone(item.phone ?? ""); }} style={styles.userRow}><View style={styles.userCopy}><Text style={styles.userName}>{item.name ?? item.companyName ?? "Bez jména"}</Text><Text style={styles.userEmail}>{item.email}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></Pressable>)}</View>
        </Card>
      )}

      <SectionTitle title="2. Trasa a kontakty" />
      <Card style={styles.formCard}>
        <FormField label="Adresa vyzvednutí *" icon="radio-button-on-outline" value={pickupAddress} onChangeText={setPickupAddress} placeholder="Ulice, město" />
        <FormField label="Kontakt při vyzvednutí *" icon="person-outline" value={pickupName} onChangeText={setPickupName} />
        <FormField label="Telefon *" icon="call-outline" value={pickupPhone} onChangeText={setPickupPhone} keyboardType="phone-pad" />
        <View style={styles.separator} />
        <FormField label="Adresa doručení *" icon="location-outline" value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Ulice, město" />
        <FormField label="Kontakt při doručení *" icon="person-outline" value={deliveryName} onChangeText={setDeliveryName} />
        <FormField label="Telefon *" icon="call-outline" value={deliveryPhone} onChangeText={setDeliveryPhone} keyboardType="phone-pad" />
        <Text style={styles.fieldLabel}>Vyzvednutí přibližně</Text>
        <View style={styles.choiceRow}>{[1, 2, 4, 24].map((hours) => <Pressable key={hours} accessibilityRole="radio" accessibilityState={{ checked: pickupOffset === hours }} onPress={() => setPickupOffset(hours)} style={[styles.choice, pickupOffset === hours && styles.choiceActive]}><Text style={[styles.choiceText, pickupOffset === hours && styles.choiceTextActive]}>{hours === 24 ? "zítra" : `za ${hours} h`}</Text></Pressable>)}</View>
      </Card>

      <SectionTitle title="3. Zásilka" />
      <Card style={styles.formCard}>
        <View style={styles.cargoGrid}>{cargoOptions.map((item) => <Pressable key={item.key} accessibilityRole="radio" accessibilityState={{ checked: cargoType === item.key }} onPress={() => setCargoType(item.key)} style={[styles.cargo, cargoType === item.key && styles.cargoActive]}><Ionicons name={item.icon} size={20} color={cargoType === item.key ? colors.primary : colors.textMuted} /><Text style={[styles.cargoText, cargoType === item.key && styles.choiceTextActive]}>{item.label}</Text></Pressable>)}</View>
        <FormField label="Popis obsahu *" value={description} onChangeText={setDescription} placeholder="Co se převáží" />
        <View style={styles.twoColumns}><FormField label="Počet kusů" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={styles.column} /><FormField label="Hmotnost kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" style={styles.column} /></View>
        <View style={styles.choiceRow}><Toggle title="Křehké" active={fragile} onPress={() => setFragile(!fragile)} /><Toggle title="Chlazené" active={refrigerated} onPress={() => setRefrigerated(!refrigerated)} /></View>
      </Card>

      <SectionTitle title="4. Cena a řidič" />
      <Card style={styles.formCard}>
        <FormField label="Cena CZK" icon="cash-outline" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Lze doplnit později" />
        <Text style={styles.fieldLabel}>Přiřadit řidiče (volitelné)</Text>
        <View style={styles.driverChoices}><Pressable accessibilityRole="radio" onPress={() => setDriverId("")} style={[styles.driverChoice, !driverId && styles.choiceActive]}><Text style={[styles.choiceText, !driverId && styles.choiceTextActive]}>Volná zakázka</Text></Pressable>{drivers?.map((driver) => <Pressable key={driver._id} accessibilityRole="radio" onPress={() => setDriverId(driver._id)} style={[styles.driverChoice, driverId === driver._id && styles.choiceActive]}><Text style={[styles.choiceText, driverId === driver._id && styles.choiceTextActive]}>{driver.name ?? driver.email}</Text><Text style={styles.userEmail}>{driver.email}</Text></Pressable>)}</View>
        <FormField label="Poznámka dispečera" value={notes} onChangeText={setNotes} multiline placeholder="Interní nebo provozní informace" />
      </Card>
      <AppButton title="Vytvořit zakázku" icon="checkmark-circle-outline" loading={busy} onPress={() => void submit()} style={styles.submit} />
      <AppButton title="Zrušit" variant="ghost" disabled={busy} onPress={onCancel} />
    </Screen>
  );
}

function Toggle({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={onPress} style={[styles.toggle, active && styles.choiceActive]}><Ionicons name={active ? "checkbox" : "square-outline"} size={18} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  selector: { marginBottom: spacing.xl }, formCard: { gap: spacing.lg, marginBottom: spacing.xl }, selectedUser: { minHeight: 76, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  avatar: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" }, userCopy: { flex: 1 }, userName: { color: colors.text, fontSize: 12, fontWeight: "800" }, userEmail: { color: colors.textMuted, fontSize: 9, marginTop: 3 }, change: { color: colors.primary, fontWeight: "800", fontSize: 10 },
  userList: { marginTop: spacing.md }, userRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  separator: { height: 1, backgroundColor: colors.border }, fieldLabel: { color: colors.text, fontSize: 12, fontWeight: "800" },
  choiceRow: { flexDirection: "row", gap: spacing.sm }, choice: { flex: 1, minHeight: 38, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised }, choiceActive: { borderColor: colors.primary, backgroundColor: "rgba(245,158,11,0.12)" }, choiceText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" }, choiceTextActive: { color: colors.primary },
  cargoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, cargo: { width: "31%", minHeight: 70, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 5 }, cargoActive: { borderColor: colors.primary, backgroundColor: "rgba(245,158,11,0.09)" }, cargoText: { color: colors.textMuted, fontSize: 9, fontWeight: "700" },
  twoColumns: { flexDirection: "row", gap: spacing.md }, column: { flex: 1 }, toggle: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  driverChoices: { gap: spacing.sm }, driverChoice: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, justifyContent: "center", paddingHorizontal: spacing.md }, submit: { marginTop: spacing.sm },
});
