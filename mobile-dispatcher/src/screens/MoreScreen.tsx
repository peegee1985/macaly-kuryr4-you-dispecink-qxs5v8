import Ionicons from "@expo/vector-icons/Ionicons";
import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AppButton,
  Card,
  EmptyState,
  FormField,
  PageHeader,
  Screen,
  SectionTitle,
  type IconName,
} from "../components/ui";
import { useOptionalDriverPresence } from "../hooks/useOptionalDriverPresence";
import { api } from "../lib/api";
import { formatDate, formatDateTime, formatMoney } from "../lib/format";
import { colors, radius, spacing } from "../theme";
import type {
  Availability,
  CrmContact,
  DriverPresence,
  DispatcherUser,
  Employee,
  Invoice,
  MorePage,
  Ride,
  Team,
  UserSummary,
  VendingOverview,
} from "../types";

type NotificationSettings = {
  enabled: boolean;
  busy: boolean;
  error: string | null;
  setEnabled: (next: boolean) => Promise<boolean>;
};

const menu: Array<{
  page: Exclude<MorePage, "menu">;
  title: string;
  subtitle: string;
  icon: IconName;
}> = [
  {
    page: "users",
    title: "Uživatelé",
    subtitle: "Zákazníci, řidiči a schvalování účtů",
    icon: "people-outline",
  },
  {
    page: "crm",
    title: "CRM",
    subtitle: "Kontakty, firmy a obchodní případy",
    icon: "briefcase-outline",
  },
  {
    page: "finance",
    title: "Fakturace",
    subtitle: "Faktury, splatnost a platby",
    icon: "receipt-outline",
  },
  {
    page: "calendar",
    title: "Dostupnost",
    subtitle: "Směny a dostupnost řidičů",
    icon: "calendar-outline",
  },
  {
    page: "teams",
    title: "Týmy",
    subtitle: "Řidičské týmy a jejich kapacita",
    icon: "git-network-outline",
  },
  {
    page: "employees",
    title: "Zaměstnanci a HR",
    subtitle: "Lidé, smlouvy a přítomnost",
    icon: "id-card-outline",
  },
  {
    page: "vending",
    title: "Vending servis",
    subtitle: "Lokace, návštěvy a incidenty",
    icon: "construct-outline",
  },
  {
    page: "statistics",
    title: "Statistiky",
    subtitle: "Výkon zakázek a obrat",
    icon: "stats-chart-outline",
  },
  {
    page: "settings",
    title: "Nastavení",
    subtitle: "Profil, oznámení a zabezpečení",
    icon: "settings-outline",
  },
];

export function MoreScreen({
  user,
  unreadNotifications,
  onOpenNotifications,
  notifications,
  onSignOut,
  initialPage = "menu",
}: {
  user: DispatcherUser;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  notifications: NotificationSettings;
  onSignOut: () => void;
  initialPage?: MorePage;
}) {
  const [page, setPage] = useState<MorePage>(initialPage);
  if (page === "users") return <UsersPage onBack={() => setPage("menu")} />;
  if (page === "crm") return <CrmPage onBack={() => setPage("menu")} />;
  if (page === "finance") return <FinancePage onBack={() => setPage("menu")} />;
  if (page === "calendar")
    return <AvailabilityPage onBack={() => setPage("menu")} />;
  if (page === "teams") return <TeamsPage onBack={() => setPage("menu")} />;
  if (page === "employees")
    return <EmployeesPage onBack={() => setPage("menu")} />;
  if (page === "vending") return <VendingPage onBack={() => setPage("menu")} />;
  if (page === "statistics")
    return <StatisticsPage onBack={() => setPage("menu")} />;
  if (page === "settings")
    return (
      <SettingsPage
        user={user}
        notifications={notifications}
        onBack={() => setPage("menu")}
        onSignOut={onSignOut}
      />
    );

  return (
    <Screen>
      <PageHeader
        title="Řídicí centrum"
        subtitle="Správa firmy a provozu"
        action={
          <Pressable
            accessibilityRole="button"
            onPress={onOpenNotifications}
            style={styles.notificationButton}
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={colors.text}
            />
            {unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </Text>
              </View>
            ) : null}
          </Pressable>
        }
      />
      <Card style={styles.accountCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.name ?? user.email).slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.accountName}>{user.name ?? "Dispečer"}</Text>
          <Text style={styles.accountEmail}>{user.email}</Text>
          <Text style={styles.accountRole}>AKTIVNÍ DISPEČER</Text>
        </View>
      </Card>
      <View style={styles.menu}>
        {menu.map((item) => (
          <Pressable
            key={item.page}
            accessibilityRole="button"
            onPress={() => setPage(item.page)}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ))}
      </View>
      <Text style={styles.version}>Kuryr4You Dispečink · Android 0.1.0</Text>
    </Screen>
  );
}

type UserRole =
  | "customer"
  | "driver"
  | "dispatcher"
  | "service_driver"
  | "vending_supervisor";
