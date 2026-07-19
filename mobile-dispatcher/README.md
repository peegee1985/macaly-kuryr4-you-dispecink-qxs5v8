# Kuryr4You Dispečink — Android

Expo shell produkčního dispečinku. Aplikace bezpečně načítá pouze domény
`kuryr4you.cz` a `www.kuryr4you.cz`, zachovává přihlášení a podporuje
Android back navigation a obnovu po výpadku připojení. Protože zobrazuje
produkční web, nové funkce dispečinku včetně gamifikace se projeví bez
vydání dalšího APK.

## Kontrola

```bash
npm ci
npm run typecheck
npx expo-doctor
```

## Instalační APK

```bash
npx eas-cli project:init
npx eas-cli build --platform android --profile preview
```

Podepsané APK se publikuje na GitHub Release `dispatcher-latest`.
