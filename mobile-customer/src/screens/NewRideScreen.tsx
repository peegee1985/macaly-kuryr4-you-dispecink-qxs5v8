import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAction, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { AddressField } from "../components/AddressField";
import { AppButton, Card, FormField, PageHeader, Screen } from "../components/ui";
import { cargoLabel, formatDateTime } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { CargoType, RideTemplate } from "../types";

type AddressValue = { address: string; lat?: number; lng?: number };
type FormState = {
  pickupAddress: AddressValue;
  pickupContactName: string;
  pickupContactPhone: string;
  pickupAt: Date;
  deliveryAddress: AddressValue;
  deliveryContactName: string;
  deliveryContactPhone: string;
  deliveryAt: Date;
  cargoType: CargoType;
  cargoDescription: string;
  quantity: string;
  weight: string;
  notes: string;
};

function initialForm(template?: RideTemplate): FormState {
  const pickupAt = new Date(Date.now() + 60 * 60 * 1000);
  pickupAt.setMinutes(Math.ceil(pickupAt.getMinutes() / 5) * 5, 0, 0);
  const deliveryAt = new Date(pickupAt.getTime() + 4 * 60 * 60 * 1000);
  return {
    pickupAddress: { address: template?.pickupAddress ?? "" },
    pickupContactName: template?.pickupContactName ?? "",
    pickupContactPhone: template?.pickupContactPhone ?? "",
    pickupAt,
    deliveryAddress: { address: template?.deliveryAddress ?? "" },
    deliveryContactName: template?.deliveryContactName ?? "",
    deliveryContactPhone: template?.deliveryContactPhone ?? "",
    deliveryAt,
    cargoType: template?.cargoType ?? "parcel",
    cargoDescription: template?.cargoDescription ?? "",
    quantity: String(template?.quantity ?? 1),
    weight: template?.weight ? String(template.weight) : "",
    notes: template?.notes ?? "",
  };
}

