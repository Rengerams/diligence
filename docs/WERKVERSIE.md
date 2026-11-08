# Werkversie — wat er is gebouwd en wat nog volgt

**Versie:** 0.9.3  
**Datum:** 3 november 2026  
**Status:** werkende demo (MVP) met productie-opstelling; nog niet live gedeployed

Deze werkversie zet het ontwikkelplan om in een draaiende applicatie. De kernflows zijn in een echte browser getest. De productiearchitectuur uit het plan blijft het doel; deze versie maakt bewust een aantal tijdelijke keuzes om zonder installatie te kunnen draaien.

---

## 1. Draaien en inloggen

```bash
pnpm install
pnpm build
pnpm start
```

De applicatie draait op <http://localhost:3100>. De demo-database staat in `data/diligence.db` en wordt bij de eerste start gevuld.

| Rol | E-mail | Wachtwoord |
|---|---|---|
| Beheerder | `admin@diligence.local` | `demo1234` |
| Coördinator | `coordinator@diligence.local` | `demo1234` |
| Chauffeur | `chauffeur@diligence.local` | `demo1234` |

Alle gegevens zijn verzonnen. Gebruik deze omgeving niet met echte persoonsgegevens.

---

## 2. Wat werkt

### Deelnemers
- Zoeken op een deel van de naam, met kleine typefouten, of op telefoonnummer.
- Deelnemer aanmaken met contactgegevens, adres, kaarten, mobiliteit, notitie en noodcontact.
- Deelnemer bekijken met groepje, opgaven en bezoekgeschiedenis.
- Deelnemers importeren uit CSV met een controle vooraf en foutmeldingen per rij.
- Bezoekgeschiedenis importeren uit CSV, gekoppeld op telefoon of naam.
- Opschoonlijst voor actieve deelnemers die lang niet meededen, met pauzeren of archiveren.
- Groepjes beheren: leden toevoegen en eruit halen, naam wijzigen en opheffen.
- Groepjes worden bij de indeling als geheel behandeld.
- Aanwezigheid per uitje registreren; het uitje wordt daarmee afgerond en de deelname telt mee.
- Feedbackknop op elk scherm, met een overzicht en status voor de beheerder.

### Programma en vervoer
- Periode en uitjes bekijken.
- Uitje toevoegen met datum, tijden, omschrijving, prijs, capaciteit, labels, reeks, locatie en categorie.
- Locaties met adres en categorie beheren; in het programma op categorie filteren.
- Capaciteit van een uitje aanpassen.
- Voertuigen toevoegen en wijzigen: naam, kenteken, aantal plekken, opmerkingen en inzetbaarheid.
- Voertuigen automatisch laten voorstellen op basis van capaciteit, beschikbaarheid op de dag en zo weinig mogelijk lege plekken.
- Handmatig een voertuig toevoegen of verwijderen en een chauffeur koppelen.
- Programma importeren uit CSV met preview, foutmeldingen, aantal uitjes en "Ongedaan maken".
- Excel-import (.xlsx) met maandkoppen en dagregels, met dezelfde controle en undo.
- Deelnemergegevens exporteren als JSON en een deelnemer op verzoek anonimiseren.

### Opgave
- Telefonische opgave op één scherm: deelnemer zoeken, uitjes aanvinken of "alle uitjes" kiezen.
- Groepje automatisch meenemen, met de keuze "Alleen".
- Bevestigingsregel die de medewerker kan voorlezen.
- Na de deadline alleen met een reden; de reden komt in het wijzigingsoverzicht.
- Bestaande opgave bekijken en vervangen.

### Indeling
- Deterministisch voorstel: vaste datum gaat voor flexibel, nieuwe deelnemers hebben startkans bij hun eerste twee deelnames, groepjes blijven compleet, reeksen kiezen een datum met ruimte.
- Een specifieke opgave wordt nooit op een andere datum geplaatst.
- Uitleg per plaatsing in gewone taal.
- Reservelijst met rang.
- Handmatig iemand "toch plaatsen".
- Proefmodus: een handmatige indeling importeren en per uitje en per persoon vergelijken met het systeemvoorstel, inclusief aantallen per persoon.
- Voorstel bevestigen; daarna gaat de periode dicht en ontstaat de bellijst.

