# Importspecificatie Beheersysteem Stichting Diligence Almere

**Versie:** 1.1  
**Datum:** 3 november 2026  
**Status:** ontwerp; wacht op de echte bestanden van de stichting  
**Hoort bij:** [`ONTWIKKELPLAN.md`](ONTWIKKELPLAN.md), [`DATAMODEL.md`](DATAMODEL.md)

Dit document beschrijft hoe het systeem bestaande gegevens inleest: het programma, de deelnemers met bezoekgeschiedenis, de opgaven voor de proefmaand en de handmatige indeling. Uitgangspunt is: **nooit blind importeren**. Er is altijd een controle vooraf, een duidelijke foutmelding per rij, een alles-of-niets-transactie en een "Ongedaan maken".

> **Wat nog ontbreekt:** de echte bestanden. De publieke programma's op de website staan als JPEG-posters, niet als tabel. De bestaande deelnemersdatabase is nog niet beschikbaar. Deze specificatie beschrijft het eigen sjabloon en de adapterlaag; vóór M2 worden de echte bestanden opgevraagd en gecontroleerd.

---

## 1. Uitgangspunten

1. **Controle vooraf.** De medewerker ziet precies wat er wordt aangemaakt, hoeveel rijen fout zijn en wat de waarschuwingen zijn.
2. **Alles of niets bij het programma.** Bij bevestigen wordt de hele import in één transactie opgeslagen, of niets.
3. **Ongedaan maken.** Een import krijgt een batch-id. Zolang er geen afhankelijke gegevens zijn (opgaven, aanwezigheid, indeling), is de hele batch in één keer ongedaan te maken.
4. **Geen giswerk.** Bij twijfel wordt de rij niet stil aangepast, maar gemarkeerd als "beoordelen" of "fout", met uitleg in gewone taal.
5. **Geen echte data in test.** Testimports gebruiken verzonnen namen en bestanden.
6. **Geen persoonsgegevens in logs.** Foutmeldingen bevatten rijnummers, kolomnamen en foutcodes, geen namen of telefoonnummers.
7. **Veilig bestand.** Alleen `.xlsx` en `.csv`, geen macro's, maximale grootte 10 MB, maximaal 5.000 rijen per import.
8. **Toegang.** Importeren mag alleen met het recht `import.create`; de Admin en Beheerder hebben dat standaard, de Coördinator voor programma en opgaven als de opdrachtgever dat wil.

---

## 2. Bestandsformaten

| Formaat | Toegestaan | Toelichting |
|---|---|---|
| `.xlsx` | ja | Eerste werkblad, of een gekozen werkblad |
| `.csv` | ja | UTF-8 met of zonder BOM; scheidingsteken `;` of `,` wordt herkend |
| `.xls` (oud) | nee | Eerst opslaan als `.xlsx`; de UI legt dat uit |
| `.xlsm` | nee | Macro's worden geweigerd |
| `.numbers`, `.ods` | nee | Eerst exporteren naar `.xlsx` |

**Voertuigen:** die worden niet geïmporteerd. Een bevoegde medewerker voegt ze toe of wijzigt ze op het voertuigscherm (naam, kenteken, aantal plekken, opmerkingen). De programma-import bevat alleen de capaciteit van het uitje; de koppeling met voertuigen gebeurt daarna.

**CSV-afspraken:**

- UTF-8 met BOM heeft de voorkeur; ISO-8859-1 wordt herkend en gemeld.
- Scheidingsteken: puntkomma of komma; de parser detecteert het op basis van de kopregel.
- Decimalen: komma of punt; duizendtallen met punt worden ondersteund.
- Datums: `dd-mm-jjjj`, `d-m-jjjj`, `jjjj-mm-dd` en Excel-datumcellen.
- Geen formules uitvoeren; een cel die met `=`, `+`, `-` of `@` begint, wordt als tekst gelezen.
- Bij export worden zulke tekens voorafgegaan door een apostrof om CSV-injectie te voorkomen.

---

## 3. Programma-import

### 3.1 Doel

Het programma van een periode in één keer invoeren, in de vorm van het huidige programmabestand: maandkoppen, dagregels, tijden, omschrijvingen, prijzen, extra kosten, labels en capaciteit (3.11–3.15).

### 3.2 Sjabloon

De medewerker downloadt een leeg Excel-sjabloon met drie bladen:

