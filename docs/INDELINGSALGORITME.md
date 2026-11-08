# Eerlijke indeling — regels, determinisme en uitleg

**Versie:** 1.1  
**Datum:** 3 november 2026  
**Status:** ontwerp; de volgorde en weging zijn nog niet volledig bevestigd  
**Hoort bij:** [`ONTWIKKELPLAN.md`](ONTWIKKELPLAN.md), [`DATAMODEL.md`](DATAMODEL.md)

Dit document beschrijft hoe het systeem een voorstel maakt. Het is de bedoeling dat de coördinator het voorstel kan begrijpen, kan aanpassen en altijd het laatste woord houdt. De motor is een **pure functie**: invoer erin, voorstel eruit. Geen database, geen netwerk, geen `Date.now()`, geen `Math.random()`.

> **Belangrijk:** de regels in §3 zijn deels vastgelegd in `EISEN.md` en de Besluiten, maar de exacte volgorde en weging zijn dat niet. `AGENTS.md` verbiedt om die zelf te bedenken. Wat in dit document als **voorstel** staat, wordt pas code nadat de opdrachtgever het heeft bevestigd. Tot die tijd staat er `TODO(besluit)` bij en blokkeert het de bouw van de motor.

---

## 1. Wat de motor doet

De motor krijgt één periode met uitjes, opgaven, groepjes, capaciteit en deelnamegeschiedenis, en bepaalt:

- wie bij welk uitje wordt ingedeeld;
- wie op de reservelijst komt en in welke volgorde;
- waar een plek openblijft omdat de coördinator moet beslissen;
- waarom een plek wel of niet is gegeven, in gewone taal.

De motor bevestigt niets, stuurt niets en schrijft niets. De applicatie slaat het resultaat op als een `allocation_run` met een invoerhash en algoritmeversie. Bevestigen, bellen en e-mailen zijn aparte stappen.

---

## 2. Begrippen

| Begrip | Betekenis |
|---|---|
| **Claim** | Eén vraag om één plek: een deelnemer of een compleet groepje, voor een specifieke datum of voor één datum uit een reeks |
| **Vaste claim** | De opgave noemt één specifieke datum |
| **Flexibele claim** | De opgave noemt een reeks of alle uitjes; de motor kiest een datum |
| **Reeks** | Hetzelfde uitje op meerdere data, bijvoorbeeld 23 en 25 november |
| **Periode-opgave** | "Alle uitjes": één plek per uniek uitje in de periode; bij een reeks één datum (voorstel) |
| **Deelname** | Echte aanwezigheid (`attendance`) of een historisch bezoek (`historical_visit`); een opgave of reservering telt niet |
| **Nieuw** | Nooit aanwezig geweest, ook niet in de geïmporteerde geschiedenis |
| **Vaak** | Aantal deelnames in de terugkijkperiode, standaard 12 maanden |
| **Laatst** | Datum van de meest recente deelname |
| **Garantie** | Recht van een nieuwe deelnemer op twee uitjes, over periodes heen, voor zover er ruimte is |
| **Peildatum** | De datum die bepaalt welk 12-maandsvenster geldt; expliciet meegegeven, nooit uit de klok gehaald |
| **Vastgezette keuze** | Een handmatige plaatsing die bij herberekenen blijft staan |

---

## 3. Regels: wat vaststaat en wat nog niet

### 3.1 Vastgelegd in de eisen en besluiten

| Nr. | Regel | Bron |
|---|---|---|
| R-01 | Een specifieke opgave gaat voor "alle uitjes" | Besluit 1 |
| R-02 | Nieuw = nooit meegeweest; een opgave of reservering telt niet | Besluit 4 |
| R-03 | De garantie van twee uitjes geldt over periodes heen, voor zover er ruimte is bij de opgegeven uitjes | Besluit 5 |
| R-04 | "Vaak geweest" telt over alle uitjes samen, in de terugkijkperiode; ouder telt niet mee voor de score, maar blijft in de geschiedenis | Besluit 6 en 7 |
| R-05 | Wie vaker is meegeweest, gaat achteraan; achteraan betekent lagere voorrang, nooit uitsluiting | Besluit 6 |
| R-06 | Gelijke stand: wie het langst niet meedeed gaat voor; is dat ook gelijk, dan beslist de coördinator, niet het systeem | Besluit 8 |
| R-07 | De score van een groepje is het gemiddelde van de leden op "vaak" | Besluit 9 |
| R-08 | Een groepje wordt alleen compleet geplaatst | 5.2, 5.6 |
| R-09 | Wie zich voor alle data van een reeks opgeeft, wil één keer mee; de motor kiest de datum met de meeste ruimte | Besluit 10 |
| R-10 | Wie in een groepje zit, kan per uitje "Alleen" kiezen; dan telt het groepje niet mee | Besluit 11 |
| R-11 | De coördinator kan altijd handmatig ingrijpen; het systeem waarschuwt, maar blokkeert niet | Besluit 2 |
| R-12 | De motor is deterministisch; er wordt niet geloot | 5.4, Besluit 8 |
| R-13 | Elke plaatsing en afwijzing heeft uitleg in gewone taal | 5.5 |
| R-14 | De indeling is pas mogelijk na de deadline | 5.1 |
| R-15 | Mobiliteit beïnvloedt de plaatsing niet; alleen een waarschuwing bij een ongeschikt uitje | Besluit 21, 4.10 |
| R-16 | Na bevestigen gaat de bellijst open; e-mail gaat naar wie een e-mailadres heeft | 5.9, 5.11–5.14 |

