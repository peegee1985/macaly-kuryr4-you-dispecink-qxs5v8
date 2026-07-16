import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { EmptyState, LoadingView, PageHeader, Screen } from "../components/ui";
import { formatDateTime, rideStatusLabel } from "../lib/format";
import { api } from "../lib/api";
import { colors, radius, spacing } from "../theme";
import type { DriverLocation, Ride } from "../types";

type MapDriver = {
  id: string;
  name: string;
  plate: string;
  lat: number;
  lng: number;
  online: boolean;
  ride?: string;
};

export function MapScreen({ onOpenRide }: { onOpenRide: (ride: Ride) => void }) {
  const mapRef = useRef<WebView>(null);
  const locations = useQuery(api.gps.getAllDriverLocations, {}) as DriverLocation[] | undefined;
  const rides = useQuery(api.rides.getAllRides, {}) as Ride[] | undefined;
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const currentLocations = useMemo(
    () => (locations ?? []).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)),
    [locations],
  );
  const activeByDriver = useMemo(() => {
    const map = new Map<string, Ride>();
    rides?.filter((ride) => ride.driverId && ["assigned", "pickup", "transit"].includes(ride.status)).forEach((ride) => map.set(ride.driverId!, ride));
    return map;
  }, [rides]);
  const mapDrivers = useMemo<MapDriver[]>(() => currentLocations.map((item) => {
    const activeRide = activeByDriver.get(item.driverId);
    return {
      id: item.driverId,
      name: item.driverName ?? "Neznámý řidič",
      plate: item.vehiclePlate ?? "Vozidlo bez SPZ",
      lat: item.lat,
      lng: item.lng,
      online: item.isTracking,
      ride: activeRide ? `#${activeRide.rideNumber} · ${rideStatusLabel[activeRide.status]}` : undefined,
    };
  }), [activeByDriver, currentLocations]);

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.injectJavaScript(`window.updateDrivers(${JSON.stringify(mapDrivers)}); true;`);
  }, [mapDrivers, mapReady]);

  if (!locations || !rides) return <LoadingView label="Načítám živou mapu…" />;

  const focusAll = () => mapRef.current?.injectJavaScript("window.focusAll(); true;");
  const focusDriver = (item: DriverLocation) => {
    setSelectedDriver(item.driverId);
    mapRef.current?.injectJavaScript(`window.focusDriver(${JSON.stringify(item.driverId)}); true;`);
  };
  const onMapMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; driverId?: string };
      if (message.type === "ready") setMapReady(true);
      if (message.type === "driver" && message.driverId) setSelectedDriver(message.driverId);
      if (message.type === "error") setMapError(true);
    } catch {
      // Ignore messages that do not belong to the Leaflet bridge.
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <PageHeader
        title="Živá mapa"
        subtitle={`${currentLocations.filter((item) => item.isTracking).length} řidičů sdílí GPS`}
        action={currentLocations.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Zobrazit všechny řidiče" onPress={focusAll} style={styles.mapButton}><Ionicons name="scan-outline" size={21} color={colors.text} /></Pressable> : null}
      />
      {currentLocations.length === 0 ? (
        <EmptyState icon="location-outline" title="Žádná GPS poloha" message="Poloha se objeví, jakmile ji řidič zapne ve své aplikaci." />
      ) : (
        <>
          <View style={styles.mapWrap}>
            <WebView
              ref={mapRef}
              source={{ html: leafletHtml, baseUrl: "https://kuryr4you.cz" }}
              style={styles.map}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess={false}
              setSupportMultipleWindows={false}
              onMessage={onMapMessage}
              onError={() => setMapError(true)}
              onHttpError={() => setMapError(true)}
              accessibilityLabel="Leaflet mapa polohy řidičů"
            />
            {mapError ? <View style={styles.mapError}><Ionicons name="cloud-offline-outline" size={28} color={colors.warning} /><Text style={styles.mapErrorTitle}>Mapové podklady se nenačetly</Text><Text style={styles.mapErrorText}>Zkontrolujte internet. GPS seznam a otevření polohy v navigaci zůstávají funkční.</Text></View> : null}
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

const leafletHtml = `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    html,body,#map{height:100%;width:100%;margin:0;background:#171A24}
    .leaflet-container{font-family:system-ui,-apple-system,sans-serif;background:#171A24}
    .leaflet-control-attribution{font-size:9px!important;background:rgba(15,17,26,.82)!important;color:#9198A8!important}
    .leaflet-control-attribution a{color:#F59E0B!important}
    .leaflet-control-zoom a{background:#171A24!important;color:#EDF0F7!important;border-color:#2A2F3D!important}
    .driver-marker{width:30px;height:30px;border-radius:16px;background:#F59E0B;border:3px solid #0F111A;box-shadow:0 3px 12px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#111318;font-size:15px}
    .driver-marker.offline{background:#9198A8}.popup-name{font-weight:800;font-size:13px}.popup-meta{color:#555;font-size:11px;margin-top:3px}.popup-ride{color:#B45309;font-weight:700;font-size:11px;margin-top:5px}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin="" onerror="window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}))"></script>
  <script>
    (function(){
      var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([49.8175,15.473],7);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
      L.control.zoom({position:'topright'}).addTo(map);
      var markers={};var drivers=[];var fitted=false;
      function esc(value){return String(value||'').replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]})}
      function icon(item){return L.divIcon({className:'',html:'<div class="driver-marker '+(item.online?'':'offline')+'">&#128663;</div>',iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-19]})}
      function popup(item){return '<div class="popup-name">'+esc(item.name)+'</div><div class="popup-meta">'+esc(item.plate)+'</div>'+(item.ride?'<div class="popup-ride">'+esc(item.ride)+'</div>':'<div class="popup-meta">Bez aktivní zakázky</div>')}
      window.updateDrivers=function(items){
        drivers=items||[];var seen={};
        drivers.forEach(function(item){
          seen[item.id]=true;var marker=markers[item.id];
          if(!marker){marker=L.marker([item.lat,item.lng],{icon:icon(item)}).addTo(map);marker.on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'driver',driverId:item.id}))});markers[item.id]=marker}
          marker.setLatLng([item.lat,item.lng]);marker.setIcon(icon(item));marker.bindPopup(popup(item));
        });
        Object.keys(markers).forEach(function(id){if(!seen[id]){map.removeLayer(markers[id]);delete markers[id]}});
        if(!fitted&&drivers.length){window.focusAll();fitted=true}
      };
      window.focusAll=function(){if(!drivers.length)return;var bounds=L.latLngBounds(drivers.map(function(item){return [item.lat,item.lng]}));map.fitBounds(bounds,{padding:[45,45],maxZoom:13})};
      window.focusDriver=function(id){var item=drivers.find(function(row){return row.id===id});if(!item)return;map.setView([item.lat,item.lng],14,{animate:true});if(markers[id])markers[id].openPopup()};
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
    })();
  </script>
</body>
</html>`;

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  mapWrap: { flex: 1, minHeight: 310, overflow: "hidden", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  map: { flex: 1, backgroundColor: colors.surface },
  mapButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  mapError: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xxl, backgroundColor: colors.surface },
  mapErrorTitle: { color: colors.text, fontWeight: "900", fontSize: 14, marginTop: spacing.sm, textAlign: "center" },
  mapErrorText: { color: colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: spacing.sm },
  legend: { position: "absolute", top: spacing.md, left: spacing.md, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(15,17,26,0.88)", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  legendDot: { width: 7, height: 7, borderRadius: 4 }, legendText: { color: colors.textMuted, fontSize: 9, marginRight: 5 },
  driverScroll: { flexGrow: 0, maxHeight: 164 }, driverList: { gap: spacing.sm, padding: spacing.md },
  driverCard: { width: 218, minHeight: 134, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md }, driverCardSelected: { borderColor: colors.primary },
  driverTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, onlineDot: { width: 8, height: 8, borderRadius: 4 }, driverName: { color: colors.text, fontWeight: "900", fontSize: 13, flex: 1 }, vehicle: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  activeRide: { color: colors.primary, fontSize: 10, fontWeight: "800", marginTop: spacing.md }, noRide: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md }, driverBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }, updated: { color: colors.textMuted, fontSize: 8 },
});
