import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import { EmptyState, LoadingView, PageHeader, Screen } from "../components/ui";
import { formatDateTime, rideStatusLabel } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { DriverLocation, Ride } from "../types";

const czechRepublic: Region = { latitude: 49.8175, longitude: 15.473, latitudeDelta: 4.2, longitudeDelta: 5.2 };

export function MapScreen({ onOpenRide }: { onOpenRide: (ride: Ride) => void }) {
  const mapRef = useRef<MapView>(null);
  const locations = useQuery(api.gps.getAllDriverLocations, {}) as DriverLocation[] | undefined;
  const rides = useQuery(api.rides.getAllRides, {}) as Ride[] | undefined;
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const hasNativeMapKey = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

  const currentLocations = useMemo(
    () => (locations ?? []).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)),
    [locations],
  );
  const activeByDriver = useMemo(() => {
    const map = new Map<string, Ride>();
    rides?.filter((ride) => ride.driverId && ["assigned", "pickup", "transit"].includes(ride.status)).forEach((ride) => map.set(ride.driverId!, ride));
    return map;
  }, [rides]);

  if (!locations || !rides) return <LoadingView label="Načítám živou mapu…" />;

  const focusAll = () => {
    if (currentLocations.length === 0) return;
    mapRef.current?.fitToCoordinates(currentLocations.map((item) => ({ latitude: item.lat, longitude: item.lng })), {
      edgePadding: { top: 90, right: 65, bottom: 220, left: 65 },
      animated: true,
    });
  };

  const focusDriver = (item: DriverLocation) => {
    setSelectedDriver(item.driverId);
    mapRef.current?.animateToRegion({ latitude: item.lat, longitude: item.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 500);
  };

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <PageHeader
        title="Živá mapa"
        subtitle={`${currentLocations.filter((item) => item.isTracking).length} řidičů sdílí GPS`}
        action={hasNativeMapKey && currentLocations.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Zobrazit všechny řidiče" onPress={focusAll} style={styles.mapButton}><Ionicons name="scan-outline" size={21} color={colors.text} /></Pressable> : null}
      />
      {currentLocations.length === 0 ? (
        <EmptyState icon="location-outline" title="Žádná GPS poloha" message="Poloha se objeví, jakmile ji řidič zapne ve své aplikaci." />
      ) : (
        <>
          <View style={styles.mapWrap}>
            {hasNativeMapKey ? <MapView ref={mapRef} style={styles.map} initialRegion={czechRepublic} customMapStyle={darkMapStyle} toolbarEnabled={false}>
              {currentLocations.map((item) => {
                const activeRide = activeByDriver.get(item.driverId);
                return (
                  <Marker
                    key={item._id}
                    coordinate={{ latitude: item.lat, longitude: item.lng }}
                    title={item.driverName ?? "Řidič"}
                    description={activeRide ? `#${activeRide.rideNumber} · ${rideStatusLabel[activeRide.status]}` : item.isTracking ? "GPS online" : "GPS vypnuto"}
                    pinColor={item.isTracking ? colors.primary : colors.textMuted}
                    onPress={() => setSelectedDriver(item.driverId)}
                  />
                );
              })}
            </MapView> : <View style={styles.mapFallback}><Ionicons name="map-outline" size={34} color={colors.primary} /><Text style={styles.mapFallbackTitle}>Seznam živých poloh je aktivní</Text><Text style={styles.mapFallbackText}>Pro vykreslení nativní mapy přidejte do GitHub Secrets klíč GOOGLE_MAPS_API_KEY. Polohu řidiče lze mezitím otevřít tlačítkem navigace.</Text></View>}
            <View pointerEvents="none" style={styles.legend}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Online</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} /><Text style={styles.legendText}>Vypnuto</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.driverList} style={styles.driverScroll}>
            {currentLocations.map((item) => {
              const activeRide = activeByDriver.get(item.driverId);
              const selected = selectedDriver === item.driverId;
              return (
                <Pressable key={item._id} accessibilityRole="button" onPress={() => focusDriver(item)} style={[styles.driverCard, selected && styles.driverCardSelected]}>
                  <View style={styles.driverTop}>
                    <View style={[styles.onlineDot, { backgroundColor: item.isTracking ? colors.success : colors.textMuted }]} />
                    <Text style={styles.driverName} numberOfLines={1}>{item.driverName ?? "Neznámý řidič"}</Text>
                  </View>
                  <Text style={styles.vehicle}>{item.vehiclePlate ?? "Vozidlo bez SPZ"}</Text>
                  {activeRide ? <Pressable accessibilityRole="button" onPress={() => onOpenRide(activeRide)}><Text style={styles.activeRide}>#{activeRide.rideNumber} · {rideStatusLabel[activeRide.status]}</Text></Pressable> : <Text style={styles.noRide}>Bez aktivní zakázky</Text>}
                  <View style={styles.driverBottom}>
                    <Text style={styles.updated}>{formatDateTime(item.updatedAt)}</Text>
                    <Pressable accessibilityRole="link" accessibilityLabel="Otevřít polohu v Mapách" onPress={() => void Linking.openURL(`${Platform.OS === "ios" ? "maps" : "geo"}:0,0?q=${item.lat},${item.lng}`)}><Ionicons name="navigate-circle-outline" size={22} color={colors.primary} /></Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#171A24" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9198A8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0F111A" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2A2F3D" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1E222E" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2A2F3D" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3A3F4C" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0B2638" }] },
];

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  mapWrap: { flex: 1, minHeight: 310, overflow: "hidden", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  map: { ...StyleSheet.absoluteFill },
  mapButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  legend: { position: "absolute", top: spacing.md, left: spacing.md, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(15,17,26,0.88)", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 9, marginRight: 5 },
  mapFallback: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxl, backgroundColor: colors.surface },
  mapFallbackTitle: { color: colors.text, fontWeight: "900", fontSize: 14, marginTop: spacing.md, textAlign: "center" },
  mapFallbackText: { color: colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: spacing.sm },
  driverScroll: { flexGrow: 0, maxHeight: 164 },
  driverList: { gap: spacing.sm, padding: spacing.md },
  driverCard: { width: 218, minHeight: 134, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  driverCardSelected: { borderColor: colors.primary },
  driverTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  driverName: { color: colors.text, fontWeight: "900", fontSize: 13, flex: 1 },
  vehicle: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  activeRide: { color: colors.primary, fontSize: 10, fontWeight: "800", marginTop: spacing.md },
  noRide: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md },
  driverBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" },
  updated: { color: colors.textMuted, fontSize: 8 },
});