### 3.2 Nog niet bevestigd

| Nr. | Vraag | Voorstel | Status |
|---|---|---|---|
| O-01 | Exacte volgorde tussen vaste datum, garantie, frequentie en laatste deelname | Zie §4 | **TODO(besluit)** |
| O-02 | Telt de garantie op basis van bevestigde plaatsing of echte aanwezigheid? | Aanwezigheid; bij de indeling wordt de garantie wel herkend | **TODO(besluit)** |
| O-03 | Betekent "alle uitjes" één plek per uniek uitje per periode, en bij een reeks één datum? | Ja | **TODO(besluit)** |
| O-04 | Wat gebeurt er als een groepje niet past? | Als geheel naar de reservelijst, nooit automatisch splitsen | **TODO(besluit)** |
| O-05 | Op welke datum komt een flexibele opgave op de reservelijst als alle data vol zijn? | Datum met de meeste resterende plekken; bij gelijk de vroegste datum | **TODO(besluit)** |
| O-06 | Wat als er meer exact gelijke kandidaten dan plekken zijn? | Plek openhouden en "gelijke stand: coördinator beslist" tonen | **TODO(besluit)** |
| O-07 | Hoe wordt de tie-break "laatst" voor een groepje berekend? | De oudste laatste deelname van de leden | **TODO(besluit)** |
| O-08 | Welke peildatum geldt voor de 12 maanden? | De opgavedeadline van de periode | **TODO(besluit)** |
| O-09 | Gaat een nieuwe deelnemer met een specifieke opgave voor een vaak-deelnemer met een specifieke opgave? | Ja, want minder vaak = voorrang | **TODO(besluit)** |
| O-10 | Hoe worden groepsleden met verschillende opgavevormen behandeld? | Alleen leden met dezelfde opgavevorm en dezelfde datum/reeks vormen samen een claim; de rest is apart, met waarschuwing | **TODO(besluit)** |

### 3.3 Reactie opdrachtgever 4 november 2026

Deze antwoorden zijn nog niet allemaal in de motor verwerkt. Ze zijn hier vastgelegd zodat er geen besluit verloren gaat.

