# Gamifikace – QA a akceptační kritéria

## Backend a integrita

- [ ] Stejný `eventKey` odeslaný dvakrát nezmění XP podruhé.
- [ ] Dvě souběžná dokončení stejné zakázky vytvoří pouze jednu XP událost.
- [ ] Klientská změna requestu nemůže podvrhnout počet XP ani level.
- [ ] Dokončená zakázka přidá přesně 100 XP jednou.
- [ ] POD foto nebo podpis přidá 15 XP; foto i podpis přidá dalších 5 XP, nikdy vícekrát.
- [ ] Mezizastávky nepřekročí 50 XP za jednu trasu.
- [ ] Vending návštěva a checklist mají samostatné idempotentní události.
- [ ] Výpočet levelu sedí pro hraniční hodnoty 0, 1 000, 4 000, 12 250, 20 250, 49 000, 90 250 a 210 250 XP.
- [ ] Lifetime XP se při změně měsíce nezmění; season XP se resetuje do nové sezony.
- [ ] Všechny denní/týdenní/měsíční periody používají `Europe/Prague`; týden začíná v pondělí.
- [ ] Streak roste nejvýše jednou za aktivní kalendářní den.
- [ ] Ruční změna bez oprávnění nebo bez důvodu je odmítnuta.
- [ ] Audit obsahuje automatické i ruční změny včetně původu a času.
- [ ] Neexistuje žádná XP událost založená na rychlosti nebo době jízdy.

## Výzvy a badge

- [ ] Řidič nedostane více než tři denní výzvy.
- [ ] Výzva závislá na zakázkách není přidělena řidiči bez odpovídající práce.
- [ ] Dokončení výzvy udělí odměnu právě jednou.
- [ ] Expirovaná nesplněná výzva neodečítá XP.
- [ ] Každý z 12 badge lze získat a zvýšit do dalšího tieru.
- [ ] Zamčený badge používá `tier-locked`; získaný správný tier frame a icon symbol.
- [ ] Postup k dalšímu tieru je serverem vypočtený a nepřesáhne 100 %.

## Řidičská aplikace

- [ ] Domovská XP karta se správně načte, má loading, empty, offline a error stav.
- [ ] Obrazovka Výzvy funguje na malém Android displeji bez horizontálního scrollu.
- [ ] Detail badge ukazuje podmínku, postup, datum a další tier.
- [ ] Level-up modal se zobrazí jednou a neblokuje dokončení zakázky/POD.
- [ ] Reduced motion odstraní oslavnou animaci, ale zachová informaci.
- [ ] Assety jsou lokální; aplikace není závislá na raw GitHub URL.
- [ ] Čeština včetně diakritiky je správná.

## Dispečink a role

- [ ] Dispečer vidí profil, výzvy, badge a audit všech řidičů.
- [ ] Pouze oprávněný dispečer může měnit šablony a zadat ruční ocenění/korekci.
- [ ] Zákaznický web ani zákaznická Android aplikace neobsahují gamifikační query, obrazovky ani data.
- [ ] Gamifikace nezměnila přidělování zakázek podle levelu.

## Regrese a build

- [ ] Stávající přihlášení, zakázky, POD, GPS, notifikace, platby a aktualizace APK fungují beze změny.
- [ ] TypeScript kontrola projde.
- [ ] Stávající testy projdou.
- [ ] Nové unit a integrační testy projdou.
- [ ] Produkční web build projde.
- [ ] Expo/Android prebuild řidičské aplikace projde.