1. **Uitleg** — korte tekst, één voorbeeld, wat wel en niet mag.
2. **Programma** — de invoertabel.
3. **Voorbeeld** — een ingevulde voorbeeldrij, duidelijk gemarkeerd als voorbeeld.

| Kolom | Verplicht | Voorbeeld | Toelichting |
|---|---|---|---|
| `Maand` | Nee, tenzij geen maandkop | `NOVEMBER` | Mag ook als maandkopregel in het bestand staan |
| `Dag` | Ja | `ma 02` | Weekdag en dagnummer; `02` alleen mag ook |
| `Tijd` | Ja | `10:30-14:30` | Begin- en eindtijd |
| `Omschrijving` | Ja | `Museum Beeld & Geluid` | |
| `Totaal` | Nee | `€ 12,50` | Prijs per persoon; leeg = 0 met waarschuwing |
| `Extra kosten` | Nee | `Lunch / consumptie` | Vrije tekst |
| `Labels` | Nee | `Nieuw, Uitgelicht` | Komma, puntkomma of slash |
| `Capaciteit` | Nee | `14` | Leeg = standaard van de periode (bijv. 14) |
| `Geschikt voor rollators` | Nee | `ja` | `ja`, `nee`, `minder geschikt`; leeg = ja |
| `Reeks` | Nee | `Pannenkoekhuis` | Zelfde waarde bundelt meerdere data |
| `Datum` | Nee | `02-11-2026` | Alleen als alternatief voor maand/dag; niet combineren |

**Ondersteunde aliassen:** `Prijs` voor `Totaal`, `Tijdstip` voor `Tijd`, `Wat` voor `Omschrijving`, `Plekken` voor `Capaciteit`, `Rollator` voor `Geschikt voor rollators`. De parser is niet hoofdlettergevoelig en negeert accenten in koppen.

### 3.3 Twee vormen

**Vorm A — maandkoppen (zoals het huidige programmabestand):**

```
NOVEMBER
ma 02 | 10:30-14:30 | Museum Beeld & Geluid | € 12,50 | Lunch | Nieuw | 14 | ja
do 05 | 10:30-14:30 | Restaurant Chapeau    | € 25,00 |       | Op herhaling | 7 | nee

DECEMBER
di 01 | 10:30-14:30 | Museum Beeld & Geluid | € 12,50 | Lunch | Nieuw | 14 | ja
```

Een rij met alleen een maandnaam (eventueel met jaartal) is een maandkop. De maand geldt tot de volgende maandkop. Een lege regel wordt genegeerd.

**Vorm B — platte tabel met een `Maand`-kolom per rij.** Beide vormen mogen niet door elkaar in één bestand, behalve dat een maandkop een lege `Maand`-kolom mag aanvullen.

### 3.4 Datum afleiden

1. Bepaal het jaartal uit de geselecteerde periode. Loopt de periode over een jaarwisseling, kies dan het jaar waarin de datum binnen de periode valt.
2. Staat er een jaartal in de maandkop, gebruik dat en controleer of het binnen de periode past.
3. Bepaal de maand uit de maandkop of de `Maand`-kolom.
4. Bepaal de dag uit `Dag` of `Datum`.
5. Bereken de volledige datum en controleer de weekdag als die is opgegeven.
6. Controleer of de datum binnen de periode valt; anders volgt een fout.

**Foutvoorbeelden:**

- "De maand november past niet bij de gekozen periode (januari–februari)."
- "De datum 31 november bestaat niet."
- "Er staat 'ma', maar 2 november is een dinsdag. Klopt de datum?"
- "Deze regel heeft geen tijd."

### 3.5 Tijd

- Ondersteund: `10:30-14:30`, `10.30 - 14.30`, `10:30 – 14:30`, `10:30 tot 14:30`.
- Ook aparte kolommen `Begintijd` en `Eindtijd`.
- De eindtijd moet na de begintijd liggen. Een uitje dat over middernacht loopt, wordt in versie 1 niet ondersteund en geeft een fout.
- Een tijd zonder minuten (`10-14`) wordt gelezen als `10:00-14:00`, met een waarschuwing.

### 3.6 Prijs en extra kosten

- `€ 12,50`, `12,50`, `12.50`, `12,50 €`, `12,-` worden allemaal ondersteund.
- Opgeslagen als eurocenten; nooit als kommagetal.
- Leeg: `0` met de waarschuwing "Geen prijs ingevuld; er wordt € 0,00 gebruikt."
- Negatieve bedragen zijn een fout.
- `Extra kosten` blijft tekst. Het systeem rekent in versie 1 geen entree of korting uit (Besluit 13).