| Punt | Reactie | Status |
|---|---|---|
| R-01 / A | Alle geplande uitjes tellen mee: iemand met minder geplande uitjes gaat voor. Een specifieke datum geldt alleen voor die datum; iemand wordt nooit op een andere datum ingedeeld dan opgegeven. | **Bevestigd; geplande uitjes tellen nu mee** |
| R-02 / O-02 | Nieuw telt op echte aanwezigheid; een opgave of reservering telt niet. | **Bevestigd** |
| R-03 / O-02 / C / D | Nieuwe deelnemers krijgen voorrang bij hun eerste twee deelnames, ook als dat later dan twee maanden is. Twee maanden is de richtlijn. Wie door een uitgevallen uitje niet meeging, krijgt bij de volgende opgave voorrang. | **Bevestigd; uitgevallen-uitje-credit nog niet in de motor** |
| R-04 | Frequentie telt per soort uitje (bijvoorbeeld Efteling, museum, uit eten), niet over alle uitjes samen. Locatie en categorie zijn hiervoor de basis. | **Bevestigd; motor nog niet aangepast** |
| R-05 | Niemand uitsluiten omdat hij vaak is meegeweest. Ongeveer gelijk verdelen; als iemand vaker meegaat en er is plek, is dat prima. Niet jaren terugkijken. | **Bevestigd** |
| Uitgevallen uitje | Wie door een uitgevallen uitje niet meeging, krijgt voorrang bij hetzelfde uitje in de eerstvolgende periode. | **Bevestigd; nog niet gebouwd** |
| R-06 / O-07 | Bij een gelijke stand beslist de coördinator. Wie het laatst is meegeweest, gaat niet voor. | **Bevestigd** |
| R-07 | Niet te veel rekenen op één keer verschil; het doel is een leuke dag. | **Richting bevestigd, details open** |
| R-08 / O-04 | Alleen als groepje behandelen als men zich als groepje opgeeft. Past het groepje niet, dan gaat het hele groepje niet mee. Groepsleden kunnen per uitje verschillen; iemand geeft zich nooit met twee groepjes voor dezelfde datum op. Er blijft één actief groepje per persoon. | **Bevestigd; één groepje per persoon** |
| R-09 / O-03 | Ieder evenement is uniek en krijgt een unieke code. Bij alle data van een reeks zonder voorkeur mag de motor één datum kiezen. | **Bevestigd** |
| R-10 | Iemand mag altijd alleen gaan, ook als hij in een groepje zit. | **Bevestigd** |
| Late afmelding | Een plek die vrijkomt nadat de planning rond is, wordt niet automatisch opgevuld. De coördinator krijgt een melding en belt zelf. | **Bevestigd en gebouwd** |
| R-11 | De coördinator moet akkoord geven; niets automatisch doorzetten. | **Bevestigd** |
| R-12 | Bij twijfel beslist de coördinator, niet het systeem. | **Bevestigd** |
| R-13 | Uitleg naar deelnemers kort houden: "Je gaat mee met dit uitje" of "Je gaat niet mee". | **Bevestigd** |
| R-14 | Indelen pas na de opgavedeadline. | **Bevestigd** |
| R-15 | Mobiliteit beïnvloedt de plaatsing niet. | **Bevestigd** |
| R-16 | Uitjes online, telefonische opgave tot de deadline, daarna indelen en bellen of mailen. | **Bevestigd** |
| O-05 / O-06 / O-08 | Reservelijst naar de datum met de meeste ruimte; capaciteit per evenement uit het programma; deadline als peildatum. | **Bevestigd** |
| O-09 | Een specifieke opgave is een opgave voor één concrete datum. | **Bevestigd** |
| O-10 / F | Groepsleden met verschillende opgavevormen en leden in meerdere groepjes: de coördinator beslist; niet automatisch splitsen. | **Bevestigd** |
| B / F | Locaties met adres en categorie toevoegen en aan een uitje koppelen. | **Gebouwd** |

De punten die nog openstaan, staan als `TODO(besluit)` in de code en worden niet stilzwijgend ingevuld.

---

## 4. Voorgestelde volgorde

Deze volgorde is een voorstel. Hij volgt de geest van de Besluiten, maar is niet als exacte weging bevestigd.

### 4.1 Twee categorieën

1. **Vaste claims** (één specifieke datum) gaan altijd voor flexibele claims, ongeacht hoe vaak iemand is meegeweest (R-01).
2. **Flexibele claims** (reeks of hele periode) komen daarna.

Binnen een categorie wordt gesorteerd op:

| Volgorde | Sleutel | Richting |
|---|---|---|
| 1 | Garantie nog open (alleen bij flexibele claims) | open eerst |
| 2 | Aantal deelnames in de terugkijkperiode | laag eerst |
| 3 | Laatste deelname | langst geleden eerst; nooit meegeweest eerst |
| 4 | Vaste, deterministische volgorde voor de verwerking | id oplopend, maar **niet** als fairness-tie-break |

- Bij een groepje worden sleutel 2 en 3 op groepsniveau bepaald: het gemiddelde aantal deelnames (R-07) en de oudste laatste deelname van de leden (O-07).
- De id-sortering is alleen om de verwerking reproduceerbaar te maken. Als twee claims inhoudelijk gelijk zijn en om dezelfde laatste plek strijden, beslist de id **niet**; dan ontstaat een gelijke stand (R-06, O-06).

### 4.2 Waarom niet één grote score

Een systeem dat alle factoren in één getal stopt, is moeilijk uit te leggen en makkelijk verkeerd te wegen. De motor werkt daarom met een expliciete, lexicografische volgorde: eerst de categorie, dan de garantie, dan het aantal deelnames, dan de laatste deelname. Zo kan de uitleg precies zeggen welke regel de doorslag gaf.

### 4.3 Wat de motor niet doet

