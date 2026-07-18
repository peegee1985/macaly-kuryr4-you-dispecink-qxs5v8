# Vydání aplikace Kuryr4You Řidič na Google Play

Postup pro sestavení produkčního AAB přes EAS Build a nahrání do Play Console.

## Jednorázová příprava

1. Nainstalujte EAS CLI a přihlaste se Expo účtem (zdarma na expo.dev):

   ```bash
   npm install --global eas-cli
   eas login
   ```

2. V adresáři `mobile/` propojte projekt s Expo (vytvoří `extra.eas.projectId` v `app.json`):

   ```bash
   eas init
   ```

   Vzniklou změnu v `app.json` commitněte.

3. Při prvním produkčním buildu se EAS zeptá na Android keystore — zvolte **Generate new keystore**. Expo klíč bezpečně uloží a bude jím podepisovat všechny další buildy. Zálohu lze kdykoli stáhnout přes `eas credentials`.

## Sestavení produkčního AAB

```bash
cd mobile
npm run build:aab
```

- Profil `production` sestaví **app-bundle (.aab)** — formát vyžadovaný Google Play.
- `versionCode` se zvyšuje automaticky na serveru Expo (`appVersionSource: remote`, `autoIncrement: true`). Při prvním buildu potvrďte počáteční hodnotu **6** (verze 5 už byla distribuována jako APK přes GitHub Releases).
- Hotový `.aab` stáhněte z odkazu, který EAS vypíše (nebo z expo.dev → projekt → Builds).

## První nahrání do Play Console

1. V [Play Console](https://play.google.com/console) → **Create app**:
   - Název: `Kuryr4You Řidič`
   - Jazyk: čeština, typ: App, Free
2. **Play App Signing** ponechte zapnuté (výchozí) — Google přepodepíše bundle svým klíčem, náš EAS klíč slouží jako upload key.
3. Vyplňte **App content** (vše je povinné před vydáním):
   - **Privacy policy URL**: `https://kuryr4you.cz/ochrana-soukromi`
   - **Data safety**: aplikace sbírá — e-mail, jméno, telefon (account management), přesnou polohu (jen v popředí, pro funkčnost aplikace), fotografie (doklad o doručení). Data jsou šifrována při přenosu a lze požádat o smazání.
   - **App access**: aplikace vyžaduje přihlášení účtem řidiče → poskytněte Googlu testovací přihlašovací údaje (vytvořte testovacího řidiče).
   - Cílová skupina: 18+, není určeno dětem.
4. **Store listing**: krátký popis (max 80 znaků), dlouhý popis, ikona 512×512, feature graphic 1024×500, min. 2 screenshoty telefonu.
5. V sekci **Testing → Internal testing** (doporučený start) → **Create new release** → nahrajte stažený `.aab` → přidejte testery (e-maily) → Rollout.
6. Po ověření interním testováním povyšte release do **Closed testing** / **Production**.

> **Pozn.:** U osobního vývojářského účtu založeného po listopadu 2023 Google vyžaduje před produkčním vydáním uzavřené testování s min. 12 testery po dobu 14 dní. U firemního účtu tato povinnost není.

## Další vydání

1. Zvyšte `version` v `app.json` (marketingová verze) a doplňte `releaseNotes` v `release.json`.
2. `npm run build:aab` — `versionCode` se zvýší sám.
3. V Play Console vytvořte nový release v příslušné dráze a nahrajte nový `.aab`.
4. Volitelně lze nahrávání automatizovat přes `eas submit --platform android` (vyžaduje service account klíč z Google Cloud, návod: docs.expo.dev/submit/android).

## Souvislosti

- Debug APK z GitHub Actions (workflow **Android APK**) slouží dál pro rychlé testování — s Google Play verzí se nevylučuje, ale je podepsané jiným klíčem, takže nejde nainstalovat „přes" produkční aplikaci (a naopak).
- Distribuce přes GitHub Releases (`release.json` + vlastní update mechanismus) může běžet souběžně, dokud všichni řidiči nepřejdou na Google Play.
