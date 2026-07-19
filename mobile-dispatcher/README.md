# Kuryr4You Dispečink pro Android

Samostatná nativní Expo/React Native aplikace pro dispečery. Používá stejný Convex backend jako webový dispečink, ale má vlastní Android balíček `cz.kuryr4you.dispatcher` a vlastní APK workflow.

Roadmapa skutečných push notifikací, akcí v oznámeních a dispečerského Android
widgetu je v [`../docs/NATIVE_ANDROID_PUSH_ACTIONS_WIDGET_ROADMAP.md`](../docs/NATIVE_ANDROID_PUSH_ACTIONS_WIDGET_ROADMAP.md).

## Lokální spuštění

```bash
npm ci
EXPO_PUBLIC_CONVEX_URL=https://amicable-dogfish-440.eu-west-1.convex.cloud npx expo start
```

## Kontroly

```bash
npm run typecheck
npx expo-doctor@latest
EXPO_PUBLIC_CONVEX_URL=https://amicable-dogfish-440.eu-west-1.convex.cloud npx expo export --platform android
```

## Mapa bez API klíče

Živá mapa používá Leaflet a OpenStreetMap dlaždice v nativním Android WebView. Nevyžaduje Google Maps API ani žádný API klíč. Atribuce OpenStreetMap je zobrazena přímo v mapě.

## Funkce první verze

- dispečerské přihlášení a bezpečné obnovení relace;
- živý dashboard, všechny zásilky, schválení, cena, řidič, stav a platební odkaz;
- GPS mapa řidičů, chat a centrum oznámení;
- zákazníci a uživatelé, CRM, fakturace, dostupnost, týmy a HR;
- vending přehled, statistiky a nastavení profilu/notifikací.

GitHub Actions workflow `Android Dispatcher APK` vytváří samostatné instalační APK jako artefakt `kuryr4you-dispecink-apk`.