- Niet kijken naar mobiliteit (R-15).
- Niet kijken naar woonplaats of afstand.
- Niet kijken naar de datum van opgave; er is geen "wie het eerst belt" (4.6).
- Niet willekeurig kiezen.
- Niet automatisch een groepje splitsen.
- Niet automatisch overcapaciteit maken.

---

## 5. Invoer en uitvoer

### 5.1 Invoer (typen)

```ts
type AllocationInput = {
  period: {
    id: string;
    startDate: string;       // ISO, geen Date-object
    endDate: string;
    signupDeadline: string;
  };
  referenceDate: string;     // peildatum voor de 12-maandstelling
  settings: {
    lookbackMonths: number;  // standaard 12
    guaranteeCount: number;  // standaard 2
  };
  outings: OutingInput[];
  series: SeriesInput[];
  signups: SignupInput[];
  groups: GroupInput[];
  history: ParticipantHistory[];
  guarantees: GuaranteeInput[];
  pins: ManualPin[];
  algorithmVersion: string;
};

type OutingInput = {
  id: string;
  seriesId: string | null;
  date: string;
  capacity: number;         // gasten, exclusief chauffeur (zie datamodel §20, punt 8)
  status: 'planned' | 'completed';
  lessSuitableWalkers: boolean;
};

type SeriesInput = {
  id: string;
  name: string;
  outingIds: string[];       // alle data van deze reeks, binnen de periode
};

type SignupInput = {
  id: string;
  participantId: string;
  target: { type: 'outing'; outingId: string }
        | { type: 'series'; seriesId: string }
        | { type: 'period' };
  groupMode: 'with_group' | 'alone';
  groupId: string | null;
};

type GroupInput = {
  id: string;
  activeMemberIds: string[];
};

type ParticipantHistory = {
  participantId: string;
  everAttended: boolean;
  countInLookback: number;
  lastVisitDate: string | null;
};

type GuaranteeInput = {
  participantId: string;
  remaining: number;        // 0–2
  startedInPeriodId: string | null;
};

type ManualPin = {
  outingId: string;
  participantId: string;
  pinnedByUserId: string;
};
```

### 5.2 Uitvoer

```ts
type AllocationResult = {
  run: {
    algorithmVersion: string;
    inputHash: string;       // SHA-256 van canonieke JSON
    referenceDate: string;
  };
  assignments: Array<{
    outingId: string;
    participantId: string;
    groupId: string | null;
    source: 'system' | 'manual' | 'pinned';
    reason: Reason;
  }>;
  waitlist: Array<{
    outingId: string;
    participantId: string;
    groupId: string | null;
    rank: number;
    reason: Reason;
  }>;
  ties: Array<{
    outingId: string;
    candidateParticipantIds: string[];
    reason: Reason;
  }>;
  rejected: Array<{
    participantId: string;
    target: string;
    reason: Reason;
  }>;
  stats: {
    placed: number;
    waitlisted: number;
    ties: number;
    capacityUsed: Record<string, number>;
  };
};

type Reason = {
  code: string;              // zie §9
  params: Record<string, string | number | null>; // alleen ids, aantallen, datums
};
```

De UI maakt van `code` en `params` een Nederlandse zin. De motor levert dus geen namen of vrije tekst mee; dat houdt de uitvoer privacyvriendelijk en testbaar.

---

## 6. Stap voor stap

### Stap 1 — Invoer controleren

- Capaciteit groter dan nul.
- Uitjes binnen de periode.
- Opgaven verwijzen naar bestaande deelnemers, uitjes en reeksen.
- Geen dubbele actieve opgave voor dezelfde deelnemer en hetzelfde doel.
- Groepsleden bestaan en zijn actief.
- Vaste keuzes verwijzen naar bestaande uitjes en deelnemers.
- Bij een fout: geen gedeeltelijke uitvoer, maar een `InputError` met een code en de betrokken id's.

### Stap 2 — Opgaven omzetten naar claims

Voor elke actieve opgave:

| Opgave | Claims |
|---|---|
| Specifieke datum | Eén vaste claim voor die datum |
| Reeks | Eén flexibele claim met alle data van de reeks |
| Hele periode | Voor elk uniek uitje in de periode één claim; bij een reeks één flexibele claim met alle data (O-03) |

**Groepjes:**

- Leden met `groupMode = with_group` en dezelfde opgavevorm en hetzelfde doel vormen samen één claim.
- Een lid met `alone` doet niet mee in de groepsclaim.
- Een groepje met één overgebleven lid wordt een individuele claim.
- Hebben groepsleden verschillende opgavevormen, dan ontstaan aparte claims en geeft de motor een waarschuwing (O-10).
- De grootte van de claim is het aantal leden; de claim vraagt evenveel plekken als leden.

