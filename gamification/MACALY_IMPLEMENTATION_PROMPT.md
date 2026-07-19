# Implementační zadání pro Macaly.ai

Implementuj kompletní gamifikační systém řidičské aplikace Kuryr4You podle tohoto adresáře. Toto není vizuální prototyp: výsledkem musí být funkční produkční implementace napojená na stávající Convex backend, webový dispečink a Android aplikaci řidiče.

## Povinné pořadí práce

1. Přečti celý `gamification/GAMIFICATION_SPEC.md`.
2. Načti `gamification/data/gamification.config.json` jako autoritativní hodnoty XP, levelů, výzev a badge.
3. Načti `gamification/data/design-tokens.json` a `gamification/data/asset-manifest.json`.
4. Projdi stávající schéma a doménové mutace v `convex/`, zejména dokončení zakázky, POD, hodnocení, vending návštěvy, GPS dostupnost a notifikace.
5. Projdi řidičskou aplikaci v `mobile/` a webový dispečink v `src/`. Zachovej existující navigaci, autentizaci, práci se zakázkami, POD, GPS a aktualizace aplikace.
6. Implementuj backend před UI. UI nikdy nesmí samo vypočítávat ani zapisovat XP.
7. Nakonec proveď všechny body z `gamification/QA_CHECKLIST.md` a oprav nalezené chyby.

## Rozsah první implementace

Implementuj fáze 1 a 2 specifikace:

- Convex datový model, indexy, validátory a serverový gamification engine,
- idempotentní XP ledger,
- lifetime XP, level, season XP a streak,
- XP za doručení, POD, dochvilnost, mezizastávky a vending,
- denní, týdenní a měsíční výzvy s adaptivním cílem,
- dlouhodobé milníky a 12 odznaků se čtyřmi tiery,
- obrazovku Výzvy v řidičské Android aplikaci,
- kompaktní XP kartu na domovské obrazovce řidiče,
- detail odznaku, level-up modal a in-app notifikace,
- read-only gamifikační přehled v detailu řidiče v dispečinku,
- administraci šablon výzev a ručního ocenění s povinným důvodem,
- auditní historii všech automatických i ručních změn.

Sezonní žebříček a reálné finanční odměny ponech za feature flagem vypnuté. Nepřiděluj zakázky podle levelu.

## Backend pravidla

- Klient posílá pouze běžnou pracovní akci, nikdy počet XP.
- XP uděluj uvnitř stávající serverové doménové mutace nebo bezprostředně navázané interní mutace.
- Pro každou odměnu vytvoř stabilní `eventKey`, například `ride:<id>:delivered`, `ride:<id>:pod`, `visit:<id>:completed`.
- Před zápisem ověř unikátnost `eventKey`; opakovaný request musí skončit bez změny XP.
- Aktualizaci ledgeru, profilu, výzev a badge proveď jako jednu konzistentní serverovou operaci.
- Level vypočítej z lifetime XP podle configu; nikdy neukládej klientem dodaný level.
- Časové periody počítej v `Europe/Prague`; týden začíná v pondělí.
- Ruční korekce musí obsahovat dispečera, důvod, původní hodnotu a novou hodnotu. Záporná korekce nesmí smazat auditní historii.
- Žádná XP za rychlost. GPS se smí použít jen jako metrika dostupnosti během aktivní směny.
- Reklamace ani storno nesmí automaticky odečíst XP bez potvrzené interní kontroly.
- Stávajícím řidičům nevytvářej retroaktivní XP bez explicitního admin backfillu. Profil vytvoř lazy při prvním čtení nebo první nové události.

## UI řidiče

- Zachovej stávající tmavý styl aplikace: pozadí `#0F111A`, primární `#F59E0B`.
- Přidej kartu s levelem, titulem, lifetime XP, progress barem a nejbližší výzvou.
- Přidej záložku `Výzvy` s přepínači Denní / Týdenní / Měsíční / Odznaky.
- U každé výzvy ukaž přesný postup, cíl, odměnu a zbývající čas.
- Zamčené badge zobraz v šedé variantě, získané v příslušném tieru.
- Detail badge obsahuje název, popis, datum získání, současný tier, postup a podmínku dalšího tieru.
- Level-up modal je oslavný, ale krátký, respektuje `prefers-reduced-motion`/nastavení omezených animací a nezakrývá kritickou pracovní akci.
- Použij assety pouze podle `asset-manifest.json`; nevytvářej náhodné emoji nebo jiné vizuální náhrady.
- Všechny texty jsou česky a musí se vejít na menší Android displej bez horizontálního scrollu.

## UI dispečera

- V detailu řidiče zobraz level, titul, lifetime XP, season XP, streak, aktivní výzvy, badge a auditní historii.
- Umožni filtrovat audit podle typu a období.
- Ruční ocenění i korekce vyžadují oprávnění dispečera, počet XP v povoleném rozsahu a povinný důvod.
- Správa šablon smí měnit aktivitu, cíle a odměny, ale musí validovat limity z configu.
- Gamifikační údaje nikdy nepřidávej do zákaznického portálu ani zákaznické Android aplikace.

## Assety

- `gamification/assets/badge-sprite.svg` obsahuje tier rámečky a 12 ikon.
- `gamification/assets/gamification-ui.svg` obsahuje UI symboly.
- Přesné symboly a barvy jsou v `gamification/data/asset-manifest.json`.
- Do produkčních komponent nepoužívej vzdálené raw GitHub URL. Assety importuj lokálně z repozitáře nebo je při implementaci převeď na lokální komponenty.

## Testy a výstup

- Přidej unit testy výpočtu levelu, idempotence, period, streaku, výzev a badge tierů.
- Přidej integrační test: dokončení zakázky + POD + dochvilnost vede přesně k očekávaným ledger událostem a XP.
- Otestuj opakované odeslání stejné mutace a souběžné dokončení stejné zakázky.
- Spusť TypeScript kontrolu, stávající testy a nové testy.
- Nepřepisuj fungující moduly mimo nutné integrační body.
- Na závěr uveď seznam změněných souborů, výsledky testů, případné migrace a přesný seznam nedokončených bodů. Neoznačuj práci za hotovou, pokud některé akceptační kritérium selhalo.

