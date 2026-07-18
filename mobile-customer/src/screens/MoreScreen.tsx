import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { AppButton, Card, EmptyState, FormField, IconButton, PageHeader, Screen, SectionTitle, type IconName } from "../components/ui";
import { cargoLabel, formatDate, formatMoney } from "../lib/format";
import { CUSTOMER_APP_VERSION } from "../lib/appVersion";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { CustomerDocument, CustomerTemplate, CustomerUser, Invoice, MorePage, Receipt, RideTemplate } from "../types";

export function MoreScreen({
  user,
  unreadNotifications,
  onOpenNotifications,
  notifications,
  onUseTemplate,
  onSignOut,
}: {
  user: CustomerUser;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  notifications: { enabled: boolean; busy: boolean; error: string | null; setEnabled: (next: boolean) => Promise<boolean> };
  onUseTemplate: (template: RideTemplate) => void;
  onSignOut: () => void;
}) {
  const [page, setPage] = useState<MorePage>("menu");

  if (page === "profile") return <ProfilePage user={user} notifications={notifications} onBack={() => setPage("menu")} onSignOut={onSignOut} />;
  if (page === "templates") return <TemplatesPage onBack={() => setPage("menu")} onUseTemplate={onUseTemplate} />;
  if (page === "documents") return <DocumentsPage user={user} onBack={() => setPage("menu")} />;
  if (page === "receipts") return <ReceiptsPage onBack={() => setPage("menu")} />;

  return (
    <Screen>
      <PageHeader title="Více" subtitle="Účet, šablony a doklady" action={<IconButton icon="notifications-outline" badge={unreadNotifications} label="Oznámení" onPress={onOpenNotifications} />} />
      <Card style={styles.accountCard}>
        <View style={styles.accountAvatar}><Text style={styles.accountInitial}>{(user.name || user.email).slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.accountCopy}>
          <Text style={styles.accountName}>{user.name || "Zákazník"}</Text>
          <Text style={styles.accountEmail}>{user.email}</Text>
          <Text style={[styles.accountStatus, user.corporateStatus === "approved" && styles.accountStatusApproved]}>
            {user.corporateStatus === "approved" ? "Firemní účet" : "Zákaznický účet"}
          </Text>
        </View>
      </Card>
      <View style={styles.menu}>
        <MenuItem icon="person-outline" title="Profil a nastavení" subtitle="Osobní údaje, heslo a oznámení" onPress={() => setPage("profile")} />
        <MenuItem icon="copy-outline" title="Šablony zásilek" subtitle="Uložené trasy pro opakované objednávky" onPress={() => setPage("templates")} />
        <MenuItem icon="document-text-outline" title="Faktury a dokumenty" subtitle="Firemní faktury a soubory od dispečera" onPress={() => setPage("documents")} />
        <MenuItem icon="receipt-outline" title="Účtenky" subtitle="Doklady za dokončené přepravy" onPress={() => setPage("receipts")} />
        <MenuItem icon="notifications-outline" title="Oznámení" subtitle={unreadNotifications ? `${unreadNotifications} nepřečtených oznámení` : "Všechna oznámení jsou přečtená"} onPress={onOpenNotifications} badge={unreadNotifications} />
      </View>
      <Text style={styles.version}>Kuryr4You Zákazník · verze {CUSTOMER_APP_VERSION}</Text>
    </Screen>
  );
}