**Dubbelingen:**

- Heeft iemand zowel een specifieke opgave als een reeks- of periode-opgave voor hetzelfde uitje, dan vervalt de flexibele claim voor dat uitje; de specifieke wint (R-01).
- Heeft iemand twee opgaven die hetzelfde uitje raken, dan blijft één claim over.
- De motor onthoudt per deelnemer welke reeksen al zijn vervuld, zodat iemand niet twee keer in dezelfde reeks wordt geplaatst.

### Stap 3 — Claims sorteren

1. Vaste claims vóór flexibele claims.
2. Binnen flexibele claims: garantie open vóór garantie op.
3. Aantal deelnames oplopend.
4. Laatste deelname oplopend (null eerst).
5. Alleen voor reproduceerbaarheid: claim-id oplopend.

De sortering is stabiel en expliciet. Er wordt niet vertrouwd op de volgorde waarin de database rijen teruggeeft.

### Stap 4 — Claims plaatsen

Voor elke claim in de gesorteerde volgorde:

1. Bepaal de kandidaat-uitjes:
   - vaste claim: het ene uitje;
   - flexibele claim: alle data van de reeks of alle uitjes van de periode, voor zover nog niet vervuld.
2. Filter op:
   - resterende capaciteit >= grootte van de claim;
   - geen deelnemer die al in dezelfde reeks is geplaatst;
   - geen uitje dat is geannuleerd of afgerond.
3. Kies:
   - vaste claim: het ene uitje;
   - flexibele claim: het uitje met de meeste resterende plekken; bij gelijk de vroegste datum, dan het laagste uitje-id (O-05).
4. Past de claim niet:
   - vaste claim: op de reservelijst van dat uitje;
   - flexibele claim: op de reservelijst van het uitje met de meeste resterende plekken; bij gelijk de vroegste datum (O-05).
5. Bij plaatsing:
   - alle leden krijgen een toewijzing;
   - de capaciteit gaat omlaag;
   - de reeks geldt als vervuld voor de leden;
   - de garantie wordt **niet** meteen afgeboekt; dat gebeurt pas bij aanwezigheid (O-02).
6. Bij een groepje dat niet past: de hele claim gaat naar de reservelijst; er worden geen losse leden geplaatst (R-08, O-04).

### Stap 5 — Gelijke stand

De motor mag niet willekeurig kiezen. Daarom:

- Als twee of meer claims dezelfde sorteersleutel hebben en samen niet meer in de resterende capaciteit passen, worden die plekken **niet** toegewezen.
- De betrokken plekken krijgen status `tie_pending`.
- De kandidaten worden naast elkaar getoond, met hun aantal deelnames en laatste deelname.
- De coördinator kiest; daarna wordt de indeling bijgewerkt.
- Een lagere claim mag de opengehouden plek niet innemen.

### Stap 6 — Vastgezette keuzes

- Vastgezette plaatsingen worden vóór de berekening als bezet beschouwd.
- De motor verplaatst ze nooit.
- Als een vaste keuze de capaciteit overschrijdt, waarschuwt de motor; de coördinator heeft het laatste woord (R-11).
- Als een vaste keuze een groepje splitst, waarschuwt de motor, maar blokkeert niet.
- Herberekenen zonder reset behoudt alle vastgezette keuzes (5.8).
- Reset verwijdert de vastgezette keuzes expliciet, met bevestiging en audit.

### Stap 7 — Reservelijst

- De volgorde is de volgorde waarin claims niet konden worden geplaatst, oplopend naar rang.
- Binnen dezelfde claimgrootte en prioriteit: de sorteersleutel van §4.
- Een groepje staat als geheel op de lijst.
- Bij een afzegging of extra capaciteit komt de eerste passende reservist bovenaan de bellijst (7.2).
- "Kan niet" schuift door naar de volgende; dat heeft geen negatief effect op de score (Besluit 12).
- De coördinator kan de volgorde handmatig aanpassen (7.5).

### Stap 8 — Uitvoer en uitleg

- Elke toewijzing, wachtlijstplaats en afwijzing krijgt een `Reason`.
- De applicatie slaat de run op met `input_hash` en `algorithm_version`.
- De UI rendert de reden met de actuele namen.
- De proefmodus slaat alleen op; er gaat geen e-mail uit en er wordt niets bevestigd.

