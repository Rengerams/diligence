# AGENTS.md – Beheersysteem Stichting Diligence Almere

Webapp waarmee vrijwilligers van Stichting Diligence Almere uitjes voor 55-plussers plannen: telefonische opgave, eerlijke indeling, reservelijst, vervoer en digitale kostendeclaratie.

Volledige eisen: `docs/EISEN.md`. Lees dat bestand voordat je een nieuwe functie bouwt. Dit bestand bevat alleen wat je elke sessie nodig hebt.

## Wie gebruikt dit

- Gebruikers zijn **vrijwilligers die niet handig zijn met computers**. Ze bellen met een deelnemer en typen tegelijk. Eenvoud gaat boven alles, ook boven een slimme oplossing.
- **Deelnemers (55-plussers) hebben geen login.** Het zijn alleen gegevens in de database.
- Het is **vrijwilligerswerk en het moet leuk blijven.** Geeft een functie een vrijwilliger meer werk of meer gedoe dan nu, dan is die functie nog niet goed. Vraag bij twijfel hoe het nu gaat en bouw geen oplossing waar niemand om gevraagd heeft.
- Rollen: Admin, Beheerder, Coördinator, Chauffeur, plus zelf aan te maken rollen. Rechten zijn per rol instelbaar, dus nooit op rolnaam controleren, altijd op recht.

## Bij onduidelijkheid: eerst vragen, niet improviseren

Dit is de belangrijkste werkafspraak. De opdrachtgever wil liever honderd vragen vooraf dan één verkeerde aanname achteraf.

- Is een eis, regel, tekst of gedrag niet helemaal duidelijk of tegenstrijdig? **Stop en stel de vraag**, voordat je code schrijft. Verzin geen invulling.
- Dit geldt extra voor: indelingsregels, rechten per rol, privacy, teksten voor de gebruiker en alles wat deelnemers raakt.
- Controleer eerst `docs/EISEN.md` en de rest van deze map. Staat het antwoord er niet in, vraag het.
- Stel de vragen gebundeld en concreet, met een voorbeeld en (als je die hebt) je voorstel erbij, zodat de opdrachtgever kan antwoorden met "ja" of "nee, zo".
- Moet je tijdelijk toch doorwerken, markeer de aanname zichtbaar in code en PR met `TODO(besluit): <vraag>` en meld dat in je antwoord. Bouw nooit een aanname in die moeilijk terug te draaien is (databaseschema, rechten, indelingsregels).
- Een gok die goed uitpakt is geen reden om de volgende keer weer te gokken.

## Stack (voorstel, pas aan zodra besloten)

TypeScript (strict), Next.js (App Router), PostgreSQL, Drizzle ORM, Auth.js, Tailwind CSS, Vitest, Playwright. Hosting in de EU.

**Demo-implementatie:** de werkversie in deze map gebruikt voorlopig SQLite (`node:sqlite`), directe SQL en een eigen sessielaag in plaats van PostgreSQL, Drizzle en Auth.js. Dat is een bewuste demo-keuze; de productiekeuze moet nog worden bevestigd en daarna in dit bestand en de code worden doorgevoerd.

## Commando's

```
pnpm install          # afhankelijkheden
pnpm dev              # lokaal draaien
pnpm test             # unit- en integratietests
pnpm test:e2e         # Playwright, hoofdflows
pnpm lint             # ESLint + typecheck
pnpm db:migrate       # migraties toepassen
pnpm db:seed          # nepdata laden (NOOIT echte gegevens)
```

Draai `pnpm lint` en `pnpm test` vóór je een taak als klaar meldt. Repareer fouten tot alles groen is.

## Projectstructuur

```
src/app/              pagina's en routes
src/domain/           zuivere bedrijfslogica, geen database, geen UI
  allocation/         eerlijke indeling (de kern)
  waitlist/           reservelijst
  groups/             groepjes
src/server/           database, auth, rechten, audit-log
src/components/       UI-componenten
docs/                 EISEN.md, help-teksten, besluiten
tests/                e2e en testdata
```

## Modules (aan en uit te zetten)

Het systeem is modulair gebouwd. De Admin zet modules aan of uit; de opdrachtgever wil dat nieuwe functies op de oude manier kunnen blijven werken zolang de stichting er nog niet aan toe is.

- **Kern (altijd aan):** deelnemers, groepjes, uitjes/periodes, opgave, indeling, reservelijst, accounts/rollen, audit-log.
- **Optioneel:** `expenses` (chauffeurskosten), `cash` (kasafsluiting, stortingen, saldo; vereist `expenses`), `assistant` (AI, standaard uit). Later: routeplanning, voertuigbeheer.
- Een uitgezette module is onzichtbaar en onbereikbaar (menu, route **en** API), maar de gegevens blijven bewaard. Aanzetten later mag nooit gegevens kosten.
- Bouw nooit logica van de kern afhankelijk van een optionele module. Kern importeert niets uit `src/modules/*`.
- Elke module krijgt een eigen map in `src/modules/<naam>/` met eigen tests, en schakelt via één centrale module-instelling. Wijzigingen van die instelling komen in de audit-log.

## Taalafspraken

- Gebruikersinterface en helpteksten: **gewoon Nederlands**, geen vakjargon, geen Engelse woorden. Schrijf op B1-niveau.
- Code, variabelen en commits: Engels.
- Domeinwoorden worden consequent vertaald:
  deelnemer = `participant`, uitje = `outing`, periode = `period`, groepje = `group`, reservelijst = `waitlist`, indeling = `allocation`, opgave = `signup`, chauffeur = `driver`, declaratie = `expense claim`, wijzigingsoverzicht = `audit log`.

