# Kuryr4You Zákazník pro Android

Samostatná nativní Expo/React Native aplikace pro zákazníky. Používá stejný Convex backend jako webový zákaznický portál, ale má vlastní Android balíček `cz.kuryr4you.customer` a vlastní APK workflow.

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

GitHub Actions workflow `Android Customer APK` vytváří samostatné instalační APK jako artefakt `kuryr4you-zakaznik-apk`.