---

## 7. Pseudocode

```ts
function berekenIndeling(input: AllocationInput): AllocationResult {
  validate(input);

  const claims = buildClaims(input);          // §6 stap 2
  const sorted = sortClaims(claims, input);   // §6 stap 3
  const capacity = new Map(input.outings.map(o => [o.id, o.capacity]));

  applyPins(input.pins, capacity);            // vaste keuzes eerst

  const assignments = [];
  const waitlist = [];
  const ties = [];
  const placedSeries = new Map<string, Set<string>>(); // deelnemer -> reeksen

  for (const claim of sorted) {
    const candidates = allowedOutings(claim, input, capacity, placedSeries);
    const fitting = candidates.filter(o => capacity.get(o.id)! >= claim.size);

    if (fitting.length === 0) {
      const target = chooseWaitlistOuting(claim, candidates, capacity);
      waitlist.push({ ...target, claim, reason: waitlistReason(claim) });
      continue;
    }

    const chosen = chooseOuting(claim, fitting, capacity);
    reserve(chosen, claim, capacity, placedSeries, assignments);
  }

  markTies(assignments, capacity, ties);      // §6 stap 5
  return finalize(assignments, waitlist, ties, input);
}
```

`chooseOuting` is voor een vaste claim triviaal; voor een flexibele claim sorteert hij op resterende capaciteit (aflopend), datum (oplopend), id (oplopend). `chooseWaitlistOuting` gebruikt dezelfde sortering, maar dan op de resterende capaciteit en de vroegste datum.

---

## 8. Determinisme

De motor is deterministisch als:

- alle sorteringen expliciet zijn, met een vaste richting en een vaste tie-break;
- er geen `Date.now()`, `new Date()` zonder argument, `Math.random()` of `crypto.randomUUID()` in de motor zit;
- er geen `localeCompare` wordt gebruikt; vergelijk strings op codepoint;
- de database geen volgorde bepaalt; de applicatie levert arrays in een vaste volgorde aan;
- de invoer canoniek wordt geserialiseerd (vaste sleutelvolgorde, geen `undefined`) voordat de hash wordt berekend;
- dezelfde invoer en dezelfde `algorithmVersion` altijd dezelfde `inputHash` en dezelfde uitvoer geven.

**Test:** twee keer berekenen met dezelfde invoer geeft een identieke JSON en een identieke hash. De test vergelijkt de volledige uitvoer, niet alleen aantallen.

**Versiebeheer:** elke wijziging aan een regel verhoogt `algorithmVersion` (semver). Een run blijft herleidbaar naar de versie waarmee hij is gemaakt.

---

## 9. Uitleg in gewone taal

De motor levert een code en parameters. De UI maakt de zin. Voorbeelden:

| Code | Parameters | Voorbeeldzin |
|---|---|---|
| `placed_specific` | uitje, datum | "Je bent ingedeeld voor Efteling op 3 maart, omdat je je voor deze datum hebt opgegeven." |
| `placed_flexible` | uitje, datum, vrije_plekken | "Je bent ingedeeld op 25 november; daar was de meeste ruimte." |
| `placed_guarantee` | uitje, datum, restant | "Je bent ingedeeld op 3 november; je hebt nog recht op één uitje." |
| `waitlist_capacity` | uitje, rang | "Het uitje is vol. Je staat op de reservelijst op plek 1." |
| `waitlist_group` | uitje, groepsgrootte | "Jullie groepje past niet in één keer. Jullie staan samen op de reservelijst." |
| `waitlist_no_date` | reeks | "Alle data van deze reeks zijn vol. Je staat op de reservelijst." |
| `tie_coordinator` | uitje, kandidaten | "Deze plek is nog niet verdeeld: jij en Piet hebben even vaak meegedaan. De coördinator beslist." |
| `rejected_specific_wins` | uitje | "Voor deze datum had iemand anders een specifieke opgave. Daarom ben je hier niet ingedeeld." |
| `manual_override` | uitje, medewerker | "De coördinator heeft je handmatig ingedeeld." |
| `capacity_increased` | uitje | "Er is een plek bijgekomen; daardoor ben je alsnog ingedeeld." |

Regels voor de zinnen:

- B1-niveau, korte zinnen, geen jargon.
- Geen mobiliteit, notities of andere gevoelige gegevens.
- Geen beschuldigende toon; "staat achteraan" is geen diskwalificatie.
- Bij een gelijke stand altijd zeggen dat de coördinator beslist, niet dat het systeem heeft gekozen.
- Bij een groepje altijd zeggen dat het als geheel is geplaatst of op de wachtlijst staat.