const roleOptions: Array<{ key: UserRole; label: string }> = [
  { key: "customer", label: "Zákazníci" },
  { key: "driver", label: "Řidiči" },
  { key: "dispatcher", label: "Dispečeři" },
  { key: "service_driver", label: "Servis" },
  { key: "vending_supervisor", label: "Vending" },
];

function UsersPage({ onBack }: { onBack: () => void }) {
  const [role, setRole] = useState<UserRole>("customer");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const users = useQuery(api.users.listUsersByRole, { role }) as
    | UserSummary[]
    | undefined;
  const presence = useOptionalDriverPresence();
  const updateStatus = useMutation(api.users.updateUserStatus);
  const approveCorporate = useMutation(api.users.approveCorporateAccount);
  const presenceByDriver = useMemo(
    () => new Map(presence.map((item) => [item.driverId, item])),
    [presence],
  );
  const visible = useMemo(
    () =>
      (users ?? []).filter((item) =>
        `${item.name ?? ""} ${item.email} ${item.companyName ?? ""}`
          .toLocaleLowerCase("cs")
          .includes(search.trim().toLocaleLowerCase("cs")),
      ),
    [search, users],
  );

  const activate = (item: UserSummary) =>
    void updateStatus({ userId: item._id, status: "active" }).catch(
      (error: unknown) => Alert.alert("Chyba", String(error)),
    );
  const approve = (item: UserSummary) =>
    void approveCorporate({ userId: item._id, approved: true }).catch(
      (error: unknown) => Alert.alert("Chyba", String(error)),
    );

  if (selected) {
    return (
      <UserEditor
        key={selected._id}
        user={selected}
        presence={presenceByDriver.get(selected._id)}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <Screen>
      <PageHeader
        title="Uživatelé"
        subtitle={`${users?.length ?? 0} účtů ve zvolené roli`}
        onBack={onBack}
      />
      <HorizontalChoices
        values={roleOptions}
        active={role}
        onChange={setRole}
      />
      <Search
        value={search}
        onChange={setSearch}
        placeholder="Jméno, e-mail nebo firma…"
      />
      {visible.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Žádní uživatelé"
          message="Pro tuto roli nebo hledání nejsou výsledky."
        />
      ) : (
        <View style={styles.list}>
          {visible.map((item) => (
            <Card key={item._id} style={styles.userCard}>
              <View style={styles.userTop}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        item.status === "active"
                          ? colors.success
                          : item.status === "pending"
                            ? colors.warning
                            : colors.textMuted,
                    },
                  ]}
                />
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>
                    {item.name ?? item.companyName ?? "Bez jména"}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {item.email}
                    {item.phone ? ` · ${item.phone}` : ""}
                  </Text>
                </View>
                <Text style={styles.stateLabel}>
                  {statusLabel(item.status)}
                </Text>
              </View>
              {role === "driver" ? (
                <View style={styles.presenceRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: presenceByDriver.get(item._id)
                          ?.isOnline
                          ? colors.success
                          : colors.textMuted,
                      },
                    ]}
                  />
                  <Text style={styles.rowMeta}>
                    {presenceByDriver.get(item._id)?.isOnline
                      ? "Právě online"
                      : presenceByDriver.get(item._id)
                        ? `Offline · naposledy ${formatDateTime(presenceByDriver.get(item._id)!.lastSeenAt)}`
                        : "Zatím bez přihlášení do aplikace"}
                  </Text>
                </View>
              ) : null}
              {item.companyName ? (
                <Text style={styles.company}>
                  {item.companyName}
                  {item.companyIco ? ` · IČO ${item.companyIco}` : ""}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <SmallAction
                  title="Upravit"
                  icon="create-outline"
                  onPress={() => setSelected(item)}
                />
                {item.status !== "active" ? (
                  <SmallAction
                    title="Aktivovat"
                    icon="checkmark"
                    onPress={() => activate(item)}
                  />
                ) : null}
                {item.corporateStatus === "pending" ? (
                  <SmallAction
                    title="Schválit firmu"
                    icon="business-outline"
                    onPress={() => approve(item)}
                  />
                ) : null}
                {item.phone ? (
                  <SmallAction
                    title="Volat"
                    icon="call-outline"
                    onPress={() => void Linking.openURL(`tel:${item.phone}`)}
                  />
                ) : null}
                <SmallAction
                  title="E-mail"
                  icon="mail-outline"
                  onPress={() => void Linking.openURL(`mailto:${item.email}`)}
                />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const userStatusOptions: Array<{
  key: "active" | "pending" | "inactive";
  label: string;
}> = [
  { key: "active", label: "Aktivní" },
  { key: "pending", label: "Čeká" },
  { key: "inactive", label: "Neaktivní" },
];

function UserEditor({
  user,
  presence,
  onBack,
}: {
  user: UserSummary;
  presence?: DriverPresence;
  onBack: () => void;
}) {
  const updateUser = useMutation(api.users.updateUser);
  const updateStatus = useMutation(api.users.updateUserStatus);
  const resetPassword = useAction(api.users.adminResetPassword);
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [vehicleType, setVehicleType] = useState(user.vehicleType ?? "");
  const [vehiclePlate, setVehiclePlate] = useState(user.vehiclePlate ?? "");
  const [driverNotes, setDriverNotes] = useState(user.driverNotes ?? "");
  const [companyName, setCompanyName] = useState(user.companyName ?? "");
  const [companyAddress, setCompanyAddress] = useState(
    user.companyAddress ?? "",
  );
  const [companyIco, setCompanyIco] = useState(user.companyIco ?? "");
  const [companyDic, setCompanyDic] = useState(user.companyDic ?? "");
  const [corporateStatus, setCorporateStatus] = useState<
    "none" | "pending" | "approved"
  >(user.corporateStatus ?? "none");
  const [status, setStatus] = useState<"active" | "pending" | "inactive">(
    user.status === "active" ||
      user.status === "pending" ||
      user.status === "inactive"
      ? user.status
      : "inactive",
  );
  const [newPassword, setNewPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const isDriver = user.role === "driver" || user.role === "service_driver";
  const isCustomer = user.role === "customer";

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Doplňte jméno", "Jméno uživatele nesmí být prázdné.");
      return;
    }
    setSaving(true);
    try {
      await updateUser({
        userId: user._id,
        name: name.trim(),
        phone: phone.trim(),
        vehicleType: vehicleType.trim(),
        vehiclePlate: vehiclePlate.trim(),
        driverNotes: driverNotes.trim(),
        companyName: companyName.trim(),
        companyAddress: companyAddress.trim(),
        companyIco: companyIco.trim(),
        companyDic: companyDic.trim(),
        corporateStatus,
      });
      if (status !== user.status) {
        await updateStatus({ userId: user._id, status });
      }
      Alert.alert("Uloženo", "Údaje a stav uživatele byly aktualizovány.", [
        { text: "OK", onPress: onBack },
      ]);
    } catch (error) {
      Alert.alert("Uložení se nepodařilo", String(error));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert("Krátké heslo", "Nové heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (newPassword !== passwordAgain) {
      Alert.alert("Hesla se neshodují", "Zadejte nové heslo v obou polích stejně.");
      return;
    }
    setResetting(true);
    try {
      await resetPassword({ userId: user._id, newPassword });
      setNewPassword("");
      setPasswordAgain("");
      Alert.alert("Heslo změněno", "Uživatel se může přihlásit novým heslem.");
    } catch (error) {
      Alert.alert("Heslo se nepodařilo změnit", String(error));
    } finally {
      setResetting(false);
    }
  };

  return (
    <Screen>
      <PageHeader
        title="Úprava uživatele"
        subtitle={user.email}
        onBack={onBack}
      />
      {isDriver ? (
        <Card style={styles.presenceCard}>
          <View
            style={[
              styles.presenceIcon,
              {
                backgroundColor: presence?.isOnline
                  ? "rgba(34,197,94,0.15)"
                  : colors.surfaceRaised,
              },
            ]}
          >
            <Ionicons
              name={presence?.isOnline ? "radio" : "cloud-offline-outline"}
              size={22}
              color={presence?.isOnline ? colors.success : colors.textMuted}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>
              {presence?.isOnline ? "Řidič je online" : "Řidič je offline"}
            </Text>
            <Text style={styles.rowMeta}>
              {presence
                ? `Poslední aktivita ${formatDateTime(presence.lastSeenAt)}`
                : "Zatím bez přihlášení do Android aplikace"}
            </Text>
          </View>
        </Card>
      ) : null}

      <Card style={styles.formCard}>
        <SectionTitle title="Údaje účtu" />
        <FormField label="Jméno *" value={name} onChangeText={setName} />
        <FormField label="E-mail" value={user.email} editable={false} />
        <FormField
          label="Telefon"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.fieldLabel}>Stav účtu</Text>
        <HorizontalChoices
          values={userStatusOptions}
          active={status}
          onChange={setStatus}
        />
      </Card>

      {isDriver ? (
        <Card style={styles.formCard}>
          <SectionTitle title="Řidič a vozidlo" />
          <FormField
            label="Typ vozidla"
            value={vehicleType}
            onChangeText={setVehicleType}
          />
          <FormField
            label="SPZ"
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            autoCapitalize="characters"
          />
          <FormField
            label="Interní poznámky"
            value={driverNotes}
            onChangeText={setDriverNotes}
            multiline
          />
        </Card>
      ) : null}

      {isCustomer ? (
        <Card style={styles.formCard}>
          <SectionTitle title="Firma a fakturace" />
          <FormField
            label="Název firmy"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <FormField
            label="Adresa firmy"
            value={companyAddress}
            onChangeText={setCompanyAddress}
          />
          <FormField
            label="IČO"
            value={companyIco}
            onChangeText={setCompanyIco}
          />
          <FormField
            label="DIČ"
            value={companyDic}
            onChangeText={setCompanyDic}
            autoCapitalize="characters"
          />
          <Text style={styles.fieldLabel}>Firemní účet</Text>
          <HorizontalChoices
            values={[
              { key: "none", label: "Běžný" },
              { key: "pending", label: "Čeká" },
              { key: "approved", label: "Schválený" },
            ]}
            active={corporateStatus}
            onChange={setCorporateStatus}
          />
        </Card>
      ) : null}

      <AppButton
        title="Uložit změny"
        icon="save-outline"
        loading={saving}
        onPress={() => void save()}
      />

      <Card style={styles.passwordCard}>
        <SectionTitle title="Nastavit nové heslo" />
        <Text style={styles.rowMeta}>
          Heslo se nastaví přímo. Uživateli se neposílá resetovací odkaz.
        </Text>
        <FormField
          label="Nové heslo"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <FormField
          label="Nové heslo znovu"
          value={passwordAgain}
          onChangeText={setPasswordAgain}
          secureTextEntry
          autoCapitalize="none"
        />
        <AppButton
          title="Nastavit heslo"
          icon="key-outline"
          variant="secondary"
          loading={resetting}
          disabled={!newPassword || !passwordAgain}
          onPress={() => void changePassword()}
        />
      </Card>
    </Screen>
  );
}

function CrmPage({ onBack }: { onBack: () => void }) {
  const contacts = useQuery(api.crm.listContacts, {}) as
    | CrmContact[]
    | undefined;
  const stats = useQuery(api.crm.getContactStats, {}) as
    | { total: number; active: number; leads: number; inactive: number }
    | undefined;
  const createContact = useMutation(api.crm.createContact);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const visible = useMemo(
    () =>
      (contacts ?? []).filter((item) =>
        `${item.name} ${item.companyName ?? ""} ${item.email ?? ""} ${item.phone ?? ""}`
          .toLocaleLowerCase("cs")
          .includes(search.trim().toLocaleLowerCase("cs")),
      ),
    [contacts, search],
  );
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createContact({
        type: company.trim() ? "company" : "person",
        name: name.trim(),
        companyName: company.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        tags: [],
        status: "lead",
      });
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setShowCreate(false);
    } catch (error) {
      Alert.alert("Kontakt se nepodařilo vytvořit", String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <PageHeader
        title="CRM"
        subtitle="Obchodní kontakty a firmy"
        onBack={onBack}
      />
      <View style={styles.statsRow}>
        <MiniStat label="Celkem" value={stats?.total ?? 0} />
        <MiniStat
          label="Aktivní"
          value={stats?.active ?? 0}
          color={colors.success}
        />
        <MiniStat
          label="Leady"
          value={stats?.leads ?? 0}
          color={colors.warning}
        />
      </View>
      <AppButton
        title={showCreate ? "Zavřít formulář" : "Nový kontakt"}
        icon={showCreate ? "close" : "add"}
        variant="secondary"
        onPress={() => setShowCreate(!showCreate)}
        style={styles.sectionGap}
      />
      {showCreate ? (
        <Card style={styles.formCard}>
          <FormField label="Jméno *" value={name} onChangeText={setName} />
          <FormField label="Firma" value={company} onChangeText={setCompany} />
          <FormField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormField
            label="Telefon"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <AppButton
            title="Uložit jako lead"
            loading={busy}
            disabled={!name.trim()}
            onPress={() => void create()}
          />
        </Card>
      ) : null}
      <Search value={search} onChange={setSearch} placeholder="Hledat v CRM…" />
      {visible.length === 0 ? (
        <EmptyState
          icon="briefcase-outline"
          title="Žádné kontakty"
          message="Přidejte první obchodní kontakt."
        />
      ) : (
        <View style={styles.list}>
          {visible.map((item) => (
            <Card key={item._id}>
              <View style={styles.userTop}>
                <View style={styles.menuIcon}>
                  <Ionicons
                    name={
                      item.type === "company"
                        ? "business-outline"
                        : "person-outline"
                    }
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowMeta}>
                    {item.companyName ??
                      (item.type === "company" ? "Firma" : "Osoba")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stateLabel,
                    item.status === "active" && { color: colors.success },
                    item.status === "lead" && { color: colors.warning },
                  ]}
                >
                  {item.status === "lead"
                    ? "LEAD"
                    : item.status === "active"
                      ? "AKTIVNÍ"
                      : "NEAKTIVNÍ"}
                </Text>
              </View>
              {item.email ? (
                <Text style={styles.contactLine}>{item.email}</Text>
              ) : null}
              {item.phone ? (
                <Text style={styles.contactLine}>{item.phone}</Text>
              ) : null}
              <View style={styles.actions}>
                {item.phone ? (
                  <SmallAction
                    title="Volat"
                    icon="call-outline"
                    onPress={() => void Linking.openURL(`tel:${item.phone}`)}
                  />
                ) : null}
                {item.email ? (
                  <SmallAction
                    title="E-mail"
                    icon="mail-outline"
                    onPress={() => void Linking.openURL(`mailto:${item.email}`)}
                  />
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function FinancePage({ onBack }: { onBack: () => void }) {
  const invoices = useQuery(api.invoices.getAllInvoices, {}) as
    | Invoice[]
    | undefined;
  const customers = useQuery(api.users.listCustomers, {}) as
    | UserSummary[]
    | undefined;
  const update = useMutation(api.invoices.updateInvoiceStatus);
  const totalOpen =
    invoices
      ?.filter((item) => item.status !== "paid")
      .reduce((sum, item) => sum + item.totalAmount, 0) ?? 0;
  return (
    <Screen>
      <PageHeader
        title="Fakturace"
        subtitle={`${invoices?.length ?? 0} faktur · otevřeno ${formatMoney(totalOpen)}`}
        onBack={onBack}
      />
      <View style={styles.statsRow}>
        <MiniStat
          label="Koncept"
          value={
            invoices?.filter((item) => item.status === "draft").length ?? 0
          }
        />
        <MiniStat
          label="Odesláno"
          value={invoices?.filter((item) => item.status === "sent").length ?? 0}
          color={colors.info}
        />
        <MiniStat
          label="Po splatnosti"
          value={
            invoices?.filter((item) => item.status === "overdue").length ?? 0
          }
          color={colors.danger}
        />
      </View>
      {invoices?.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Žádné faktury"
          message="Vystavené faktury se zobrazí zde."
        />
      ) : (
        <View style={[styles.list, styles.sectionGap]}>
          {invoices?.map((item) => {
            const customer = customers?.find(
              (row) => row._id === item.customerId,
            );
            return (
              <Card key={item._id}>
                <View style={styles.invoiceTop}>
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>{item.invoiceNumber}</Text>
                    <Text style={styles.rowMeta}>
                      {customer?.name ??
                        customer?.companyName ??
                        customer?.email ??
                        "Zákazník"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.invoiceStatus,
                      { color: invoiceColor(item.status) },
                    ]}
                  >
                    {invoiceStatus(item.status)}
                  </Text>
                </View>
                <Text style={styles.invoiceAmount}>
                  {formatMoney(item.totalAmount, item.currency)}
                </Text>
                <Text style={styles.contactLine}>
                  Splatnost {formatDate(item.dueDate)}
                </Text>
                <View style={styles.actions}>
                  {item.status === "draft" ? (
                    <SmallAction
                      title="Odeslána"
                      icon="send-outline"
                      onPress={() =>
                        void update({ invoiceId: item._id, status: "sent" })
                      }
                    />
                  ) : null}
                  {item.status !== "paid" ? (
                    <SmallAction
                      title="Uhrazená"
                      icon="checkmark-circle-outline"
                      onPress={() =>
                        void update({ invoiceId: item._id, status: "paid" })
                      }
                    />
                  ) : null}
                  {item.status === "sent" ? (
                    <SmallAction
                      title="Po splatnosti"
                      icon="alert-circle-outline"
                      onPress={() =>
                        void update({ invoiceId: item._id, status: "overdue" })
                      }
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function AvailabilityPage({ onBack }: { onBack: () => void }) {
  const start = new Date();
  const end = new Date(Date.now() + 7 * 86400000);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const availability = useQuery(api.availability.getAvailabilityForRange, {
    startDate: iso(start),
    endDate: iso(end),
  }) as Availability[] | undefined;
  const grouped = useMemo(() => {
    const result = new Map<string, Availability[]>();
    availability?.forEach((item) =>
      result.set(item.date, [...(result.get(item.date) ?? []), item]),
    );
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [availability]);
  return (
    <Screen>
      <PageHeader
        title="Dostupnost řidičů"
        subtitle="Následujících 7 dní"
        onBack={onBack}
      />
      {grouped.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Dostupnost není vyplněná"
          message="Řidiči zatím pro toto období nezadali dostupnost."
        />
      ) : (
        <View style={styles.list}>
          {grouped.map(([date, rows]) => (
            <Card key={date}>
              <Text style={styles.dateHeading}>
                {new Intl.DateTimeFormat("cs-CZ", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date(`${date}T12:00:00`))}
              </Text>
              {rows.map((item) => (
                <View key={item._id} style={styles.availabilityRow}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: item.available
                          ? colors.success
                          : colors.danger,
                      },
                    ]}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>
                      {item.driverName ?? "Řidič"}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {item.available
                        ? `${item.startTime ?? "celý den"}${item.endTime ? `–${item.endTime}` : ""}`
                        : "Nedostupný"}
                      {item.notes ? ` · ${item.notes}` : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function TeamsPage({ onBack }: { onBack: () => void }) {
  const teams = useQuery(api.teams.listTeams, {}) as Team[] | undefined;
  const createTeam = useMutation(api.teams.createTeam);
  const [name, setName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const create = async () => {
    if (!name.trim()) return;
    try {
      await createTeam({ name: name.trim(), color: colors.primary });
      setName("");
      setShowCreate(false);
    } catch (error) {
      Alert.alert("Tým se nepodařilo vytvořit", String(error));
    }
  };
  return (
    <Screen>
      <PageHeader
        title="Týmy"
        subtitle={`${teams?.length ?? 0} řidičských týmů`}
        onBack={onBack}
      />
      <AppButton
        title={showCreate ? "Zrušit" : "Nový tým"}
        icon={showCreate ? "close" : "add"}
        variant="secondary"
        onPress={() => setShowCreate(!showCreate)}
      />
      {showCreate ? (
        <Card style={styles.formCard}>
          <FormField label="Název týmu" value={name} onChangeText={setName} />
          <AppButton
            title="Vytvořit tým"
            disabled={!name.trim()}
            onPress={() => void create()}
          />
        </Card>
      ) : null}
      <View style={[styles.list, styles.sectionGap]}>
        {teams?.map((team) => (
          <Card key={team._id} style={styles.teamCard}>
            <View
              style={[
                styles.teamColor,
                { backgroundColor: team.color ?? colors.primary },
              ]}
            />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{team.name}</Text>
              <Text style={styles.rowMeta}>
                {team.description ?? "Bez popisu"}
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.count}>{team.memberCount ?? 0}</Text>
              <Text style={styles.countLabel}>členů</Text>
            </View>
          </Card>
        ))}
      </View>
      {teams?.length === 0 ? (
        <EmptyState
          icon="git-network-outline"
          title="Žádné týmy"
          message="Vytvořte první tým pro řidiče."
        />
      ) : null}
    </Screen>
  );
}

function EmployeesPage({ onBack }: { onBack: () => void }) {
  const employees = useQuery(api.hr.listEmployees, {}) as
    | Employee[]
    | undefined;
  const stats = useQuery(api.hr.getHrStats, {}) as
    | { totalEmployees: number; onShiftToday: number }
    | undefined;
  return (
    <Screen>
      <PageHeader
        title="Zaměstnanci a HR"
        subtitle={`${stats?.onShiftToday ?? 0} právě na směně`}
        onBack={onBack}
      />
      <View style={styles.statsRow}>
        <MiniStat label="Aktivní" value={stats?.totalEmployees ?? 0} />
        <MiniStat
          label="Na směně"
          value={stats?.onShiftToday ?? 0}
          color={colors.success}
        />
        <MiniStat
          label="Mimo směnu"
          value={Math.max(
            0,
            (stats?.totalEmployees ?? 0) - (stats?.onShiftToday ?? 0),
          )}
        />
      </View>
      <View style={[styles.list, styles.sectionGap]}>
        {employees?.map((item) => (
          <Card key={item._id}>
            <View style={styles.userTop}>
              <View
                style={[
                  styles.avatar,
                  item.isOnShiftToday && { backgroundColor: colors.success },
                ]}
              >
                <Text style={styles.avatarText}>
                  {item.firstName.slice(0, 1)}
                  {item.lastName.slice(0, 1)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.position ?? item.department ?? "Zaměstnanec"} ·{" "}
                  {contractLabel(item.contractType)}
                </Text>
              </View>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: item.isOnShiftToday
                      ? colors.success
                      : colors.textMuted,
                  },
                ]}
              />
            </View>
            <View style={styles.actions}>
              {item.phone ? (
                <SmallAction
                  title="Volat"
                  icon="call-outline"
                  onPress={() => void Linking.openURL(`tel:${item.phone}`)}
                />
              ) : null}
              <SmallAction
                title="E-mail"
                icon="mail-outline"
                onPress={() => void Linking.openURL(`mailto:${item.email}`)}
              />
            </View>
          </Card>
        ))}
      </View>
      {employees?.length === 0 ? (
        <EmptyState
          icon="id-card-outline"
          title="Žádní zaměstnanci"
          message="HR evidence je zatím prázdná."
        />
      ) : null}
    </Screen>
  );
}

function VendingPage({ onBack }: { onBack: () => void }) {
  const data = useQuery(api.vending.getDispatcherOverview, {}) as
    | VendingOverview
    | undefined;
  return (
    <Screen>
      <PageHeader
        title="Vending servis"
        subtitle="Aktuální provozní přehled"
        onBack={onBack}
      />
      <View style={styles.vendingGrid}>
        <MetricCard
          icon="business-outline"
          label="Lokace"
          value={data?.totalLocations ?? 0}
        />
        <MetricCard
          icon="checkmark-circle-outline"
          label="Aktivní"
          value={data?.activeLocations ?? 0}
          color={colors.success}
        />
        <MetricCard
          icon="cloud-offline-outline"
          label="Offline"
          value={data?.offlineLocations ?? 0}
          color={colors.danger}
        />
        <MetricCard
          icon="construct-outline"
          label="Údržba"
          value={data?.maintenanceLocations ?? 0}
          color={colors.warning}
        />
      </View>
      <SectionTitle title="Dnešní servis" />
      <Card>
        <DetailLine
          label="Plánované návštěvy"
          value={String(data?.todayVisitsTotal ?? 0)}
        />
        <DetailLine
          label="Právě probíhá"
          value={String(data?.todayVisitsInProgress ?? 0)}
          valueColor={colors.info}
        />
        <DetailLine
          label="Dokončeno"
          value={String(data?.todayVisitsCompleted ?? 0)}
          valueColor={colors.success}
        />
        <DetailLine
          label="Otevřené incidenty"
          value={String(data?.openIncidents ?? 0)}
          valueColor={
            (data?.openIncidents ?? 0) > 0 ? colors.danger : colors.success
          }
        />
        <DetailLine
          label="Aktivní klienti"
          value={String(data?.totalClients ?? 0)}
        />
      </Card>
    </Screen>
  );
}

function StatisticsPage({ onBack }: { onBack: () => void }) {
  const rides = useQuery(api.rides.getAllRides, {}) as Ride[] | undefined;
  const delivered = rides?.filter((item) => item.status === "delivered") ?? [];
  const revenue = delivered.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const paid =
    rides
      ?.filter((item) => item.isPaid)
      .reduce((sum, item) => sum + (item.price ?? 0), 0) ?? 0;
  const counts = cargoCounts(rides ?? []);
  const max = Math.max(1, ...Object.values(counts));
  return (
    <Screen>
      <PageHeader
        title="Statistiky"
        subtitle="Souhrn posledních 200 zakázek"
        onBack={onBack}
      />
      <View style={styles.vendingGrid}>
        <MetricCard
          icon="cube-outline"
          label="Celkem"
          value={rides?.length ?? 0}
        />
        <MetricCard
          icon="checkmark-done-outline"
          label="Doručeno"
          value={delivered.length}
          color={colors.success}
        />
        <MetricCard
          icon="cash-outline"
          label="Obrat"
          value={formatMoney(revenue)}
          compact
        />
        <MetricCard
          icon="card-outline"
          label="Uhrazeno"
          value={formatMoney(paid)}
          compact
          color={colors.info}
        />
      </View>
      <SectionTitle title="Typy zásilek" />
      <Card>
        {(["envelope", "parcel", "box", "pallet", "other"] as const).map(
          (key) => (
            <View key={key} style={styles.barRow}>
              <Text style={styles.barLabel}>{cargoName(key)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(counts[key] / max) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{counts[key]}</Text>
            </View>
          ),
        )}
      </Card>
      <SectionTitle title="Úspěšnost" />
      <Card>
        <DetailLine
          label="Doručené"
          value={`${percentage(delivered.length, rides?.length ?? 0)} %`}
          valueColor={colors.success}
        />
        <DetailLine
          label="Aktivní"
          value={String(
            rides?.filter((item) =>
              ["approved", "assigned", "pickup", "transit"].includes(
                item.status,
              ),
            ).length ?? 0,
          )}
          valueColor={colors.info}
        />
        <DetailLine
          label="Zrušené / nedoručené"
          value={String(
            rides?.filter((item) =>
              ["cancelled", "failed"].includes(item.status),
            ).length ?? 0,
          )}
          valueColor={colors.danger}
        />
      </Card>
    </Screen>
  );
}

function SettingsPage({
  user,
  notifications,
  onBack,
  onSignOut,
}: {
  user: DispatcherUser;
  notifications: NotificationSettings;
  onBack: () => void;
  onSignOut: () => void;
}) {
  const updateProfile = useMutation(api.users.updateMyProfile);
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      Alert.alert("Uloženo", "Profil byl aktualizován.");
    } catch (error) {
      Alert.alert("Profil se nepodařilo uložit", String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <PageHeader
        title="Nastavení"
        subtitle="Profil a aplikace"
        onBack={onBack}
      />
      <Card style={styles.formCard}>
        <SectionTitle title="Profil dispečera" />
        <FormField label="Jméno" value={name} onChangeText={setName} />
        <FormField label="E-mail" value={user.email} editable={false} />
        <FormField
          label="Telefon"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <AppButton
          title="Uložit profil"
          loading={busy}
          onPress={() => void save()}
        />
      </Card>
      <Card style={styles.formCard}>
        <SectionTitle title="Oznámení Android" />
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>Zakázky, chat a provoz</Text>
            <Text style={styles.rowMeta}>
              Zobrazovat systémová upozornění také na zamčené obrazovce.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Povolit oznámení"
            value={notifications.enabled}
            disabled={notifications.busy}
            onValueChange={(value) => void notifications.setEnabled(value)}
            trackColor={{ false: colors.border, true: colors.primaryPressed }}
            thumbColor={
              notifications.enabled ? colors.primary : colors.textMuted
            }
          />
        </View>
        {notifications.error ? (
          <Text style={styles.error}>{notifications.error}</Text>
        ) : null}
      </Card>
      <Card style={styles.securityCard}>
        <Ionicons
          name="shield-checkmark-outline"
          size={24}
          color={colors.success}
        />
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>Zabezpečený dispečerský účet</Text>
          <Text style={styles.rowMeta}>
            Přístup je omezen rolí a stavem účtu v backendu.
          </Text>
        </View>
      </Card>
      <AppButton
        title="Odhlásit se"
        icon="log-out-outline"
        variant="danger"
        onPress={onSignOut}
      />
    </Screen>
  );
}

function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.searchWrap}>
      <Ionicons name="search-outline" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        autoCapitalize="none"
      />
      {value ? (
        <Pressable onPress={() => onChange("")}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
function HorizontalChoices<T extends string>({
  values,
  active,
  onChange,
}: {
  values: Array<{ key: T; label: string }>;
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.roleWrap}>
      {values.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.key === active }}
          onPress={() => onChange(item.key)}
          style={[
            styles.roleChoice,
            item.key === active && styles.roleChoiceActive,
          ]}
        >
          <Text
            style={[
              styles.roleText,
              item.key === active && styles.roleTextActive,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function SmallAction({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.smallAction}
    >
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.smallActionText}>{title}</Text>
    </Pressable>
  );
}
function MiniStat({
  label,
  value,
  color = colors.text,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card style={styles.miniStat}>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </Card>
  );
}
function MetricCard({
  icon,
  label,
  value,
  color = colors.primary,
  compact,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  color?: string;
  compact?: boolean;
}) {
  return (
    <Card style={styles.metric}>
      <Ionicons name={icon} size={20} color={color} />
      <Text
        style={[styles.metricValue, compact && styles.metricCompact]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </Card>
  );
}
function DetailLine({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
    </View>
  );
}
function statusLabel(status: string) {
  return status === "active"
    ? "AKTIVNÍ"
    : status === "pending"
      ? "ČEKÁ"
      : "NEAKTIVNÍ";
}
function invoiceStatus(status: Invoice["status"]) {
  return {
    draft: "KONCEPT",
    sent: "ODESLÁNA",
    paid: "UHRAZENA",
    overdue: "PO SPLATNOSTI",
  }[status];
}
function invoiceColor(status: Invoice["status"]) {
  return status === "paid"
    ? colors.success
    : status === "overdue"
      ? colors.danger
      : status === "sent"
        ? colors.info
        : colors.textMuted;
}
function contractLabel(value: Employee["contractType"]) {
  return { hpp: "HPP", dpp: "DPP", dpc: "DPČ", osvc: "OSVČ" }[value];
}
function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}
function cargoCounts(rides: Ride[]) {
  return {
    envelope: rides.filter((item) => item.cargoType === "envelope").length,
    parcel: rides.filter((item) => item.cargoType === "parcel").length,
    box: rides.filter((item) => item.cargoType === "box").length,
    pallet: rides.filter((item) => item.cargoType === "pallet").length,
    other: rides.filter((item) => item.cargoType === "other").length,
  };
}
function cargoName(value: Ride["cargoType"]) {
  return {
    envelope: "Obálka",
    parcel: "Balík",
    box: "Krabice",
    pallet: "Paleta",
    other: "Jiné",
  }[value];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.72 },
  list: { gap: spacing.md },
  sectionGap: { marginTop: spacing.lg },
  formCard: {
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "900",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primaryText, fontSize: 17, fontWeight: "900" },
  accountName: { color: colors.text, fontWeight: "900", fontSize: 16 },
  accountEmail: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  accountRole: {
    color: colors.success,
    fontSize: 8,
    fontWeight: "900",
    marginTop: 5,
  },
  menu: { gap: spacing.sm },
  menuItem: {
    minHeight: 75,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: { color: colors.text, fontSize: 13, fontWeight: "800" },
  menuSubtitle: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  version: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  roleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.md,
  },
  roleChoice: {
    minHeight: 35,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  roleChoiceActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  roleText: { color: colors.textMuted, fontSize: 9, fontWeight: "700" },
  roleTextActive: { color: colors.primary },
  searchWrap: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  search: { color: colors.text, flex: 1, fontSize: 13 },
  userCard: { gap: spacing.sm },
  userTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  presenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  presenceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  presenceIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  passwordCard: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { color: colors.text, fontSize: 12, fontWeight: "800" },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  stateLabel: { color: colors.textMuted, fontSize: 8, fontWeight: "900" },
  company: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  contactLine: { color: colors.textMuted, fontSize: 10, marginTop: spacing.sm },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  smallAction: {
    minHeight: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
  },
  smallActionText: { color: colors.primary, fontSize: 8, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  miniStat: { flex: 1, padding: spacing.md },
  miniValue: { fontSize: 20, fontWeight: "900" },
  miniLabel: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  invoiceTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  invoiceStatus: { fontSize: 8, fontWeight: "900" },
  invoiceAmount: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  dateHeading: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "capitalize",
    marginBottom: spacing.sm,
  },
  availabilityRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  teamCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  teamColor: { width: 8, height: 45, borderRadius: 4 },
  countBadge: { alignItems: "center" },
  count: { color: colors.text, fontSize: 18, fontWeight: "900" },
  countLabel: { color: colors.textMuted, fontSize: 8 },
  vendingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metric: { width: "48%", minHeight: 108, padding: spacing.md },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  metricCompact: { fontSize: 16 },
  detailLine: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.textMuted, fontSize: 10, flex: 1 },
  detailValue: { color: colors.text, fontSize: 12, fontWeight: "900" },
  barRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  barLabel: { color: colors.textMuted, fontSize: 9, width: 55 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
    overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  barValue: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900",
    width: 24,
    textAlign: "right",
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  error: {
    color: "#FCA5A5",
    fontSize: 10,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
});