export function NewRideScreen({
  initialTemplate,
  onCreated,
}: {
  initialTemplate?: RideTemplate;
  onCreated: () => void;
}) {
  const createRide = useMutation(api.rides.createRide);
  const saveTemplate = useMutation(api.templates.saveTemplate);
  const suggestPrice = useAction(api.aiPricing.suggestPrice);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(() => initialForm(initialTemplate));
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    setForm(initialForm(initialTemplate));
    setCreated(false);
    setError(null);
  }, [initialTemplate]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    if (!form.pickupAddress.address.trim()) return "Zadejte adresu vyzvednutí.";
    if (!form.pickupContactName.trim() || !form.pickupContactPhone.trim()) return "Vyplňte kontakt pro vyzvednutí.";
    if (!form.deliveryAddress.address.trim()) return "Zadejte adresu doručení.";
    if (!form.deliveryContactName.trim() || !form.deliveryContactPhone.trim()) return "Vyplňte kontakt pro doručení.";
    if (form.pickupAt.getTime() < Date.now() - 60_000) return "Čas vyzvednutí nemůže být v minulosti.";
    if (form.deliveryAt.getTime() <= form.pickupAt.getTime()) return "Doručení musí být později než vyzvednutí.";
    if (!form.cargoDescription.trim()) return "Doplňte popis zásilky.";
    const quantity = Number(form.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return "Počet kusů musí být alespoň 1.";
    if (form.weight && (!Number.isFinite(Number(form.weight)) || Number(form.weight) <= 0)) return "Zadejte platnou hmotnost.";
    if (saveAsTemplate && !templateName.trim()) return "Doplňte název šablony.";
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rideTemplate: RideTemplate = {
        pickupAddress: form.pickupAddress.address.trim(),
        pickupContactName: form.pickupContactName.trim(),
        pickupContactPhone: form.pickupContactPhone.trim(),
        deliveryAddress: form.deliveryAddress.address.trim(),
        deliveryContactName: form.deliveryContactName.trim(),
        deliveryContactPhone: form.deliveryContactPhone.trim(),
        cargoType: form.cargoType,
        cargoDescription: form.cargoDescription.trim(),
        quantity: Number(form.quantity),
        weight: form.weight ? Number(form.weight) : undefined,
        notes: form.notes.trim() || undefined,
      };
      // Cenu spočítá backend (stejné AI nacenění jako na webu). Když se
      // nacenění nepovede, objednávka projde bez ceny a nacení ji dispečer.
      let price: number | undefined;
      try {
        const pricing = await suggestPrice({
          pickupAddress: rideTemplate.pickupAddress,
          deliveryAddress: rideTemplate.deliveryAddress,
          cargoType: rideTemplate.cargoType,
          cargoDescription: rideTemplate.cargoDescription,
          weight: rideTemplate.weight,
          quantity: rideTemplate.quantity,
          notes: rideTemplate.notes,
          requestedPickupAt: form.pickupAt.getTime(),
          requestedDeliveryAt: form.deliveryAt.getTime(),
        });
        price = pricing?.doporucenaCena > 0 ? pricing.doporucenaCena : undefined;
      } catch {
        price = undefined;
      }
      setFinalPrice(price ?? null);

      await createRide({
        ...rideTemplate,
        pickupLat: form.pickupAddress.lat,
        pickupLng: form.pickupAddress.lng,
        requestedPickupAt: form.pickupAt.getTime(),
        deliveryLat: form.deliveryAddress.lat,
        deliveryLng: form.deliveryAddress.lng,
        requestedDeliveryAt: form.deliveryAt.getTime(),
        price,
      });
      if (saveAsTemplate) {
        await saveTemplate({ title: templateName.trim(), rideTemplate });
      }
      setCreated(true);
    } catch (err) {
      setError(String((err as { message?: string }).message ?? "Nepodařilo se vytvořit zásilku."));
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <Screen contentStyle={styles.successScreen}>
        <View style={styles.successIcon}><Ionicons name="checkmark" size={42} color={colors.success} /></View>
        <Text style={styles.successTitle}>Zásilka byla odeslána</Text>
        {finalPrice ? (
          <Text style={styles.successPrice}>{finalPrice.toLocaleString("cs-CZ")} Kč</Text>
        ) : null}
        <Text style={styles.successText}>
          {finalPrice
            ? "Zaplatit můžete kartou nebo Google Pay v detailu zásilky (Zaplatit online) — odkaz přišel i e-mailem."
            : "Dispečer ji nyní zpracuje a zašle platební odkaz. O změně stavu vás upozorníme."}
        </Text>
        <AppButton title="Zobrazit moje zásilky" icon="cube-outline" onPress={onCreated} style={styles.successButton} />
        <AppButton title="Vytvořit další" variant="secondary" onPress={() => { setForm(initialForm()); setCreated(false); setSaveAsTemplate(false); setTemplateName(""); }} style={styles.successButton} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Nová zásilka" subtitle="Vyplňte detaily přepravy" />

      <FormSection number="1" title="Vyzvednutí" icon="arrow-up-circle-outline">
        <AddressField label="Adresa vyzvednutí *" value={form.pickupAddress} onChange={(value) => update("pickupAddress", value)} placeholder="Václavské náměstí 1, Praha" />
        <FormField label="Kontaktní osoba *" icon="person-outline" value={form.pickupContactName} onChangeText={(value) => update("pickupContactName", value)} placeholder="Jan Novák" autoCapitalize="words" />
        <FormField label="Telefon *" icon="call-outline" value={form.pickupContactPhone} onChangeText={(value) => update("pickupContactPhone", value)} placeholder="+420 777 111 222" keyboardType="phone-pad" />
        <DateTimeField label="Termín vyzvednutí *" value={form.pickupAt} onChange={(value) => update("pickupAt", value)} />
      </FormSection>

      <FormSection number="2" title="Doručení" icon="arrow-down-circle-outline">
        <AddressField label="Adresa doručení *" value={form.deliveryAddress} onChange={(value) => update("deliveryAddress", value)} placeholder="Náměstí Míru 3, Praha" />
        <FormField label="Kontaktní osoba *" icon="person-outline" value={form.deliveryContactName} onChangeText={(value) => update("deliveryContactName", value)} placeholder="Marie Nováková" autoCapitalize="words" />
        <FormField label="Telefon *" icon="call-outline" value={form.deliveryContactPhone} onChangeText={(value) => update("deliveryContactPhone", value)} placeholder="+420 777 333 444" keyboardType="phone-pad" />
        <DateTimeField label="Termín doručení *" value={form.deliveryAt} onChange={(value) => update("deliveryAt", value)} />
      </FormSection>

      <FormSection number="3" title="Zásilka" icon="cube-outline">
        <Text style={styles.fieldLabel}>Typ zásilky *</Text>
        <View style={styles.cargoGrid}>
          {(Object.keys(cargoLabel) as CargoType[]).map((cargo) => {
            const selected = form.cargoType === cargo;
            return (
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={cargo} onPress={() => update("cargoType", cargo)} style={[styles.cargoChoice, selected && styles.cargoChoiceSelected]}>
                <Ionicons name={cargoIcon[cargo]} size={19} color={selected ? colors.primary : colors.textMuted} />
                <Text style={[styles.cargoText, selected && styles.cargoTextSelected]}>{cargoLabel[cargo]}</Text>
              </Pressable>
            );
          })}
        </View>
        <FormField label="Popis zásilky *" icon="document-text-outline" value={form.cargoDescription} onChangeText={(value) => update("cargoDescription", value)} placeholder="Dokumenty, křehké zboží…" />
        <View style={styles.twoColumns}>
          <FormField label="Počet kusů *" value={form.quantity} onChangeText={(value) => update("quantity", value.replace(/\D/g, ""))} placeholder="1" keyboardType="number-pad" style={styles.column} />
          <FormField label="Hmotnost (kg)" value={form.weight} onChangeText={(value) => update("weight", value.replace(",", ".").replace(/[^\d.]/g, ""))} placeholder="2.5" keyboardType="decimal-pad" style={styles.column} />
        </View>
        <FormField label="Poznámka pro kurýra" icon="chatbox-ellipses-outline" value={form.notes} onChangeText={(value) => update("notes", value)} placeholder="Kód domofonu, patro, způsob předání…" multiline maxLength={1000} />
      </FormSection>

      <Card style={styles.templateCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchTitle}>Uložit jako šablonu</Text>
            <Text style={styles.switchText}>Pro snadné opakování objednávky</Text>
          </View>
          <Switch accessibilityLabel="Uložit zásilku jako šablonu" value={saveAsTemplate} onValueChange={setSaveAsTemplate} trackColor={switchTrackColors} thumbColor={saveAsTemplate ? colors.primary : colors.textMuted} />
        </View>
        {saveAsTemplate ? <FormField label="Název šablony *" value={templateName} onChangeText={setTemplateName} placeholder="Sklad → Praha centrum" style={styles.templateName} /> : null}
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton title="Odeslat zásilku" icon="send-outline" loading={loading} onPress={() => void submit()} style={styles.submit} />
      <Text style={styles.disclaimer}>Cena bude potvrzena dispečerem před přidělením řidiče.</Text>
    </Screen>
  );
}

