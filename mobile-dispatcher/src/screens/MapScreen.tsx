import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { LoadingView, PageHeader, Screen } from "../components/ui";
import { useOptionalDriverPresence } from "../hooks/useOptionalDriverPresence";
import { api } from "../lib/api";
import { formatDateTime, rideStatusLabel } from "../lib/format";
import { colors, radius, spacing } from "../theme";
import type { DriverLocation, Ride } from "../types";

const GPS_FRESH_MS = 120_000;
// Přihlášený řidič bez aktivní GPS (online)
const ONLINE_COLOR = "#FACC15";
const CLOSED_RIDE_STATUSES = new Set(["delivered", "cancelled", "failed"]);

type MapDriver = {
  id: string;
  name: string;
  plate: string;
  lat: number;
  lng: number;
  gpsActive: boolean;
  loggedIn: boolean;
  speedKmh?: number;
  updatedLabel: string;
  ride?: string;
};

type MapRidePoint = {
  id: string;
  rideId: string;
  number: string;
  status: string;
  kind: "pickup" | "delivery";
  label: string;
  address: string;
  scheduledLabel: string;
  lat: number;
  lng: number;
};

function hasCoordinates(lat?: number, lng?: number): lat is number {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat! >= -90 &&
    lat! <= 90 &&
    lng! >= -180 &&
    lng! <= 180
  );
}

function hasFreshGps(item: DriverLocation, now: number) {
  return (
    item.isTracking &&
    Number.isFinite(item.updatedAt) &&
    now - item.updatedAt >= 0 &&
    now - item.updatedAt <= GPS_FRESH_MS
  );
}

function currentSpeedKmh(item: DriverLocation) {
  if (
    item.speed === undefined ||
    !Number.isFinite(item.speed) ||
    item.speed < 0
  ) {
    return undefined;
  }
  return Math.round(item.speed * 3.6);
}