### Bellijst en verantwoording
- Bellijst per uitje met naam, telefoon, groepje en boodschap.
- Status "Gebeld", "Niet bereikt" en "Kan niet".
- E-mailwachtrij die na bevestigen per deelnemer met e-mailadres een bericht klaarzet.
- Verzenden via Brevo als `BREVO_API_KEY` is ingesteld; zonder sleutel blijft alles in demo-stand.
- Afmeldlink per bericht; afmelden zet de deelnemer op "geen e-mail" en wordt geaudit.
- Wijzigingsoverzicht met alle acties, ook inloggen, import, voertuigwijzigingen, handmatige plaatsingen en e-mail.

### Beveiliging, rollen en daglijst
- Tweestapsverificatie met een authenticator-app, inclusief een tweede login-stap.
- Eigen rollen met rechten per onderdeel en per handeling; systeemrollen Admin, Coördinator, Chauffeur en Penningmeester.
- Gebruikers beheren en aan een rol koppelen; accounts uitschakelen in plaats van verwijderen.
- Uitgebreid wijzigingsoverzicht: wie, wanneer, actie, oude en nieuwe waarde; filterbaar op medewerker, actie en datum.
- Het wijzigingsoverzicht is met databasetriggers onveranderlijk gemaakt.
- Aparte, printbare daglijst per uitje met deelnemers, telefoon, groepje, kaarten, mobiliteit, voertuigen en chauffeur.
- Printbaar programma per maand met logo, tijden, labels en prijzen.
- Chauffeur ziet alleen zijn eigen uitje en geen deelnemersadministratie.
- Hulp-pagina met de zes hoofdtaken.

### Kwaliteit
- 30 tests: 23 unit tests voor de indelingsmotor, vier imports en tweestapsverificatie, plus 7 SQLite-integratietests voor seed, audit-triggers, groepsvoorwaarde, voertuigconflict, transactie-rollback, rechten en rate limiting.
- 13 stappen in de hoofd-smoketest, 2 voor geschiedenis en opschonen, 1 voor de proefmodus, 1 voor 2FA, 5 voor rollen/gebruikers/logboek, 1 voor groepjes, 1 voor feedback, 1 voor Excel en 1 voor AVG.
- Afmelden getest via de afmeldlink.
- axe-scan op 26 kernschermen: 0 overtredingen.
- Vrije plek melden en afhandelen: browser-test geslaagd.
- Locaties en categorieën: aanmaken, koppelen aan een uitje en filteren werkt in de browser.
- Browsercontroles zoeken automatisch Chrome/Chromium (of `CHROME_PATH`); geen hard-coded Windows-pad meer.
- Sessies verlopen na 8 uur en na 60 minuten inactiviteit (`SESSION_IDLE_MINUTES` instelbaar).
- `pnpm package:source` maakt een schoon bronarchief (tar.gz en op Windows ook .zip) zonder `.next`, `data`, cookies, database of back-ups.
- Development-smoketest slaagt met de CSP-uitzondering voor `next dev`; productie houdt `unsafe-eval` uit.
- Productiebuild als standalone server getest op poort 3200, inclusief `/api/health`, securityheaders en login.
- TypeScript strict; build en tests slagen.

### Productieharding
- `Dockerfile` en `docker-compose.yml` met app, Caddy, automatisch HTTPS, healthcheck en automatische herstart.
- Securityheaders: CSP, `X-Frame-Options`, `nosniff`, referrer-policy en permissions-policy.
- Login-rate-limiting: 10 pogingen per 15 minuten per e-mailadres/IP-combinatie.
- `/api/health` controleert de database en ruimt verlopen sessies op.
- Versleutelde back-up met AES-256-GCM, retentie en een restorescript met integriteitscontrole.
- Sessie-inactiviteit en absolute sessieduur; 2FA verplicht voor Admin met `ENFORCE_2FA=true`.
- Uitgebreide runbook in [`PRODUCTIE.md`](PRODUCTIE.md).

---

## 3. Bewuste afwijkingen van het plan

| Plan | Werkversie | Waarom | Productiepad |
|---|---|---|---|
| PostgreSQL | SQLite via `node:sqlite` | Geen database-server of Docker nodig in deze omgeving; direct te starten | Repository-laag vervangen door PostgreSQL + Drizzle; schema en queries zijn er al op voorbereid |
| Auth.js, 2FA | Eigen sessietabel, scrypt, HttpOnly-cookie en TOTP | Sneller en volledig lokaal; Auth.js is nog niet nodig voor de demo | Auth.js invoeren; de TOTP-flow en sessietabel blijven bruikbaar |
| Drizzle ORM | SQL met een kleine wrapper | Minder installatie en minder abstractie voor deze eerste versie | Drizzle-migraties bovenop het bestaande schema |
| Tailwind CSS | Eigen CSS met dezelfde tokens | Geen buildstap voor styling; volledige controle over grote tekst en contrast | Tokens overnemen in Tailwind |
| Excel-import | CSV én ExcelJS | Dezelfde preview/commit-flow voor beide formaten | Geen wijziging nodig |
| E-mail via Brevo | Wachtrij met demo-stand | Geen e-mailaccount of API-sleutel in de demo; zonder sleutel gaat er niets uit | `BREVO_API_KEY` instellen; de wachtrij en afmeldflow zijn er al |
| Fijnmazige rechtenmatrix | Rollen en rechten per pagina en actie | Eerste verticale slice | Uitbreiden met veldniveau en module-rechten |
| Deelnemersgeschiedenis importeren | Aparte CSV-import | De echte export is nog niet beschikbaar; zo kan de basislijst en historie los worden aangeleverd | Hetzelfde bestand kan later in één import worden gecombineerd |

