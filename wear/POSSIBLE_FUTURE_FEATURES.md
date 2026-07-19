# Possible Future Features — Wear OS

Tento dokument eviduje možné budoucí funkce pro obě hodinkové aplikace:

- `wear-driver/` — aplikace řidiče,
- `wear/` — aplikace dispečinku.

Jde pouze o backlog nápadů. Zařazení položky do tohoto dokumentu není souhlas
s implementací ani se změnou současné architektury. Konkrétní rozsah a způsob
provedení je nutné před zahájením vývoje odsouhlasit.

## Doporučený první balíček

1. Párování dispečerských hodinek šestimístným kódem místo ručního zadávání
   dlouhého API klíče.
2. Dispečerský seznam řidičů s online stavem, poslední polohou a stářím GPS.
3. Řidičský Tile „Další zastávka“ s adresou, časem a spuštěním navigace.
4. Upozornění na riziko zpoždění, starou GPS a nepřevzatou zakázku.
5. Rychlé přednastavené zprávy mezi řidičem a dispečerem.
6. Přehled XP, levelu a nově získaného odznaku na řidičských hodinkách.

## Řidičská Wear aplikace

### Další zastávka a časová upozornění

- Tile s následující adresou, zbývajícím časem a aktuálním stavem zakázky.
- Jedním klepnutím spustit navigaci nebo zavolat kontaktu.
- Vibrace před plánovaným vyzvednutím nebo doručením.
- Varování při pravděpodobném zpoždění.

### Komunikace a bezpečnost

- Rychlé zprávy: „Jedu“, „Zdržení 10 minut“, „Problém na místě“ a
  „Zavolejte mi“.
- Možnost nadiktovat krátkou zprávu hlasem.
- SOS / problém se zásilkou s bezpečným potvrzením, odesláním aktuální polohy,
  zakázky a typu problému dispečerovi.

### Více zastávek

- Přehledný checklist zastávek ve správném pořadí.
- Zobrazení pouze nejbližšího požadovaného kroku na hlavní obrazovce.
- Potvrzení dokončení jednotlivé zastávky pomocí slide-to-confirm.
- Fotografie, podpis a ostatní POD úkony nadále dokončovat v telefonu.

### Gamifikace

- Aktuální XP, level a postup k dalšímu levelu.
- Denní nebo týdenní výzva a série aktivních dnů.
- Oznámení nového odznaku s připravenou grafikou optimalizovanou pro kulatý
  displej hodinek.
- Přehled posledních získaných odměn.

## Dispečerská Wear aplikace

### Přehled řidičů

- Seznam řidičů s online stavem, poslední známou polohou, stářím GPS a
  rychlostí.
- Zobrazení aktivní zakázky řidiče, pokud je přiřazena.
- Zavolání řidiči přímo z detailu.
- Otevření detailní mapy v telefonu místo nepřehledné plné mapy na hodinkách.

### Centrum kritických událostí

- Blížící se nebo překročený termín vyzvednutí či doručení.
- Řidič s aktivní zakázkou bez aktuální GPS polohy.
- Dlouho nepřiřazená nebo neschválená zakázka.
- Potvrzení převzetí upozornění a dočasné ztišení méně důležitých událostí.

### Bezpečné rychlé akce

- Schválení zakázky, přiřazení nebo změna řidiče.
- Každá změna musí používat slide-to-confirm a být zaznamenána v auditní
  historii.
- Ruční přidělování XP ponechat primárně v plné dispečerské aplikaci, kde lze
  uvést důvod a zkontrolovat historii.

### Gamifikační přehled

- První tři řidiči v žebříčku.
- Upozornění na nově získaný odznak řidiče.
- Týmový cíl, například počet včasných doručení.
- Přehled řidičů, kterým chybí málo XP do dalšího levelu.

## Společné technické možnosti

- Wear OS Tiles a komplikace ciferníku pro nejdůležitější údaje.
- Bezpečné, revokovatelné a účelově omezené párovací tokeny pro obě aplikace.
- Offline zobrazení naposledy synchronizovaných dat včetně času poslední
  aktualizace.
- Chytřejší synchronizace nebo push události místo trvalého dotazování backendu
  každé dvě minuty, aby se snížila spotřeba baterie.
- Rozdílné vibrační vzory podle naléhavosti události.
- Diagnostická obrazovka se stavem připojení, poslední synchronizací a verzí
  aplikace.

## Záměrně nižší priorita

- Plná živá mapa na hodinkách: malý displej a vyšší spotřeba baterie snižují
  její praktický přínos. Vhodnější je stručný seznam řidičů a otevření mapy v
  telefonu.
- Dokončení doručení s fotografií a podpisem: tyto kroky vyžadují telefon a
  neměly by být nahrazeny zjednodušeným potvrzením na hodinkách.