function FormSection({ number, title, icon, children }: { number: string; title: string; icon: "arrow-up-circle-outline" | "arrow-down-circle-outline" | "cube-outline"; children: React.ReactNode }) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>{number}</Text></View>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionFields}>{children}</View>
    </Card>
  );
}

function DateTimeField({ label, value, onChange }: { label: string; value: Date; onChange: (value: Date) => void }) {
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const change = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setPicker(null);
    if (event.type !== "set" || !selected) return;
    const next = new Date(value);
    if (picker === "date") next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
  };
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.dateRow}>
        <Pressable accessibilityRole="button" onPress={() => setPicker("date")} style={styles.dateButton}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.dateText}>{value.toLocaleDateString("cs-CZ")}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setPicker("time")} style={styles.dateButton}>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={styles.dateText}>{value.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}</Text>
        </Pressable>
      </View>
      {picker ? <DateTimePicker value={value} mode={picker} minimumDate={picker === "date" ? new Date() : undefined} is24Hour onChange={change} /> : null}
      <Text style={styles.datePreview}>{formatDateTime(value.getTime())}</Text>
    </View>
  );
}

const cargoIcon: Record<CargoType, "mail-outline" | "cube-outline" | "archive-outline" | "layers-outline" | "ellipsis-horizontal-circle-outline"> = {
  envelope: "mail-outline",
  parcel: "cube-outline",
  box: "archive-outline",
  pallet: "layers-outline",
  other: "ellipsis-horizontal-circle-outline",
};

const switchTrackColors = { false: colors.border, true: colors.primaryPressed };

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  sectionNumber: { width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(245,158,11,0.14)", alignItems: "center", justifyContent: "center" },
  sectionNumberText: { color: colors.primary, fontWeight: "900", fontSize: 12 },
  sectionTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  sectionFields: { gap: spacing.lg },
  fieldLabel: { color: colors.text, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  dateRow: { flexDirection: "row", gap: spacing.sm },
  dateButton: { flex: 1, minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  dateText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  datePreview: { color: colors.textMuted, fontSize: 10, marginTop: 6 },
  cargoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cargoChoice: { width: "31%", minHeight: 64, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, alignItems: "center", justifyContent: "center", gap: 4 },
  cargoChoiceSelected: { borderColor: colors.primary, backgroundColor: "rgba(245,158,11,0.12)" },
  cargoText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  cargoTextSelected: { color: colors.primary },
  twoColumns: { flexDirection: "row", gap: spacing.md },
  column: { flex: 1 },
  templateCard: { marginBottom: spacing.lg },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchCopy: { flex: 1 },
  switchTitle: { color: colors.text, fontWeight: "800", fontSize: 14 },
  switchText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  templateName: { marginTop: spacing.lg },
  error: { color: "#FCA5A5", backgroundColor: "rgba(239,68,68,0.12)", borderRadius: radius.sm, padding: 12, fontSize: 12, marginBottom: spacing.md },
  submit: { marginBottom: spacing.sm },
  disclaimer: { color: colors.textMuted, textAlign: "center", fontSize: 10, lineHeight: 15 },
  successScreen: { alignItems: "center", justifyContent: "center" },
  successIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: "rgba(34,197,94,0.12)", alignItems: "center", justifyContent: "center" },
  successTitle: { color: colors.text, fontWeight: "900", fontSize: 23, textAlign: "center", marginTop: spacing.xl },
  successPrice: { color: colors.primary, fontWeight: "900", fontSize: 34, textAlign: "center", marginTop: spacing.sm },
  successText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl, maxWidth: 320 },
  successButton: { alignSelf: "stretch", marginBottom: spacing.md },
});