export function MapScreen({
  onOpenRide,
}: {
  onOpenRide: (ride: Ride) => void;
}) {
  const mapRef = useRef<WebView>(null);
  const locations = useQuery(api.gps.getAllDriverLocations, {}) as
    | DriverLocation[]
    | undefined;
  const rides = useQuery(api.rides.getAllRides, {}) as Ride[] | undefined;
  const presence = useOptionalDriverPresence();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const presenceByDriver = useMemo(
    () => new Map(presence.map((item) => [item.driverId, item])),
    [presence],
  );
  const knownLocations = useMemo(
    () =>
      (locations ?? [])
        .filter((item) => hasCoordinates(item.lat, item.lng))
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [locations],
  );
  const activeByDriver = useMemo(() => {
    const map = new Map<string, Ride>();
    rides
      ?.filter(
        (ride) =>
          ride.driverId &&
          ["assigned", "pickup", "transit"].includes(ride.status),
      )
      .forEach((ride) => map.set(ride.driverId!, ride));
    return map;
  }, [rides]);
  const openRides = useMemo(
    () =>
      (rides ?? [])
        .filter(
          (ride) =>
            !CLOSED_RIDE_STATUSES.has(ride.status) &&
            (hasCoordinates(ride.pickupLat, ride.pickupLng) ||
              hasCoordinates(ride.deliveryLat, ride.deliveryLng)),
        )
        .sort(
          (left, right) => left.requestedPickupAt - right.requestedPickupAt,
        ),
    [rides],
  );
  const onlineWithoutLocation = useMemo(() => {
    const located = new Set(knownLocations.map((item) => item.driverId));
    return presence.filter(
      (item) => item.isOnline && !located.has(item.driverId),
    );
  }, [knownLocations, presence]);
  const onlineCount = useMemo(
    () => presence.filter((item) => item.isOnline).length,
    [presence],
  );
  const mapDrivers = useMemo<MapDriver[]>(() => {
    return knownLocations.map((item) => {
      const activeRide = activeByDriver.get(item.driverId);
      const gpsActive = hasFreshGps(item, now);
      return {
        id: item.driverId,
        name: item.driverName ?? "Neznámý řidič",
        plate: item.vehiclePlate ?? "Vozidlo bez SPZ",
        lat: item.lat,
        lng: item.lng,
        gpsActive,
        loggedIn: presenceByDriver.get(item.driverId)?.isOnline === true,
        speedKmh: currentSpeedKmh(item),
        updatedLabel: formatDateTime(item.updatedAt),
        ride: activeRide
          ? `#${activeRide.rideNumber} · ${rideStatusLabel[activeRide.status]}`
          : undefined,
      };
    });
  }, [activeByDriver, knownLocations, now, presenceByDriver]);
  const mapRidePoints = useMemo<MapRidePoint[]>(
    () =>
      openRides.flatMap((ride) => {
        const points: MapRidePoint[] = [];
        if (hasCoordinates(ride.pickupLat, ride.pickupLng)) {
          points.push({
            id: `${ride._id}:pickup`,
            rideId: ride._id,
            number: ride.rideNumber,
            status: rideStatusLabel[ride.status],
            kind: "pickup",
            label: "Vyzvednutí",
            address: ride.pickupAddress,
            scheduledLabel: formatDateTime(ride.requestedPickupAt),
            lat: ride.pickupLat,
            lng: ride.pickupLng!,
          });
        }
        if (hasCoordinates(ride.deliveryLat, ride.deliveryLng)) {
          points.push({
            id: `${ride._id}:delivery`,
            rideId: ride._id,
            number: ride.rideNumber,
            status: rideStatusLabel[ride.status],
            kind: "delivery",
            label: "Doručení",
            address: ride.deliveryAddress,
            scheduledLabel: formatDateTime(ride.requestedDeliveryAt),
            lat: ride.deliveryLat,
            lng: ride.deliveryLng!,
          });
        }
        return points;
      }),
    [openRides],
  );

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.injectJavaScript(
      `window.updateMapData(${JSON.stringify(mapDrivers)},${JSON.stringify(mapRidePoints)}); true;`,
    );
  }, [mapDrivers, mapReady, mapRidePoints]);

  if (!locations || !rides) return <LoadingView label="Načítám živou mapu…" />;

  const focusAll = () =>
    mapRef.current?.injectJavaScript("window.focusAll(); true;");
  const focusDriver = (item: DriverLocation) => {
    setSelectedDriver(item.driverId);
    mapRef.current?.injectJavaScript(
      `window.focusDriver(${JSON.stringify(item.driverId)}); true;`,
    );
  };
  const onMapMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        driverId?: string;
        rideId?: string;
      };
      if (message.type === "ready") setMapReady(true);
      if (message.type === "driver" && message.driverId)
        setSelectedDriver(message.driverId);
      if (message.type === "ride" && message.rideId) {
        const ride = openRides.find((item) => item._id === message.rideId);
        if (ride) onOpenRide(ride);
      }
      if (message.type === "error") setMapError(true);
    } catch {
      // Ignore messages that do not belong to the Leaflet bridge.
    }
  };
  const hasMapItems = mapDrivers.length > 0 || mapRidePoints.length > 0;

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <PageHeader
        title="Živá mapa"
        subtitle={`${onlineCount} řidičů online · ${mapDrivers.length} posledních poloh · ${openRides.length} zakázek`}
        action={
          hasMapItems ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zobrazit všechny řidiče a zakázky"
              onPress={focusAll}
              style={styles.mapButton}
            >
              <Ionicons name="scan-outline" size={21} color={colors.text} />
            </Pressable>
          ) : null
        }
      />
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
          accessibilityLabel="Leaflet mapa řidičů a nevyřízených zakázek"
        />
        {mapError ? (
          <View style={styles.mapError}>
            <Ionicons
              name="cloud-offline-outline"
              size={28}
              color={colors.warning}
            />
            <Text style={styles.mapErrorTitle}>
              Mapové podklady se nenačetly
            </Text>
            <Text style={styles.mapErrorText}>
              Zkontrolujte internet. Seznam řidičů a otevření polohy v navigaci
              zůstávají funkční.
            </Text>
          </View>
        ) : null}
        {!hasMapItems && !mapError ? (
          <View pointerEvents="none" style={styles.emptyMapHint}>
            <Ionicons
              name="location-outline"
              size={21}
              color={colors.textMuted}
            />
            <Text style={styles.emptyMapHintText}>
              Zatím nejsou uložené žádné souřadnice. Mapa zůstává připravená a
              body se doplní automaticky.
            </Text>
          </View>
        ) : null}
        <View pointerEvents="none" style={styles.legend}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.success }]}
          />
          <Text style={styles.legendText}>Online · GPS</Text>
          <View style={[styles.legendDot, { backgroundColor: ONLINE_COLOR }]} />
          <Text style={styles.legendText}>Online</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
          <Text style={styles.legendText}>Offline</Text>
          <View
            style={[styles.legendDot, { backgroundColor: colors.primary }]}
          />
          <Text style={styles.legendText}>Vyzvednutí</Text>
          <View
            style={[styles.legendDot, { backgroundColor: colors.success }]}
          />
          <Text style={styles.legendText}>Doručení</Text>
        </View>
      </View>
      {knownLocations.length > 0 || onlineWithoutLocation.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.driverList}
          style={styles.driverScroll}
        >
          {onlineWithoutLocation.map((item) => (
            <View key={item.driverId} style={styles.driverCard}>
              <View style={styles.driverTop}>
                <View
                  style={[styles.onlineDot, { backgroundColor: ONLINE_COLOR }]}
                />
                <Text style={styles.driverName} numberOfLines={1}>
                  {item.driverName ?? "Neznámý řidič"}
                </Text>
              </View>
              <Text style={styles.vehicle}>
                {item.vehiclePlate ?? "Vozidlo bez SPZ"} · Online · bez GPS
              </Text>
              <Text style={styles.noRide}>
                Přihlášen, zatím neposlal žádnou polohu.
              </Text>
              <View style={styles.driverBottom}>
                <Text style={styles.updated}>
                  {formatDateTime(item.lastSeenAt)}
                </Text>
              </View>
            </View>
          ))}
          {knownLocations.map((item) => {
            const activeRide = activeByDriver.get(item.driverId);
            const selected = selectedDriver === item.driverId;
            const gpsActive = hasFreshGps(item, now);
            const speed = currentSpeedKmh(item);
            const loggedIn =
              presenceByDriver.get(item.driverId)?.isOnline === true;
            return (
              <Pressable
                key={item._id}
                accessibilityRole="button"
                onPress={() => focusDriver(item)}
                style={[
                  styles.driverCard,
                  selected && styles.driverCardSelected,
                ]}
              >
                <View style={styles.driverTop}>
                  <View
                    style={[
                      styles.onlineDot,
                      {
                        backgroundColor: gpsActive
                          ? colors.success
                          : loggedIn
                            ? ONLINE_COLOR
                            : colors.info,
                      },
                    ]}
                  />
                  <Text style={styles.driverName} numberOfLines={1}>
                    {item.driverName ?? "Neznámý řidič"}
                  </Text>
                </View>
                <Text style={styles.vehicle}>
                  {item.vehiclePlate ?? "Vozidlo bez SPZ"} ·{" "}
                  {gpsActive
                    ? "Online · GPS zapnuto"
                    : loggedIn
                      ? "Online · bez GPS"
                      : "Offline · poslední známá poloha"}
                </Text>
                <View style={styles.speedRow}>
                  <Ionicons
                    name="speedometer-outline"
                    size={16}
                    color={speed === undefined ? colors.textMuted : colors.info}
                  />
                  <Text
                    style={[
                      styles.speed,
                      speed === undefined && styles.speedUnknown,
                    ]}
                  >
                    {speed === undefined
                      ? "Rychlost není dostupná"
                      : `${gpsActive ? "Aktuálně" : "Naposledy"} ${speed} km/h`}
                  </Text>
                </View>
                {activeRide ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onOpenRide(activeRide)}
                  >
                    <Text style={styles.activeRide}>
                      #{activeRide.rideNumber} ·{" "}
                      {rideStatusLabel[activeRide.status]}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.noRide}>Bez aktivní zakázky</Text>
                )}
                <View style={styles.driverBottom}>
                  <Text style={styles.updated}>
                    {formatDateTime(item.updatedAt)}
                  </Text>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Otevřít polohu v Mapách"
                    onPress={() =>
                      void Linking.openURL(
                        `${Platform.OS === "ios" ? "maps" : "geo"}:0,0?q=${item.lat},${item.lng}`,
                      )
                    }
                  >
                    <Ionicons
                      name="navigate-circle-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
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
    .driver-marker,.ride-marker{width:30px;height:30px;border-radius:16px;border:3px solid #0F111A;box-shadow:0 3px 12px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;color:#111318;font-size:15px}
    .driver-marker{background:#38BDF8}.driver-marker.online{background:#FACC15}.driver-marker.gps{background:#22C55E}.ride-marker.pickup{background:#F59E0B}.ride-marker.delivery{background:#22C55E}
    .popup-name{font-weight:800;font-size:13px}.popup-meta{color:#555;font-size:11px;margin-top:3px}.popup-ride{color:#B45309;font-weight:700;font-size:11px;margin-top:5px}.popup-speed{color:#0369A1;font-weight:800;font-size:12px;margin-top:5px}
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
      var driverMarkers={};var rideMarkers={};var drivers=[];var ridePoints=[];var fitted=false;
      function esc(value){return String(value===undefined||value===null?'':value).replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]})}
      function driverIcon(item){return L.divIcon({className:'',html:'<div class="driver-marker '+(item.gpsActive?'gps':item.loggedIn?'online':'')+'">&#128663;</div>',iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-19]})}
      function rideIcon(item){return L.divIcon({className:'',html:'<div class="ride-marker '+item.kind+'">'+(item.kind==='pickup'?'&#128230;':'&#9873;')+'</div>',iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-19]})}
      function driverPopup(item){var speed=item.speedKmh===undefined?'Rychlost není dostupná':(item.gpsActive?'Aktuálně ':'Naposledy ')+esc(item.speedKmh)+' km/h';var state=item.gpsActive?'Online · GPS':item.loggedIn?'Online bez GPS · poslední známá poloha':'Offline · poslední známá poloha';return '<div class="popup-name">'+esc(item.name)+'</div><div class="popup-meta">'+esc(item.plate)+' · '+state+'</div><div class="popup-speed">'+speed+'</div><div class="popup-meta">Aktualizováno '+esc(item.updatedLabel)+'</div>'+(item.ride?'<div class="popup-ride">'+esc(item.ride)+'</div>':'<div class="popup-meta">Bez aktivní zakázky</div>')}
      function ridePopup(item){return '<div class="popup-name">#'+esc(item.number)+' · '+esc(item.label)+'</div><div class="popup-meta">'+esc(item.status)+' · '+esc(item.scheduledLabel)+'</div><div class="popup-ride">'+esc(item.address)+'</div>'}
      window.updateMapData=function(nextDrivers,nextRidePoints){
        drivers=nextDrivers||[];ridePoints=nextRidePoints||[];var seenDrivers={};var seenRides={};
        drivers.forEach(function(item){
          seenDrivers[item.id]=true;var marker=driverMarkers[item.id];
          if(!marker){marker=L.marker([item.lat,item.lng],{icon:driverIcon(item),zIndexOffset:1000}).addTo(map);marker.on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'driver',driverId:item.id}))});driverMarkers[item.id]=marker}
          marker.setLatLng([item.lat,item.lng]);marker.setIcon(driverIcon(item));marker.bindPopup(driverPopup(item));
        });
        Object.keys(driverMarkers).forEach(function(id){if(!seenDrivers[id]){map.removeLayer(driverMarkers[id]);delete driverMarkers[id]}});
        ridePoints.forEach(function(item){
          seenRides[item.id]=true;var marker=rideMarkers[item.id];
          if(!marker){marker=L.marker([item.lat,item.lng],{icon:rideIcon(item)}).addTo(map);marker.on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'ride',rideId:item.rideId}))});rideMarkers[item.id]=marker}
          marker.setLatLng([item.lat,item.lng]);marker.setIcon(rideIcon(item));marker.bindPopup(ridePopup(item));
        });
        Object.keys(rideMarkers).forEach(function(id){if(!seenRides[id]){map.removeLayer(rideMarkers[id]);delete rideMarkers[id]}});
        if(!fitted&&(drivers.length||ridePoints.length)){window.focusAll();fitted=true}
      };
      window.focusAll=function(){var points=drivers.map(function(item){return [item.lat,item.lng]}).concat(ridePoints.map(function(item){return [item.lat,item.lng]}));if(!points.length)return;map.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:13})};
      window.focusDriver=function(id){var item=drivers.find(function(row){return row.id===id});if(!item)return;map.setView([item.lat,item.lng],14,{animate:true});if(driverMarkers[id])driverMarkers[id].openPopup()};
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
    })();
  </script>
</body>
</html>`;

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  mapWrap: {
    flex: 1,
    minHeight: 310,
    overflow: "hidden",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  map: { flex: 1, backgroundColor: colors.surface },
  mapButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  mapError: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.surface,
  },
  mapErrorTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  mapErrorText: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  emptyMapHint: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(23,26,36,0.94)",
    padding: spacing.md,
  },
  emptyMapHintText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },
  legend: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15,17,26,0.88)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 8, marginRight: 3 },
  driverScroll: { flexGrow: 0, maxHeight: 184 },
  driverList: { gap: spacing.sm, padding: spacing.md },
  driverCard: {
    width: 230,
    minHeight: 154,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  driverCardSelected: { borderColor: colors.primary },
  driverTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  driverName: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
    flex: 1,
  },
  vehicle: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  speedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  speed: { color: colors.info, fontSize: 14, fontWeight: "900" },
  speedUnknown: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  activeRide: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  noRide: { color: colors.textMuted, fontSize: 10, marginTop: spacing.sm },
  driverBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  updated: { color: colors.textMuted, fontSize: 8 },
});