### 3.7 Labels

| Invoer | Label |
|---|---|
| Nieuw | `new` |
| Op herhaling | `repeat` |
| Op veler verzoek | `popular` |
| Eenmalig | `one_time` |
| Uitgelicht | `featured` |

- Meerdere labels scheiden met komma, puntkomma of slash.
- Onbekend label: waarschuwing, label wordt niet opgeslagen; de medewerker kan het in de preview corrigeren of het na de import toevoegen.
- Een label mag niet dubbel voorkomen.

### 3.8 Capaciteit en geschiktheid

- Leeg: de standaardcapaciteit van de periode (instelling, standaard 14).
- Geldig: 1–100. Nul, negatief of tekst is een fout.
- Groter dan de som van de beschikbare voertuigen: waarschuwing, geen blokkade; de coördinator lost het op.
- Geschiktheid: `ja`, `nee`, `minder geschikt`, `rolstoel`, `rollator`. Leeg = geschikt. Alleen `nee` of `minder geschikt` zet `less_suitable_walkers = true`.

### 3.9 Reeksen

- Een gevulde `Reeks`-kolom bundelt rijen met dezelfde waarde binnen de periode.
- Zonder `Reeks` stelt het systeem een reeks voor bij een bijna gelijke omschrijving (trigram-similariteit >= 0,85), maar alleen als de medewerker dat in de preview bevestigt. Er wordt nooit automatisch gebundeld.
- Een reeks mag over twee maanden lopen, zoals op de website: "dinsdag 3 november en donderdag 3 december".
- De capaciteit mag per datum verschillen; de reeks heeft alleen een naam en een optionele standaardcapaciteit.

### 3.10 Fouten en waarschuwingen

| Code | Ernst | Melding in gewone taal |
|---|---|---|
| `MONTH_MISSING` | fout | "Deze regel heeft geen maand. Zet een maandkop boven de regels of vul de kolom Maand in." |
| `MONTH_INVALID` | fout | "De maand 'Novmber' bestaat niet. Bedoel je november?" |
| `MONTH_OUTSIDE_PERIOD` | fout | "November valt buiten de gekozen periode." |
| `DAY_MISSING` | fout | "Deze regel heeft geen dag." |
| `DAY_INVALID` | fout | "De dag '32' bestaat niet." |
| `WEEKDAY_MISMATCH` | fout | "Er staat maandag, maar 2 november is een dinsdag." |
| `DATE_OUTSIDE_PERIOD` | fout | "Deze datum valt buiten de periode." |
| `TIME_MISSING` | fout | "Deze regel heeft geen tijd." |
| `TIME_INVALID` | fout | "De tijd '10:30-9:30' klopt niet: de eindtijd ligt voor de begintijd." |
| `DESCRIPTION_MISSING` | fout | "Deze regel heeft geen omschrijving." |
| `PRICE_INVALID` | fout | "Het bedrag 'twaalf euro' kan niet worden gelezen." |
| `PRICE_EMPTY` | waarschuwing | "Geen prijs ingevuld; er wordt € 0,00 gebruikt." |
| `CAPACITY_INVALID` | fout | "De capaciteit moet een getal tussen 1 en 100 zijn." |
| `CAPACITY_HIGH` | waarschuwing | "De capaciteit is hoger dan de voertuigen samen aankunnen." |
| `LABEL_UNKNOWN` | waarschuwing | "Het label 'Extra' bestaat niet en wordt niet opgeslagen." |
| `DUPLICATE_ROW` | waarschuwing | "Deze datum en omschrijving lijken al in het bestand te staan." |
| `SERIES_SUGGESTED` | waarschuwing | "Deze omschrijving lijkt op een eerdere regel. Zijn dit dezelfde uitjes?" |
| `ROW_TOO_LONG` | fout | "Deze regel heeft te veel kolommen. Controleer de scheidingstekens." |

De UI toont de fout bij de rij en in een samenvatting. Een rij met een fout wordt niet opgeslagen. Bij het programma geldt: één fout blokkeert de hele import tot de fout is hersteld.

### 3.11 Controlescherm

Bovenaan staat: **"Dit worden 21 uitjes, klopt dat?"** Daaronder:

- het aantal uitjes, reeksen, fouten en waarschuwingen;
- de gekozen periode en het jaartal;
- een tabel per rij met datum, tijd, omschrijving, prijs, capaciteit, labels en status;
- fouten rood gemarkeerd met de melding;
- waarschuwingen oranje, met een knop "Toch doorgaan" waar dat veilig is;
- reeksvoorstellen met "Ja, dit is dezelfde reeks" en "Nee, losse uitjes";
- de standaardcapaciteit die wordt gebruikt;
- "Terug", "Opnieuw controleren" en "Definitief opslaan".

Na opslaan: "21 uitjes toegevoegd. Je kunt dit nog ongedaan maken." met een undo-knop.

### 3.12 Opslaan en ongedaan maken

- Eén transactie: reeksen, uitjes, labels en de batch.
- Elke rij verwijst naar het batch-id en de gemaakte entiteit.
- Undo is mogelijk zolang er geen opgave, aanwezigheid of indeling aan de uitjes hangt.
- Zijn er wel afhankelijkheden, dan blokkeert de undo en zegt: "Deze uitjes hebben al opgaven. Je kunt ze niet meer in één keer verwijderen. Je kunt ze wel op inactief zetten." Met een knop naar de betreffende uitjes.
- Undo schrijft een audit-event en laat de batch op `undone` staan; niets wordt hard verwijderd.

---

## 4. Deelnemersimport

### 4.1 Doel

De bestaande deelnemers en hun bezoekgeschiedenis overnemen, met een opschoonstap voor verouderde gegevens (13.6, 13.17).

### 4.2 Sjabloon

| Kolom | Verplicht | Voorbeeld | Toelichting |
|---|---|---|---|
| `Naam` | ja, tenzij voor- en achternaam apart | `Jan de Vries` | Wordt in de preview gesplitst; de medewerker kan corrigeren |
| `Voornaam` | alternatief | `Jan` | Heeft voorrang op `Naam` |
| `Tussenvoegsel` | nee | `de` | |
| `Achternaam` | alternatief | `Vries` | |
| `Telefoon 1` | aanbevolen | `06 12 34 56 78` | Meerdere telefoons mogen in aparte kolommen |
| `Telefoon 2` | nee | `036 123 45 67` | |
| `E-mail` | nee | `jan@example.nl` | Verzonnen adres in voorbeelden |
| `Contactvoorkeur` | nee | `telefoon` | `telefoon`, `e-mail`, `allebei`; standaard telefoon |
| `Straat` | nee | `Voorbeeldstraat` | |
| `Huisnummer` | nee | `12` | Als tekst, zodat `12a` kan |
| `Toevoeging` | nee | `a` | |
| `Postcode` | nee | `1332 AX` | Wordt genormaliseerd |
| `Plaats` | nee | `Almere` | |
| `Status` | nee | `actief` | `actief`, `gepauzeerd`, `gestopt`; standaard actief |
| `Einddatum` | verplicht bij gestopt | `01-06-2025` | |
| `Reden` | verplicht bij gestopt | `verhuisd` | |
| `Kaarten` | nee | `Museumkaart, VriendenLoterij` | Onbekende kaart: waarschuwing |
| `Rollator` | nee | `ja` | |
| `Rolstoel` | nee | `nee` | |
| `Hulp bij instappen` | nee | `ja` | |
| `Notitie` | nee | `Wil graag voorin zitten` | Wordt versleuteld |
| `Noodcontact naam` | nee | `Piet de Vries` | Wordt versleuteld |
| `Noodcontact telefoon` | nee | `06 98 76 54 32` | Wordt versleuteld |
| `Noodcontact relatie` | nee | `broer` | Wordt versleuteld |

**Kolomkoppeling:** als de koppen afwijken, toont de preview een scherm waarin de medewerker kolommen aan velden koppelt. Verplicht zijn een naam en minimaal één contactmethode (telefoon of e-mail), anders volgt een waarschuwing dat de deelnemer niet gebeld kan worden.

### 4.3 Normaliseren en valideren