function MenuItem({ icon, title, subtitle, onPress, badge = 0 }: { icon: IconName; title: string; subtitle: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
      <View style={styles.menuIcon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      {badge > 0 ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{badge > 99 ? "99+" : badge}</Text></View> : null}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

function ProfilePage({ user, notifications, onBack, onSignOut }: { user: CustomerUser; notifications: { enabled: boolean; busy: boolean; error: string | null; setEnabled: (next: boolean) => Promise<boolean> }; onBack: () => void; onSignOut: () => void }) {
  const updateProfile = useMutation(api.users.updateMyProfile);
  const requestCorporate = useMutation(api.users.requestCorporateAccount);
  const { signIn } = useAuthActions();
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCorporate, setShowCorporate] = useState(false);
  const [companyName, setCompanyName] = useState(user.companyName ?? "");
  const [companyAddress, setCompanyAddress] = useState(user.companyAddress ?? "");
  const [companyIco, setCompanyIco] = useState(user.companyIco ?? "");
  const [companyDic, setCompanyDic] = useState(user.companyDic ?? "");
  const [corporateBusy, setCorporateBusy] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"idle" | "code" | "done">("idle");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      setSaved(true);
    } catch {
      setError("Profil se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
  };

  const submitCorporate = async () => {
    if (!companyName.trim() || !companyAddress.trim()) {
      setError("Vyplňte název firmy a fakturační adresu.");
      return;
    }
    setCorporateBusy(true);
    setError(null);
    try {
      await requestCorporate({ companyName: companyName.trim(), companyAddress: companyAddress.trim(), companyIco: companyIco.trim() || undefined, companyDic: companyDic.trim() || undefined });
      setShowCorporate(false);
    } catch {
      setError("Žádost se nepodařilo odeslat.");
    } finally {
      setCorporateBusy(false);
    }
  };

  const requestPasswordCode = async () => {
    setPasswordBusy(true);
    setError(null);
    try {
      await signIn("password", { flow: "reset", email: user.email });
      setPasswordStep("code");
    } catch {
      setError("Ověřovací kód se nepodařilo odeslat.");
    } finally {
      setPasswordBusy(false);
    }
  };

  const changePassword = async () => {
    if (code.length !== 6 || newPassword.length < 8) {
      setError("Kód musí mít 6 číslic a heslo alespoň 8 znaků.");
      return;
    }
    setPasswordBusy(true);
    setError(null);
    try {
      await signIn("password", { flow: "reset-verification", email: user.email, code, newPassword });
      setPasswordStep("done");
    } catch {
      setError("Kód není platný nebo už vypršel.");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <Screen>
      <PageHeader title="Profil" subtitle="Osobní údaje a nastavení" onBack={onBack} />
      <Card style={styles.sectionCard}>
        <SectionTitle title="Osobní údaje" />
        <View style={styles.fields}>
          <FormField label="Celé jméno" icon="person-outline" value={name} onChangeText={setName} placeholder="Jan Novák" />
          <FormField label="E-mail" icon="mail-outline" value={user.email} editable={false} />
          <FormField label="Telefon" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="+420 777 111 222" keyboardType="phone-pad" />
          <AppButton title={saved ? "Uloženo ✓" : "Uložit změny"} loading={saving} onPress={() => void save()} />
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <SectionTitle title="Oznámení v zařízení" />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}><Text style={styles.switchTitle}>Stavy zásilek</Text><Text style={styles.switchText}>Zobrazovat upozornění také na zamčené obrazovce.</Text></View>
          <Switch accessibilityLabel="Povolit oznámení v zařízení" disabled={notifications.busy} value={notifications.enabled} onValueChange={(value) => void notifications.setEnabled(value)} trackColor={switchTrackColors} thumbColor={notifications.enabled ? colors.primary : colors.textMuted} />
        </View>
        {notifications.error ? <Text style={styles.error}>{notifications.error}</Text> : null}
        <Text style={styles.note}>Systémové upozornění se zobrazí při nové události, když aplikace běží. Kompletní historie je vždy v centru oznámení.</Text>
      </Card>

      <Card style={styles.sectionCard}>
        <SectionTitle title="Změna hesla" />
        {passwordStep === "idle" ? <AppButton title="Poslat ověřovací kód" variant="secondary" loading={passwordBusy} onPress={() => void requestPasswordCode()} /> : null}
        {passwordStep === "code" ? (
          <View style={styles.fields}>
            <Text style={styles.note}>Kód byl odeslán na {user.email}.</Text>
            <FormField label="Ověřovací kód" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" placeholder="123456" maxLength={6} />
            <FormField label="Nové heslo" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Minimálně 8 znaků" />
            <AppButton title="Nastavit nové heslo" loading={passwordBusy} onPress={() => void changePassword()} />
          </View>
        ) : null}
        {passwordStep === "done" ? <Text style={styles.success}>Heslo bylo úspěšně změněno.</Text> : null}
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.corporateHeader}>
          <SectionTitle title="Firemní účet" />
          <Text style={[styles.corporatePill, user.corporateStatus === "approved" && styles.corporatePillApproved]}>{user.corporateStatus === "approved" ? "Aktivní" : user.corporateStatus === "pending" ? "Čeká" : "Neaktivní"}</Text>
        </View>
        {user.corporateStatus === "approved" ? (
          <View><Text style={styles.companyName}>{user.companyName}</Text><Text style={styles.note}>{user.companyAddress}</Text>{user.companyIco ? <Text style={styles.note}>IČO: {user.companyIco}{user.companyDic ? ` · DIČ: ${user.companyDic}` : ""}</Text> : null}</View>
        ) : null}
        {user.corporateStatus === "pending" ? <Text style={styles.note}>Žádost zpracovává dispečer. O výsledku dostanete oznámení.</Text> : null}
        {user.corporateStatus === "none" && !showCorporate ? <><Text style={styles.note}>Firemní účet umožňuje souhrnnou 14denní fakturaci.</Text><AppButton title="Požádat o firemní účet" variant="secondary" onPress={() => setShowCorporate(true)} style={styles.topGap} /></> : null}
        {showCorporate ? (
          <View style={styles.fields}>
            <FormField label="Název firmy *" value={companyName} onChangeText={setCompanyName} />
            <FormField label="Fakturační adresa *" value={companyAddress} onChangeText={setCompanyAddress} />
            <View style={styles.twoColumns}><FormField label="IČO" value={companyIco} onChangeText={setCompanyIco} keyboardType="number-pad" style={styles.column} /><FormField label="DIČ" value={companyDic} onChangeText={setCompanyDic} style={styles.column} /></View>
            <AppButton title="Odeslat žádost" loading={corporateBusy} onPress={() => void submitCorporate()} />
            <AppButton title="Zrušit" variant="ghost" onPress={() => setShowCorporate(false)} />
          </View>
        ) : null}
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton title="Odhlásit se" icon="log-out-outline" variant="danger" onPress={onSignOut} style={styles.logout} />
    </Screen>
  );
}

function TemplatesPage({ onBack, onUseTemplate }: { onBack: () => void; onUseTemplate: (template: RideTemplate) => void }) {
  const templates = useQuery(api.templates.listMyTemplates, {}) as CustomerTemplate[] | undefined;
  const toggleTemplate = useMutation(api.templates.toggleTemplate);
  const deleteTemplate = useMutation(api.templates.deleteTemplate);

  const confirmDelete = (template: CustomerTemplate) => {
    Alert.alert("Smazat šablonu?", template.title, [
      { text: "Zrušit", style: "cancel" },
      { text: "Smazat", style: "destructive", onPress: () => void deleteTemplate({ templateId: template._id }) },
    ]);
  };

  return (
    <Screen>
      <PageHeader title="Šablony" subtitle="Uložené trasy a zásilky" onBack={onBack} />
      {templates?.length === 0 ? <EmptyState icon="copy-outline" title="Zatím žádné šablony" message="Šablonu můžete uložit při vytváření nové zásilky." /> : null}
      <View style={styles.templateList}>
        {templates?.map((template) => (
          <Card key={template._id} style={!template.active && styles.templateInactive}>
            <View style={styles.templateHeader}>
              <View style={styles.menuCopy}><Text style={styles.templateTitle}>{template.title}</Text><Text style={styles.templateMeta}>{cargoLabel[template.rideTemplate.cargoType]} · {template.rideTemplate.quantity} ks</Text></View>
              <Switch accessibilityLabel={`${template.active ? "Deaktivovat" : "Aktivovat"} šablonu ${template.title}`} value={template.active} onValueChange={(active) => void toggleTemplate({ templateId: template._id, active })} trackColor={switchTrackColors} thumbColor={template.active ? colors.primary : colors.textMuted} />
            </View>
            <View style={styles.templateRoute}><Ionicons name="radio-button-on" size={15} color={colors.primary} /><Text style={styles.templateAddress} numberOfLines={2}>{template.rideTemplate.pickupAddress}</Text></View>
            <View style={styles.templateRoute}><Ionicons name="location" size={15} color={colors.success} /><Text style={styles.templateAddress} numberOfLines={2}>{template.rideTemplate.deliveryAddress}</Text></View>
            <View style={styles.templateActions}>
              <AppButton title="Objednat znovu" icon="refresh-outline" disabled={!template.active} onPress={() => onUseTemplate(template.rideTemplate)} style={styles.templateAction} />
              <Pressable accessibilityRole="button" accessibilityLabel="Smazat šablonu" onPress={() => confirmDelete(template)} style={styles.deleteButton}><Ionicons name="trash-outline" size={20} color={colors.danger} /></Pressable>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function DocumentsPage({ user, onBack }: { user: CustomerUser; onBack: () => void }) {
  const invoices = useQuery(api.invoices.getMyInvoices, {}) as Invoice[] | undefined;
  const documents = useQuery(api.documents.getMyDocuments, {}) as CustomerDocument[] | undefined;
  const totalUnpaid = invoices?.filter((item) => item.status !== "paid").reduce((sum, item) => sum + item.totalAmount, 0) ?? 0;
  return (
    <Screen>
      <PageHeader title="Faktury a dokumenty" subtitle="Soubory od dispečera" onBack={onBack} />
      <SectionTitle title="Dokumenty" />
      {documents?.length === 0 ? <EmptyState icon="folder-open-outline" title="Žádné dokumenty" message="Dokumenty od dispečera se zobrazí zde." /> : null}
      <View style={styles.documentList}>{documents?.map((document) => (
        <Card key={document._id} style={styles.documentCard}>
          <View style={styles.documentIcon}><Ionicons name="document-outline" size={21} color={colors.primary} /></View>
          <View style={styles.menuCopy}><Text style={styles.documentName} numberOfLines={1}>{document.filename}</Text>{document.description ? <Text style={styles.menuSubtitle} numberOfLines={2}>{document.description}</Text> : null}<Text style={styles.documentDate}>{formatDate(document.uploadedAt)}</Text></View>
          {document.url ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(document.url!)} style={styles.downloadButton}><Ionicons name="download-outline" size={20} color={colors.primaryText} /></Pressable> : null}
        </Card>
      ))}</View>

      <View style={styles.invoiceHeader}><SectionTitle title="Firemní faktury" />{totalUnpaid > 0 ? <Text style={styles.unpaid}>K úhradě {formatMoney(totalUnpaid)}</Text> : null}</View>
      {user.corporateStatus !== "approved" ? <EmptyState icon="business-outline" title="Firemní účet vyžadován" message={user.corporateStatus === "pending" ? "Vaše žádost se zpracovává." : "O firemní účet můžete požádat v profilu."} /> : null}
      {user.corporateStatus === "approved" && invoices?.length === 0 ? <EmptyState icon="document-text-outline" title="Zatím žádné faktury" message="Vystavené faktury se zobrazí zde." /> : null}
      <View style={styles.invoiceList}>{user.corporateStatus === "approved" ? invoices?.map((invoice) => <InvoiceCard key={invoice._id} invoice={invoice} />) : null}</View>
    </Screen>
  );
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const status = { draft: "Koncept", sent: "Odeslána", paid: "Uhrazená", overdue: "Po splatnosti" }[invoice.status];
  const color = invoice.status === "paid" ? colors.success : invoice.status === "overdue" ? colors.danger : colors.primary;
  return (
    <Card>
      <View style={styles.invoiceTop}><Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text><Text style={[styles.invoiceStatus, { color }]}>{status}</Text></View>
      <Text style={styles.invoiceAmount}>{formatMoney(invoice.totalAmount, invoice.currency)}</Text>
      <View style={styles.invoiceMeta}><Text style={styles.note}>Období {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}</Text><Text style={[styles.note, invoice.status === "overdue" && { color: colors.danger }]}>Splatnost {formatDate(invoice.dueDate)}</Text></View>
      {invoice.notes ? <Text style={styles.invoiceNotes}>{invoice.notes}</Text> : null}
    </Card>
  );
}

function ReceiptsPage({ onBack }: { onBack: () => void }) {
  const receipts = useQuery(api.receipts.getMyReceipts, {}) as Receipt[] | undefined;
  const [selected, setSelected] = useState<string | null>(null);
  const totalUnpaid = receipts?.filter((item) => !item.isPaid && item.amount > 0).reduce((sum, item) => sum + item.amount, 0) ?? 0;
  return (
    <Screen>
      <PageHeader title="Účtenky" subtitle="Doklady za kurýrní přepravy" onBack={onBack} />
      {totalUnpaid > 0 ? <Card style={styles.unpaidCard}><Ionicons name="alert-circle-outline" size={23} color={colors.warning} /><View style={styles.menuCopy}><Text style={styles.menuTitle}>Nesplacené platby</Text><Text style={styles.menuSubtitle}>Celkem {formatMoney(totalUnpaid)} čeká na úhradu.</Text></View></Card> : null}
      {receipts?.length === 0 ? <EmptyState icon="receipt-outline" title="Žádné účtenky" message="Účtenky se generují po dokončení a zaplacení zásilky." /> : null}
      <View style={styles.receiptList}>{receipts?.map((receipt) => {
        const open = selected === receipt._id;
        return (
          <Pressable key={receipt._id} accessibilityRole="button" onPress={() => setSelected(open ? null : receipt._id)}>
            <Card>
              <View style={styles.invoiceTop}><Text style={styles.invoiceNumber}>🧾 {receipt.receiptNumber}</Text><Text style={[styles.invoiceStatus, { color: receipt.isPaid ? colors.success : colors.warning }]}>{receipt.isPaid ? "Zaplaceno" : "Čeká na úhradu"}</Text></View>
              <Text style={styles.invoiceAmount}>{receipt.amount > 0 ? formatMoney(receipt.amount, receipt.currency) : "Dle dohody"}</Text>
              <Text style={styles.note}>Zakázka #{receipt.rideNumber} · {formatDate(receipt.issuedAt)}</Text>
              {open ? <View style={styles.receiptDetail}><InfoRow label="Vyzvednutí" value={receipt.pickupAddress} /><InfoRow label="Doručení" value={receipt.deliveryAddress} /><InfoRow label="Obsah" value={receipt.cargoDescription} /><InfoRow label="Platba" value={paymentLabel[receipt.paymentMethod]} />{receipt.driverName ? <InfoRow label="Řidič" value={receipt.driverName} /> : null}</View> : null}
            </Card>
          </Pressable>
        );
      })}</View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const paymentLabel: Record<Receipt["paymentMethod"], string> = { hotovost: "Hotovost", prevod: "Bankovní převod", faktura: "Na fakturu", karta: "Platební karta" };
const switchTrackColors = { false: colors.border, true: colors.primaryPressed };

const styles = StyleSheet.create({
  accountCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  accountAvatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  accountInitial: { color: colors.primaryText, fontSize: 23, fontWeight: "900" },
  accountCopy: { flex: 1 },
  accountName: { color: colors.text, fontSize: 17, fontWeight: "900" },
  accountEmail: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  accountStatus: { color: colors.textMuted, fontSize: 9, fontWeight: "800", marginTop: 5, textTransform: "uppercase" },
  accountStatusApproved: { color: colors.success },
  menu: { gap: spacing.sm },
  menuItem: { minHeight: 76, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  pressed: { opacity: 0.75 },
  menuIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  menuCopy: { flex: 1 },
  menuTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  menuSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  menuBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  menuBadgeText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  version: { color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: spacing.xl },
  sectionCard: { marginBottom: spacing.lg },
  fields: { gap: spacing.lg },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  switchCopy: { flex: 1 },
  switchTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  switchText: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  note: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  error: { color: "#FCA5A5", backgroundColor: "rgba(239,68,68,0.12)", borderRadius: radius.sm, padding: 10, fontSize: 11, marginTop: spacing.md },
  success: { color: "#86EFAC", backgroundColor: "rgba(34,197,94,0.12)", borderRadius: radius.sm, padding: 10, fontSize: 11 },
  corporateHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  corporatePill: { color: colors.textMuted, backgroundColor: colors.surfaceRaised, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, fontSize: 9, fontWeight: "800" },
  corporatePillApproved: { color: colors.success, backgroundColor: "rgba(34,197,94,0.12)" },
  companyName: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: 4 },
  topGap: { marginTop: spacing.md },
  twoColumns: { flexDirection: "row", gap: spacing.md },
  column: { flex: 1 },
  logout: { marginBottom: spacing.sm },
  templateList: { gap: spacing.md },
  templateInactive: { opacity: 0.58 },
  templateHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  templateTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
  templateMeta: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  templateRoute: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginBottom: spacing.sm },
  templateAddress: { color: colors.text, fontSize: 11, lineHeight: 16, flex: 1 },
  templateActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  templateAction: { flex: 1 },
  deleteButton: { width: 50, height: 48, borderRadius: radius.md, backgroundColor: "rgba(239,68,68,0.10)", borderWidth: 1, borderColor: "rgba(239,68,68,0.26)", alignItems: "center", justifyContent: "center" },
  documentList: { gap: spacing.sm, marginBottom: spacing.xl },
  documentCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  documentIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: "rgba(245,158,11,0.12)", alignItems: "center", justifyContent: "center" },
  documentName: { color: colors.text, fontSize: 13, fontWeight: "800" },
  documentDate: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  downloadButton: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  invoiceHeader: { marginTop: spacing.md },
  unpaid: { color: colors.warning, fontSize: 11, fontWeight: "800", marginBottom: spacing.md },
  invoiceList: { gap: spacing.md },
  invoiceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  invoiceNumber: { color: colors.text, fontSize: 13, fontWeight: "900", flex: 1 },
  invoiceStatus: { fontSize: 10, fontWeight: "800" },
  invoiceAmount: { color: colors.primary, fontWeight: "900", fontSize: 19, marginTop: spacing.md },
  invoiceMeta: { gap: 3, marginTop: spacing.sm },
  invoiceNotes: { color: colors.text, fontSize: 11, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  unpaidCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderColor: "rgba(245,158,11,0.35)", marginBottom: spacing.lg },
  receiptList: { gap: spacing.md },
  receiptDetail: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  infoRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  infoLabel: { color: colors.textMuted, fontSize: 10, width: 80 },
  infoValue: { color: colors.text, fontSize: 11, lineHeight: 16, flex: 1, textAlign: "right" },
});