---

## 10. Proefmodus en verschillenoverzicht

### 10.1 Proefmodus

- De coördinator laat een systeemvoorstel berekenen (`kind = system`, `phase = proposal`).
- Er wordt niets bevestigd, geen e-mail verstuurd en geen bellijst geopend.
- De handmatige indeling wordt in dezelfde periode vastgelegd (`kind = manual`, `phase = proposal`) of geïmporteerd.
- Beide runs blijven bewaard.

### 10.2 Verschillenoverzicht

Per uitje en per deelnemer:

- welk systeemvoorstel, welke handmatige indeling;
- status (ingedeeld, reservelijst, niet ingedeeld);
- de systeemuitleg;
- het aantal deelnames in de terugkijkperiode;
- de laatste deelname;
- of het verschil komt door capaciteit, groepje, garantie, frequentie of een gelijke stand.

Daarnaast een overzicht per persoon: hoeveel uitjes heeft iedereen gekregen, en hoe verhoudt zich dat tot de handmatige indeling? Zo is te zien of het systeem eerlijker uitpakt of niet.

Het verschiloverzicht verandert niets. Na de proefmaand beslist de opdrachtgever of het systeem de indeling overneemt.

---

## 11. Voorbeelden

> Alle namen zijn verzonnen. De voorbeelden zijn bedoeld voor tests en uitleg, niet als echte gegevens.

### Voorbeeld 1 — Specifiek gaat voor "alles"

Periode met één uitje, capaciteit 2.

| Deelnemer | Opgave | Vaak | Laatst |
|---|---|---|---|
| Jan | specifiek 3 maart | 0 (nieuw) | nooit |
| Piet | specifiek 3 maart | 4 | 2 maanden geleden |
| Anna | alle uitjes | 1 | 5 maanden geleden |

Uitkomst: Jan en Piet zijn ingedeeld; Anna staat op de reservelijst. De specifieke opgaven gaan voor, ook al is Anna minder vaak geweest dan Piet.

### Voorbeeld 2 — Nieuwe deelnemer gaat voor

Periode met één uitje, capaciteit 1.

| Deelnemer | Opgave | Vaak |
|---|---|---|
| Jan | specifiek | 0 (nieuw) |
| Piet | specifiek | 4 |

Uitkomst: Jan is ingedeeld, Piet staat op de reservelijst. Dit volgt uit "minder vaak = voorrang"; het is een voorstel dat nog bevestigd moet worden (O-09).

### Voorbeeld 3 — Groepje past niet

Uitje met capaciteit 2. Groepje van drie (Anna, Bea, Cor) heeft samen opgegeven.

Uitkomst: het groepje staat als geheel op de reservelijst. Er worden geen twee van de drie geplaatst. Een individuele deelnemer met lagere prioriteit kan de twee plekken krijgen; dat is de consequentie van "groepjes alleen compleet".

### Voorbeeld 4 — Reeks met twee data

Reeks met 23 en 25 november, elk capaciteit 2.

- Vier vaste opgaven voor 23 november: 2 passen, 2 niet.
- Twee flexibele opgaven voor de reeks.

Uitkomst: de flexibele opgaven gaan naar 25 november, waar nog ruimte is. Zo blokkeren ze de vaste deelnemers op 23 november niet.

### Voorbeeld 5 — Gelijke stand

Uitje met capaciteit 1. Twee deelnemers hebben dezelfde opgave, even vaak meegedaan en op dezelfde dag voor het laatst.

Uitkomst: geen automatische keuze. De plek blijft open met "gelijke stand: coördinator beslist" en beide namen. De coördinator kiest; de keuze wordt als handmatig vastgelegd.

### Voorbeeld 6 — Garantie over periodes

Jan is nieuw en krijgt in periode 1 één plek; door drukte is er geen tweede. Zijn garantie-restant blijft 1. In periode 2 staat hij bij flexibele opgaven vooraan, tot hij een tweede uitje heeft gehad. De coördinator kan altijd afwijken.

### Voorbeeld 7 — Handmatige correctie

Piet stond op de reservelijst, maar de coördinator weet dat hij geopereerd is en graag mee wil. De coördinator plaatst hem handmatig. Het systeem waarschuwt dat de capaciteit wordt overschreden of dat iemand anders moet wijken; het blokkeert niet. De plaatsing krijgt `source = manual` en een audit-event met reden.

---

## 12. Teststrategie

### 12.1 Unit tests per regel