- **Namen:** trimmen, dubbele spaties weg, tussenvoegsel herkennen. Geen namen verzinnen.
- **Telefoon:** spaties, streepjes en haakjes weg; `+31` naar `0`; alleen cijfers in de blinde index. Ongeldige lengte: waarschuwing.
- **E-mail:** lowercase, trimmen; eenvoudige syntaxiscontrole; geen e-mail = geen e-mail.
- **Postcode:** `1234AB` naar `1234 AB`; ongeldig: waarschuwing.
- **Status:** `actief`, `gepauzeerd`, `gestopt`. Bij `gestopt` zijn einddatum en reden verplicht. Ontbreken ze, dan wordt de rij **niet automatisch actief**; status wordt "beoordelen" en de medewerker vult ze aan. Dit voorkomt dat gestopte deelnemers weer actief worden (1.4).
- **Contactvoorkeur:** `e-mail` of `allebei` zonder e-mailadres is een waarschuwing; de voorkeur wordt niet stil naar telefoon gezet.
- **Kaarten:** splitsen op komma/puntkomma; onbekend type wordt niet aangemaakt, maar als waarschuwing getoond; de Beheerder kan het type toevoegen.
- **Mobiliteit:** ja/nee, leeg = nee. Dit zijn mogelijk gezondheidsgegevens; alleen tonen aan rollen die het recht hebben.
- **Datums:** Excel-datum, `dd-mm-jjjj`, `d-m-jjjj`, `jjjj-mm-dd`.

### 4.4 Duplicaten

Het systeem vergelijkt:

- telefoon (blinde index, genormaliseerd);
- e-mail (blinde index);
- naam + postcode;
- naam + geboortejaar? Niet opgeslagen; daarom naam + adres.

Bij een mogelijke duplicaat toont de preview: **"Bestaat Jan de Vries al? Bedoel je deze?"** met de bestaande gegevens. Keuzes:

- **Overslaan:** de rij wordt niet aangemaakt.
- **Samenvoegen:** lege velden worden aangevuld; bestaande waarden worden niet overschreven zonder bevestiging. Elke wijziging wordt geaudit.
- **Toch nieuw:** er wordt een nieuwe deelnemer aangemaakt, met een opmerking in de preview.

Zonder keuze wordt de rij niet opgeslagen. Er wordt nooit automatisch samengevoegd.

### 4.5 Bezoekgeschiedenis

Een apart werkblad of apart bestand:

| Kolom | Verplicht | Voorbeeld |
|---|---|---|
| `Naam` of `Telefoon` | ja | `Jan de Vries` |
| `Datum` | ja | `12-03-2026` |
| `Omschrijving` | nee | `Efteling` |

- De historicrij wordt gekoppeld aan de deelnemer uit dezelfde import of aan een bestaande deelnemer.
- Onbekende deelnemer: fout, met rijnummer; de medewerker kan de rij corrigeren.
- Datum in de toekomst: fout.
- Dubbele historie (zelfde deelnemer, datum, omschrijving): waarschuwing en overslaan.
- De geschiedenis telt mee voor "nieuw", "vaak" en "laatst", maar oude bezoeken blijven zichtbaar (Besluit 7).
- Historie kan als aparte batch ongedaan worden gemaakt.

### 4.6 Opschonen

Na de import toont het systeem een beoordelingslijst:

- deelnemers met status actief;
- zonder aanwezigheid of historisch bezoek in de laatste X maanden (instelbaar, standaard 24);
- of zonder enig bekend bezoek.

Per deelnemer: **actief houden**, **pauzeren** of **archiveren**. Nooit automatisch verwijderen (13.17). De lijst is filterbaar en exporteerbaar. Elke keuze wordt geaudit. De medewerker kan de lijst later opnieuw openen.

### 4.7 Opslaan en undo

- De preview toont het aantal nieuwe deelnemers, bijgewerkte deelnemers, overgeslagen rijen, historie en fouten.
- Rijen met een fout worden niet opgeslagen. De medewerker kan kiezen: **"Alleen de goede rijen opslaan"** of **"Eerst alles herstellen"**. Bij de tweede keuze wordt niets opgeslagen.
- De batch krijgt een id; undo is mogelijk zolang er geen opgaven, aanwezigheid of indeling aan hangen.
- Undo verwijdert de aangemaakte deelnemers niet hard; ze worden gearchiveerd of geanonimiseerd volgens de gekozen undo-strategie. De medewerker ziet vooraf wat er gebeurt.
- Samengevoegde deelnemers worden bij undo niet automatisch teruggedraaid als er al nieuwe gegevens aan hangen; dat wordt uitgelegd en vergt een handmatige keuze.

---

