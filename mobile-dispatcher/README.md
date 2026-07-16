# Kuryr4You Dispečink pro Android

Samostatná nativní Expo/React Native aplikace pro dispečery. Používá stejný Convex backend jako webový dispečink, ale má vlastní Android balíček `cz.kuryr4you.dispatcher` a vlastní APK workflow.

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

## Nativní mapa

Pro vykreslení Google Maps přidejte v nastavení repozitáře GitHub Secret `GOOGLE_MAPS_API_KEY` s povoleným Maps SDK for Android a omezením na balíček `cz.kuryr4you.dispatcher`. Bez klíče aplikace dál ukazuje živý seznam GPS řidičů a nabídne otevření polohy v systémových mapách.

## Funkce první verze

- dispečerské přihlášení a bezpečné obnovení relace;
- živý dashboard, všechny zásilky, schválení, cena, řidič, stav a platební odkaz;
- GPS mapa řidičů, chat a centrum oznámení;
- zákazníci a uživatelé, CRM, fakturace, dostupnost, týmy a HR;
- vending přehled, statistiky a nastavení profilu/notifikací.

GitHub Actions workflow `Android Dispatcher APK` vytváří samostatné instalační APK jako artefakt `kuryr4you-dispecink-apk`.
