import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { BottomTabs, LoadingView } from "./src/components/ui";
import { useDriverPresence } from "./src/hooks/useDriverPresence";
import { useGpsTracking } from "./src/hooks/useGpsTracking";
import { api } from "./src/lib/api";
import { secureAuthStorage } from "./src/lib/storage";
import {
  AccountStateScreen,
  LoginScreen,
  MissingConfigurationScreen,
} from "./src/screens/AuthScreens";
import { AvailabilityScreen } from "./src/screens/AvailabilityScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RideDetailModal } from "./src/screens/RideDetailModal";
import { RidesScreen } from "./src/screens/RidesScreen";
import { VendingScreen } from "./src/screens/VendingScreen";
import { VisitDetailModal } from "./src/screens/VisitDetailModal";
import { colors } from "./src/theme";
import type { DriverUser, MainTab, Ride, ServiceVisit } from "./src/types";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = new ConvexReactClient(
  convexUrl || "https://example.convex.cloud",
  {
    unsavedChangesWarning: false,
  },
);

export default function App() {
  if (!convexUrl) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <MissingConfigurationScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ConvexAuthProvider client={convex} storage={secureAuthStorage}>
        <AuthGate />
      </ConvexAuthProvider>
    </SafeAreaProvider>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <LoadingView label="Obnovuji přihlášení…" />;
  if (!isAuthenticated) return <LoginScreen />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const user = useQuery(api.users.getMe, {}) as DriverUser | null | undefined;
  const { signOut } = useAuthActions();

  if (user === undefined) return <LoadingView label="Načítám profil řidiče…" />;
  if (!user) return <LoadingView label="Profil nebyl nalezen…" />;

  const logout = () => void signOut();
  if (user.role !== "driver")
    return <AccountStateScreen state="wrong-role" onSignOut={logout} />;
  if (user.status === "pending")
    return <AccountStateScreen state="pending" onSignOut={logout} />;
  if (user.status !== "active")
    return <AccountStateScreen state="inactive" onSignOut={logout} />;

  return <DriverApp user={user} onSignOut={logout} />;
}

function DriverApp({
  user,
  onSignOut,
}: {
  user: DriverUser;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<MainTab>("home");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<ServiceVisit | null>(null);
  const gps = useGpsTracking();
  const presence = useDriverPresence();

  const logout = async () => {
    if (gps.tracking) await gps.stop();
    await presence.setOffline().catch(() => undefined);
    onSignOut();
  };

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {tab === "home" ? (
          <DashboardScreen
            user={user}
            tracking={gps.tracking}
            gpsBusy={gps.busy}
            gpsError={gps.error}
            onGpsToggle={() => void (gps.tracking ? gps.stop() : gps.start())}
            onOpenRide={setSelectedRide}
            onOpenRides={() => setTab("rides")}
          />
        ) : null}
        {tab === "rides" ? <RidesScreen onOpenRide={setSelectedRide} /> : null}
        {tab === "vending" ? (
          <VendingScreen onOpenVisit={setSelectedVisit} />
        ) : null}
        {tab === "availability" ? <AvailabilityScreen /> : null}
        {tab === "profile" ? (
          <ProfileScreen user={user} onSignOut={() => void logout()} />
        ) : null}
      </View>

      <BottomTabs active={tab} onChange={setTab} />
      <RideDetailModal
        ride={selectedRide}
        onClose={() => setSelectedRide(null)}
      />
      <VisitDetailModal
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
});