## 5. Opgavenimport

### 5.1 Doel

Tijdens de proefmaand de bestaande opgaven inladen, zodat niet alles dubbel hoeft te worden getypt (5.17).

### 5.2 Sjabloon

| Kolom | Verplicht | Voorbeeld |
|---|---|---|
| `Naam` of `Telefoon` | ja | `Jan de Vries` |
| `Uitje` | ja | `03-11-2026 Museum Beeld & Geluid` |
| `Soort` | ja | `specifiek`, `reeks`, `alle` |
| `Groep` | nee | `met groepje` of `alleen` |
| `Notitie` | nee | `Graag naast mevrouw Jansen` |

### 5.3 Koppelen

- De deelnemer wordt gekoppeld op naam of telefoon; bij meerdere matches volgt een keuze.
- Het uitje wordt gekoppeld op datum + (bijna) gelijke omschrijving. Bij twijfel toont de preview de kandidaten.
- `specifiek` vereist één datum; `reeks` vereist een reeks; `alle` geldt voor de hele periode.
- `met groepje` neemt het actieve groepje mee; `alleen` niet.
- Na de deadline is importeren alleen toegestaan met het recht `signup.import_after_deadline` en een reden; de import wordt geaudit.
- Een dubbele opgave wordt samengevoegd of als waarschuwing getoond.

### 5.4 Undo

Zolang er geen indeling naar de opgaven verwijst, is de batch ongedaan te maken. Daarna blokkeert de undo en legt uit welke indeling het betreft.

---

## 6. Handmatige indeling importeren (proefmodus)

### 6.1 Doel

De indeling die in werkelijkheid met de hand is gemaakt, naast het systeemvoorstel zetten (5.15, 5.16).

### 6.2 Sjabloon

| Kolom | Verplicht | Voorbeeld |
|---|---|---|
| `Naam` of `Telefoon` | ja | `Piet Jansen` |
| `Uitje` | ja | `03-11-2026 Efteling` |
| `Status` | ja | `ingedeeld`, `reserve`, `niet ingedeeld` |
| `Rang` | nee | `1` |
| `Notitie` | nee | `Handmatig toegevoegd` |

### 6.3 Verwerken

- De rijen worden als `allocation_run` met `kind = manual` en `phase = proposal` opgeslagen.
- Er wordt niets bevestigd en niets verstuurd.
- Het verschiloverzicht vergelijkt deze run met het systeemvoorstel per uitje en per persoon.
- Ongeldige rijen worden met uitleg geweigerd; de rest kan worden opgeslagen.
- Undo verwijdert de handmatige run; het systeemvoorstel blijft staan.

---

## 7. Export en print

| Export | Formaat | Inhoud |
|---|---|---|
| Programma | Excel | Zelfde kolommen als het sjabloon, plus binnenlandse datumnotatie |
| Programma | Print/PDF | Maandoverzicht in de huisstijl, met logo, datum, tijd, omschrijving, prijs en labels |
| Deelnemerslijst per uitje | Print/PDF | Naam, telefoon, groepje, kaarten, mobiliteit, busje, chauffeur, reservelijst |
| Bellijst | Print/PDF | Naam, telefoon, boodschap, status |
| Deelnemers | Excel/CSV | Alleen met het recht `participant.export`; elke export wordt gelogd |
| Wijzigingsoverzicht | Excel/CSV | Gefilterd; alleen met het recht `audit.export` |

- Bestandsnamen bevatten geen persoonsgegevens: bijvoorbeeld `programma-2026-11.xlsx`, niet de naam van een deelnemer.
- Bij export van vrije tekst wordt CSV-injectie voorkomen.
- Print heeft een witte achtergrond, zwarte tekst en het logo in zwart-rood.
- De printbare PDF wordt via de browser gemaakt; er is geen aparte PDF-dienst.

---

## 8. Privacy en beveiliging

- Importbestanden bevatten persoonsgegevens. Ze worden in het geheugen verwerkt of na de import van de tijdelijke opslag verwijderd.
- `import_row.raw` en `normalized` worden na de importtermijn opgeruimd.
- Foutmeldingen, logs en audits bevatten geen namen, telefoonnummers of e-mailadressen; alleen rijnummers, veldnamen en codes.
- Alleen bevoegde rollen mogen importeren en exporteren; elke actie wordt geaudit.
- Testimports gebruiken verzonnen data. Echte bestanden worden nooit in de testomgeving of in screenshots gebruikt.
- De upload wordt gecontroleerd op bestandstype en grootte; macro's worden geweigerd.
- Een geïmporteerd bestand wordt niet blijvend bewaard, tenzij de medewerker expliciet "bewaar bronbestand" kiest; dat is in versie 1 niet nodig.