## De eerlijke indeling (kern van het systeem)

- Staat in `src/domain/allocation/` als **zuivere functie**: invoer erin, voorstel eruit. Geen database, geen `Date.now()`, geen `Math.random()`.
- **Deterministisch**: zelfde invoer geeft altijd dezelfde uitkomst. Er is **geen loting**: bij gelijke stand markeert het systeem de plek als "gelijke stand: coördinator beslist" en toont de betrokken personen naast elkaar met uitleg.
- Elke plaatsing en elke afwijzing levert een **uitleg in gewone Nederlandse zin** op, bijvoorbeeld "Staat achteraan omdat Piet dit uitje al 4 keer deed."
- Regels, in vastgelegde volgorde: zie `docs/EISEN.md` §5 en de Besluiten daar. **Bedenk zelf geen regelvolgorde of weging.** Is iets niet besloten, vraag het en zet het als `TODO(besluit)` in de code.
- Groepjes worden alleen geplaatst als het hele groepje past.
- De coördinator kan altijd overrulen; handmatige wijzigingen worden als zodanig gemarkeerd.
- Elke regel heeft minstens één unit-test met een leesbaar voorbeeld. Schrijf eerst de test.

## Ontwerpregels voor elk scherm

- Grote knoppen en tekst (minimaal 18 px basistekst, knoppen minimaal 48 px hoog), WCAG 2.2 AA contrast.
- Elke knop heeft een tekstlabel. Nooit een losse icoon-knop.
- Bovenaan elk scherm staat wat de gebruiker nu moet doen.
- Elke actie krijgt een duidelijke bevestiging **en een "Ongedaan maken"**. Verwijderen is archiveren.
- Lege schermen leggen uit wat de volgende stap is.
- Zo min mogelijk klikken. Telefonische opgave: zoeken, aanvinken, opslaan, op één scherm.
- Responsief: de chauffeursschermen moeten op een telefoon werken, de opgavescherm op tablet en laptop.
- Gebruik de ene accentkleur uit `tailwind.config` voor acties, kalme kleuren elders.

## Bouwvolgorde en bestaande gegevens

Eerste bouwronde, in deze volgorde: (1) deelnemers met import en opschonen, (2) uitjes en programma met Excel-import, (3) telefonische opgave, (4) indeling met **proefmodus** en **verschillenoverzicht** (de stichting draait ongeveer een maand naast de oude werkwijze), (5) reservelijst en bellijst, (6) e-mail van de uitslag. Chauffeurskosten en Kas komen later als modules.

Deelnemers en bezoekgeschiedenis staan nu in een bestaande database en zijn **vervuild**: er staan geen einddatums bij gestopte deelnemers. Importeer daarom nooit blind. Bouw een controlestap en een beoordelingslijst (lang niet meegeweest: actief houden, pauzeren, archiveren). Zonder bezoekgeschiedenis van de laatste 12 maanden kan de indeling niet eerlijk rekenen, dus behandel ontbrekende geschiedenis als een vraag aan de opdrachtgever.

## Privacy en beveiliging (AVG)

- Persoonsgegevens alleen tonen aan rollen die het recht daarvoor hebben. Controleer rechten **op de server**, niet alleen in de UI.
- Elke wijziging gaat via de audit-log-functie in `src/server/audit/`: wie, wanneer, wat, oud en nieuw. De log is niet te wijzigen of te verwijderen.
- Geen persoonsgegevens in logbestanden, foutmeldingen, URL's of de AI-assistent.
- Geen echte gegevens in tests, seeds, screenshots of voorbeelden. Gebruik verzonnen namen.
- Geheimen alleen via omgevingsvariabelen. Nooit committen.
- AI-assistent staat standaard **uit** (instelling door Beheerder) en krijgt geen toegang tot deelnemersgegevens.

## Grenzen

**Altijd doen**
- Tests schrijven bij nieuwe logica, vooral in `domain/`.
- Databasewijzigingen als migratie, nooit handmatig.
- Nederlandse teksten laten lezen op eenvoud: zou een vrijwilliger van 70 dit begrijpen?
- Bij twijfel over een regel uit het eerlijkheidsalgoritme of een recht: vragen.

**Eerst vragen**
- Nieuwe afhankelijkheden toevoegen.
- Databaseschema wijzigen op een manier die bestaande gegevens raakt.
- Elke wijziging aan de volgorde of weging van indelingsregels.
- Wijzigen van rollen- en rechtenlogica.

**Nooit doen**
- Een deelnemer-login of online opgave voor deelnemers bouwen (bewuste keuze, zie boven).
- De audit-log omzeilen, leegmaken of laten wijzigen.
- Gegevens hard verwijderen waar archiveren kan.
- Falende tests uitzetten of verwijderen om groen te krijgen.
- Echte persoonsgegevens gebruiken buiten productie.

## Buiten bereik van versie 1

Routeplanning voor ophalen en voertuigbeheer (kilometerstanden, onderhoud), en voorlopig ook de modules Chauffeurskosten en Kas (op hold, wel voorbereid als module). Sla wel het gestructureerde woonadres op en houd voertuigen als losse objecten, zodat die modules later aansluiten. Bouw ze niet.

## Commits en PR's

- Kleine, afgeronde wijzigingen. Titel in het Engels: `feat(allocation): explain rejections in plain Dutch`.
- Beschrijf in de PR wat een vrijwilliger hiervan merkt.
- Raakt de PR de indeling of rechten, vermeld dat expliciet.