| Regel | Test |
|---|---|
| R-01 | Specifieke opgave wint van "alle uitjes" bij volle capaciteit |
| R-02 | Een opgave of reservering maakt iemand niet "niet nieuw" |
| R-03 | Garantie resteert over een periodegrens |
| R-04 | Alleen de laatste 12 maanden tellen; ouder bezoek blijft zichtbaar maar telt niet |
| R-05 | Minder vaak meegedaan = eerder geplaatst; vaak = later, niet uitgesloten |
| R-06 | Gelijke stand levert `tie_pending`, geen willekeurige keuze |
| R-07 | Groepsscore is het gemiddelde van de leden |
| R-08 | Groepje wordt niet gesplitst |
| R-09 | Reeksopgave krijgt één datum, met de meeste ruimte |
| R-10 | "Alleen" negeert het groepje |
| R-11 | Handmatige plaatsing blijft staan bij herberekenen |
| R-12 | Twee keer berekenen geeft dezelfde uitvoer en hash |
| R-13 | Elke toewijzing en afwijzing heeft een reason-code |
| R-14 | Voor de deadline weigert de applicatie te berekenen |
| R-15 | Mobiliteit verandert de uitkomst niet |
| R-16 | Bevestigen activeert de bellijst; proefmodus niet |

### 12.2 Property-based tests

- De som van toegewezen plekken per uitje is nooit groter dan de capaciteit, behalve bij een handmatige overschrijding.
- Een groepje is nooit gedeeltelijk ingedeeld.
- Een deelnemer is nooit twee keer in dezelfde reeks ingedeeld.
- Elke actieve opgave leidt tot precies één claim of is expliciet samengevoegd.
- De uitvoer is bij elke permutatie van de invoer precies hetzelfde (determinisme).
- Geen enkele uitleg bevat een veld dat niet in de invoer zat.

### 12.3 Gouden tests

Vaste invoer met een vaste, volledige uitvoer in `tests/fixtures/allocation/`. Bij elke wijziging aan de motor wordt de uitvoer vergeleken. Een bewuste wijziging vereist een nieuwe `algorithmVersion` en een update van de fixture met uitleg in de pull request.

### 12.4 Performance

- 500 deelnemers, 50 uitjes, 2.000 opgaven: berekening onder 1 seconde op de testomgeving.
- 1.000 deelnemers, 100 uitjes: onder 3 seconden.
- Geheugen blijft onder 256 MB.
- De motor doet geen database-aanroepen; de applicatie levert één invoerobject.

### 12.5 E2E

- Proefmodus aanzetten, voorstel berekenen, verschil bekijken, niets verzenden.
- Handmatig een plek toevoegen en opnieuw berekenen; de plek blijft.
- Gelijke stand oplossen en opnieuw berekenen.
- Capaciteit verhogen en de eerste reservist op de bellijst zien.
- "Kan niet" registreren en de volgende reservist bovenaan zien.

---

## 13. Open punten en vervolg

De motor wordt pas gebouwd als de opdrachtgever de volgende punten heeft bevestigd:

1. de exacte volgorde en weging in §4;
2. de garantie op basis van aanwezigheid of plaatsing (O-02);
3. de betekenis van "alle uitjes" (O-03);
4. het gedrag van een groepje dat niet past (O-04);
5. de wachtlijstdatum voor flexibele opgaven (O-05);
6. de presentatie bij meer gelijke kandidaten dan plekken (O-06);
7. de tie-break voor een groepje (O-07);
8. de peildatum (O-08);
9. de verhouding tussen een nieuwe specifieke opgave en een vaak-deelnemer met een specifieke opgave (O-09);
10. groepsleden met verschillende opgavevormen (O-10).

Tot die tijd worden de schermen, het datamodel en de tests voorbereid, maar blijft de motor achter een feature flag of buiten de build. In de code staat bij elk open punt `TODO(besluit): <vraag>`.

---

## 14. Definition of Done

- Alle bevestigde regels hebben minstens één unit-test met een leesbaar voorbeeld.
- De property-based tests en de gouden tests zijn groen.
- De motor is een pure functie zonder database, netwerk, klok of willekeur.
- De invoerhash is reproduceerbaar.
- De Nederlandse uitleg is door een vrijwilliger van 70 gelezen en begrepen.
- De proefmodus verstuurt niets en bevestigt niets.
- Het verschiloverzicht is per uitje en per persoon beschikbaar.
- De open punten zijn beantwoord of expliciet geblokkeerd; er is geen verborgen aanname in de code.