---

## 9. Testgevallen

| Nr. | Situatie | Verwachting |
|---|---|---|
| T-01 | Maandkop NOVEMBER, periode nov–dec 2026 | Datum wordt 2026 |
| T-02 | Periode dec 2026–jan 2027, maandkop JANUARI | Jaartal 2027 |
| T-03 | Maandkop met verkeerd jaartal | Fout met uitleg |
| T-04 | `ma 02` terwijl 2 november dinsdag is | Fout `WEEKDAY_MISMATCH` |
| T-05 | Tijd `10:30-9:30` | Fout |
| T-06 | Prijs `€ 12,50`, `12.50`, `12,-` | Zelfde bedrag in centen |
| T-07 | Lege capaciteit | Standaardwaarde met waarschuwing |
| T-08 | Twee regels met bijna dezelfde omschrijving | Reeksvoorstel, geen automatische bundeling |
| T-09 | 21 geldige regels | Preview "21 uitjes"; opslaan in één transactie |
| T-10 | Eén fout in 21 regels | Niets opgeslagen; fout zichtbaar |
| T-11 | Undo direct na import | Alle uitjes weg, audit-event |
| T-12 | Undo met bestaande opgave | Geblokkeerd met uitleg en alternatief |
| T-13 | Deelnemer met status gestopt zonder einddatum | Rij op "beoordelen", niet actief |
| T-14 | Twee deelnemers met hetzelfde telefoonnummer | Duplicaatwaarschuwing, keuze |
| T-15 | Historie met onbekende naam | Fout met rijnummer |
| T-16 | CSV met puntkomma en decimalen met komma | Correct gelezen |
| T-17 | Formule in een cel | Als tekst gelezen, niet uitgevoerd |
| T-18 | Export van tekst met `=` | Geëscapet, geen formule |
| T-19 | 5.001 rijen | Geweigerd met uitleg |
| T-20 | `.xlsm` upload | Geweigerd |

---

## 10. Open punten

1. **Echte programmabestand:** welk Excel/CSV-bestand gebruikt de stichting nu? De website toont alleen JPEG-posters.
2. **Maandkoppen:** staat de maand als aparte regel, als kolom, of beide?
3. **Jaartal:** staat er een jaar in het bestand of moet het altijd uit de periode komen?
4. **Prijzen en extra kosten:** hoe verhouden "Totaal" en "Extra kosten" zich? (open punt D in `EISEN.md`)
5. **Labels:** blijft de lijst met vijf labels staan, of komen er eigen labels?
6. **Deelnemersexport:** welk systeem levert de export, welke kolommen en hoe ziet de bezoekgeschiedenis eruit? (punt F)
7. **Opschoontermijn:** na hoeveel maanden zonder bezoek komt iemand op de beoordelingslijst? (13.17)
8. **Kaarttypes:** alleen Museumkaart en VriendenLoterij, of ook BankGiro Loterij VIP?
9. **Toestemming e-mail:** mogen bestaande e-mailadressen direct worden gebruikt voor de uitslag, of is daar een aparte grondslag voor nodig?
10. **Capaciteit en voertuigen:** is de capaciteit inclusief chauffeur en begeleider, of alleen gasten? (zie datamodel)
11. **Groepjes in de opgavenimport:** staat er een groepje in het bestand, of moet dat uit de deelnemersgegevens komen?

---

## 11. Definition of Done

- Het sjabloon is door de opdrachtgever bekeken en goedgekeurd.
- De parser heeft tests voor alle fouten en waarschuwingen in §3.10.
- Een echte proefimport met het bestand van de stichting is uitgevoerd op de testomgeving.
- De preview, de transactie en de undo zijn end-to-end getest.
- De deelnemersimport is met verzonnen data getest, inclusief duplicaten, statussen en historie.
- De opgavenimport en de handmatige indeling zijn getest met de proefmodus.
- Er staan geen persoonsgegevens in logs, foutmeldingen of testdata.
- De open punten in §10 zijn beantwoord of als `TODO(besluit)` gemarkeerd.