Deze afwijkingen zijn tijdelijk en staan los van het ontwerp in [`ONTWIKKELPLAN.md`](ONTWIKKELPLAN.md) en [`DATAMODEL.md`](DATAMODEL.md).

---

## 4. Wat nog niet werkt

1. **Echt e-mailverkeer.** De wachtrij en afmeldflow werken, maar zonder `BREVO_API_KEY` gaat er niets uit.
2. **Eén complete import van de bestaande database.** De basis en de bezoekgeschiedenis worden nu als aparte CSV-bestanden ingelezen.
3. **Modules.** Chauffeurskosten, kas en AI zijn niet gebouwd.
4. **Livegang.** De Docker-opstelling is nog niet op een echte server gebouwd of getest; er is nog geen penetratietest, uptime-monitor of offsite-back-up ingericht. Zie [`PRODUCTIE.md`](PRODUCTIE.md) voor de checklist.

In de demo staat 2FA standaard optioneel. Met `ENFORCE_2FA=true` wordt tweestapsverificatie verplicht voor Admin-accounts.

---

## 5. Belangrijke bestanden

```
src/app/                 pagina's en server actions
src/domain/allocation.ts deterministische indelingsmotor
src/lib/db.ts            SQLite-schema en queries
src/lib/seed.ts          demo-gegevens
src/lib/auth.ts          sessies en rollen
src/lib/email.ts         Brevo-verzending en demo-stand
src/lib/totp.ts          TOTP en herstelcodes
src/lib/permissions.ts   rechten en systeemrollen
src/lib/program-import.ts       CSV-import voor het programma
src/lib/participant-import.ts   CSV-import voor deelnemers
src/lib/history-import.ts       CSV-import voor bezoekgeschiedenis
src/lib/excel-program.ts        Excel-import met maandkoppen
src/lib/manual-allocation-import.ts  CSV-import voor de proefindeling
scripts/smoke.mjs        browser-smoketest
scripts/smoke-history.mjs geschiedenis en opschonen
scripts/smoke-proef.mjs  proefmodus en verschillen
scripts/smoke-unsubscribe.mjs  afmelden (vereist een token)
scripts/smoke-2fa.mjs    tweestapsverificatie
scripts/smoke-rollen.mjs rollen, gebruiker en logboek
scripts/smoke-groepen.mjs groepjes
scripts/smoke-feedback.mjs feedback
scripts/smoke-excel.mjs  Excel-import
scripts/smoke-avg.mjs    export en anonimiseren
scripts/browser.mjs      portable Chrome/Chromium-start
scripts/package-source.mjs  schoon bronarchief
scripts/backup.mjs       versleutelde back-up
scripts/restore.mjs      back-up terugzetten en controleren
scripts/a11y.mjs         axe-scan
Dockerfile               productie-image
docker-compose.yml       app + Caddy
Caddyfile                HTTPS en reverse proxy
docs/PRODUCTIE.md        deployment, back-up, restore, monitoring
tests/                   unit- en integratietests
data/diligence.db        lokale demo-database
```

---

## 6. Demo opnieuw beginnen

Stop de server en verwijder:

```
data/diligence.db
data/diligence.db-wal
data/diligence.db-shm
```

Start daarna opnieuw. De seed wordt automatisch geladen. Verwijder alleen bestanden in `C:\diligence\data` als je zeker weet dat je de demo wilt resetten.

---

## 7. Volgende bouwstap

De functionele kern en de productie-opstelling zijn nu gebouwd. De volgende stap is **daadwerkelijk uitrollen en testen op een EU-server**: Docker-image bouwen, DNS/TLS, back-upcron, uptime-monitoring, penetration test en een restore-oefening. Daarna volgen de modules Chauffeurskosten, Kas en AI.
