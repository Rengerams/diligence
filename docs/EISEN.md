# Programma van eisen – Beheersysteem Stichting Diligence Almere

Prioriteit volgens MoSCoW: **M** = moet in versie 1, **S** = zou erbij moeten, **C** = kan later, **W** = bewust nu niet.

Alles met een 🔎 is toegevoegd op basis van wat vergelijkbare software voor vrijwilligers- en seniorenplanning standaard biedt (o.a. VolunteerHub, HelperHelper, Better Impact, Roster Volunteers, GForce) en staat niet letterlijk in jullie eigen beschrijving.

---

## 1. Deelnemers (de 55-plussers, zonder login)

| # | Eis | Prio |
|---|-----|------|
| 1.1 | Deelnemer vastleggen: naam, telefoon (meerdere), woonadres, opmerkingen | M |
| 1.2 | Razendsnel zoeken op naam (ook half, ook typfouten) of telefoonnummer, al tijdens het typen resultaten | M |
| 1.3 | Bezoekgeschiedenis per uitje (wie is wanneer meegeweest), wordt automatisch gevuld na afronden van een uitje | M |
| 1.4 | Status: actief, tijdelijk gepauzeerd, gestopt (nooit hard verwijderen, wel archiveren). Bij "gestopt" een **einddatum en reden** (bijv. verhuisd, overleden, zelf gestopt), omdat de bestaande gegevens die niet hebben | M |
| 1.5 | 🔎 Mobiliteitskenmerken als vaste velden (rollator, rolstoel, hulp bij instappen), niet alleen vrije tekst, zodat vervoersplanning er later rekening mee kan houden | S |
| 1.6 | 🔎 Contactpersoon / noodcontact per deelnemer | S |
| 1.7 | 🔎 Duplicaatwaarschuwing bij aanmaken ("Bestaat Jan de Vries al? Bedoel je deze?") | S |
| 1.8 | Woonadres gestructureerd opslaan (straat, nummer, postcode, plaats) voor latere routeplanning | M |
| 1.9 | 🔎 AVG-functies: inzage-overzicht van alle gegevens van één persoon, verwijderen/anonimiseren op verzoek, bewaartermijn voor gestopte deelnemers | M |
| 1.10 | Per deelnemer vastleggen welke kaarten die heeft (Museumkaart, VriendenLoterij-kaart, eventueel andere; types instelbaar). Zichtbaar bij de deelnemer, bij de opgave en op de deelnemerslijst van het uitje, zodat de vrijwilliger weet wie entree moet betalen. Het systeem rekent in versie 1 geen bedragen uit | S |
| 1.11 | Per deelnemer de **contactvoorkeur** vastleggen: telefoon, e-mail of allebei (standaard telefoon), plus het e-mailadres als dat bekend is | M |

## 2. Groepjes

| # | Eis | Prio |
|---|-----|------|
| 2.1 | Deelnemers eenmalig koppelen tot groepje; koppeling blijft bestaan | M |
| 2.2 | Groepje wordt in opgave en indeling altijd als geheel behandeld | M |
| 2.3 | Een deelnemer zit in maximaal één groepje (te bevestigen, zie open vragen) | M |
| 2.4 | Groepje ontbinden of iemand eruit halen, met bevestiging en terugdraaien | M |
| 2.5 | Zichtbaar bij het opzoeken: "Jan zit in groepje met Piet en Anna" | M |

## 3. Periodes en uitjes

| # | Eis | Prio |
|---|-----|------|
| 3.1 | Periode aanmaken (standaard 2 maanden) met aanmelddeadline | M |
| 3.2 | Uitje toevoegen: datum, omschrijving, capaciteit (7 / 14 / 40 of vrij getal) | M |
| 3.3 | Uitjes uit vorige periode kopiëren naar nieuwe periode in één klik | M |
| 3.4 | Periode "publiceren" (opgave gaat open) en "sluiten" (deadline verstreken) | M |
| 3.5 | Capaciteit later nog aanpassen, ook na de indeling (triggert reservelijst, zie 7) | M |
| 3.6 | Uitje annuleren (alle deelnemers moeten gebeld worden: lijst met te bellen mensen) | M |
| 3.7 | 🔎 Kalenderweergave van alle uitjes in de periode, naast de lijstweergave | S |
| 3.8 | 🔎 Uitje afronden: aanwezigheid registreren (wie was er echt), voedt de bezoekgeschiedenis | M |
| 3.9 | Een uitje heeft: datum, begin- en eindtijd, omschrijving, prijs per persoon, extra kosten (tekst, bijv. "Lunch / Consumptie"), labels (Nieuw, Op herhaling, Op veler verzoek, Eenmalig, Uitgelicht), capaciteit en geschiktheid (bijv. "minder geschikt voor rollators") | M |
| 3.10 | Hetzelfde uitje op meerdere data koppelen als één reeks (voorbeeld uit het programma: Pannenkoekhuis De Smickel op 23 en 25 november) | M |
| 3.11 | **Programma in één keer inladen** uit Excel of CSV, in de vorm van het huidige programmabestand: dag en dagnummer onder een maandkop ("ma 02" onder NOVEMBER), tijd als "10:30-14:30", prijs met €-teken. Het systeem leidt de volledige datum af uit de maandkop en de periode | M |
| 3.12 | Vóór het opslaan een controlescherm ("Dit worden 21 uitjes, klopt dat?") met eventuele fouten per rij in gewone taal. Pas na bevestigen opslaan; de hele import is in één keer ongedaan te maken | M |
| 3.13 | Downloadbaar leeg sjabloon (Excel) met een voorbeeldrij, zodat de volgende periode op dezelfde manier wordt klaargezet | M |
| 3.14 | Het systeem stelt bij de import voor welke rijen hetzelfde uitje zijn (zelfde of bijna dezelfde omschrijving); de medewerker bevestigt | S |
| 3.15 | Is er geen capaciteit in het bestand, dan geldt een instelbare standaard (bijv. 14); aanpasbaar per uitje na de import | M |
| 3.16 | Programma exporteren of afdrukken in de vorm van het huidige overzicht (Excel of PDF), om op de website te zetten of op te sturen. Deelnemers krijgen daarmee nog steeds geen login | S |
| 3.17 | **Dagoverzicht en deelnemerslijst per uitje**, afdrukbaar en op telefoon: wie gaat mee (naam, telefoon, groepje, kaarten, mobiliteit), welk busje en welke chauffeur, wie op de reservelijst staat. Voor de chauffeur en voor de medewerker die die dag belt. Omdat er bijna dagelijks een uitje is, is dit de lijst die elke dag gebruikt wordt | S |

## 4. Telefonische opgave

| # | Eis | Prio |
|---|-----|------|
| 4.1 | Eén scherm: zoek persoon, zie alle uitjes van de lopende periode, vink aan | M |
| 4.2 | Per uitje kiezen: "specifiek dit uitje" of keuze "alle uitjes" | M |
| 4.3 | Duidelijk overzicht "dit heeft deze persoon al opgegeven" met mogelijkheid om te wijzigen | M |
| 4.4 | Groepje wordt automatisch meegenomen (opgave voor één lid geldt voor het groepje, met melding) | M |
| 4.5 | Opgave wordt na opslaan getoond als bevestigingsregel die de medewerker voor kan lezen aan de telefoon | M |
| 4.6 | Geen voordeel voor wie het eerst belt; tijdstip van opgave wordt wel vastgelegd voor de audit-log | M |
| 4.7 | Na deadline: opgave niet meer wijzigbaar, behalve door Coördinator/Beheerder met reden | M |
| 4.8 | 🔎 Notitie bij een opgave ("wil graag naast mevrouw Jansen zitten") | C |
| 4.9 | Het opgavescherm toont het programma in dezelfde volgorde en met dezelfde woorden als het programma dat de deelnemer voor zich heeft (dag, tijd, omschrijving, prijs), zodat medewerker en beller naar dezelfde lijst kijken | M |
| 4.10 | Is een uitje "minder geschikt voor rollators" en heeft de deelnemer een rollator, dan toont het scherm een duidelijke waarschuwing (geen blokkade) | S |

## 5. Eerlijke indeling

| # | Eis | Prio |
|---|-----|------|
| 5.1 | Indeling pas mogelijk ná de deadline | M |
| 5.2 | Regels: nieuwe deelnemers 2 uitjes gegarandeerd; specifieke opgave gaat voor "alles"; "alles" alleen bij ruimte; wie een uitje vaak deed gaat achteraan; groepjes alleen compleet | M |
| 5.3 | Volgorde en gewicht van de regels staat vast en is gedocumenteerd (zie open vragen) | M |
| 5.4 | Voorstel is **deterministisch**: zelfde invoer geeft altijd zelfde uitkomst | M |
| 5.5 | Bij elke plaatsing en elke afwijzing een uitleg in gewone taal ("Staat achteraan omdat Piet dit uitje 4x deed") | M |
| 5.6 | Coördinator kan handmatig verplaatsen, toevoegen, verwijderen; waarschuwing bij overschrijden capaciteit of splitsen groepje, maar geen blokkade | M |
| 5.7 | Handmatige wijzigingen worden gemarkeerd als "handmatig" in het voorstel en in de log | M |
| 5.8 | Voorstel kan opnieuw berekend worden zonder handmatige keuzes kwijt te raken (of expliciet wel resetten) | S |
| 5.9 | Bevestigen maakt de indeling definitief; daarna "bellijst": wie moet er gebeld worden over plaatsing of reserve | M |
| 5.10 | Overzicht per periode: hoeveel uitjes heeft iedereen gekregen (controle op eerlijkheid) | S |
| 5.11 | Na het bevestigen van de indeling: heeft een deelnemer een e-mailadres, dan stuurt het systeem altijd automatisch een bevestiging met de uitslag (mag mee / reservelijst / niet ingedeeld) | M |
| 5.12 | Deelnemers zonder e-mailadres, of met telefoon als voorkeur, komen op de **bellijst**; wie e-mail én telefoon wil, krijgt allebei. De meeste deelnemers worden gebeld, dus de bellijst is de hoofdroute | M |
| 5.13 | De bellijst toont per persoon naam, telefoonnummer, de boodschap om door te geven en de status (nog te bellen / gebeld / niet bereikt), met één klik op "gebeld" | M |
| 5.14 | E-mails zijn in gewone taal, bevatten geen gevoelige gegevens (geen mobiliteit of opmerkingen), hebben een duidelijke afzender en een uitleg hoe je je afmeldt voor e-mail; elke verzonden e-mail staat in het wijzigingsoverzicht | M |
| 5.15 | **Proefmodus (naast elkaar draaien):** de coördinator kan het systeemvoorstel laten berekenen zonder dat het iets bevestigt of iemand bericht stuurt, en daarnaast de indeling invoeren die in werkelijkheid met de hand is gemaakt | M |
| 5.16 | **Verschillenoverzicht:** per uitje en per persoon waar het systeemvoorstel en de handmatige indeling verschillen, met de uitleg van het systeem erbij ("systeem plaatst Piet niet: 4x geweest, handmatig wel geplaatst"), plus een overzicht van hoe vaak iedereen is meegeweest. Zo is te zien waar het systeem anders kiest en of dat eerlijker is | M |
| 5.17 | Opgaven in één keer inladen uit Excel of CSV, zodat tijdens de proefperiode niet alles dubbel getypt hoeft te worden | S |

## 6. Vervoer

| # | Eis | Prio |
|---|-----|------|
| 6.1 | Voertuigen als eigen objecten: busje 1 (7), busje 2 (7), touringcar (40) | M |
| 6.2 | Capaciteit van uitje bepaalt automatisch welke voertuigen gekoppeld worden | M |
| 6.3 | Handmatig voertuig toevoegen aan een uitje (touringcar) en capaciteit past mee | M |
| 6.4 | Voertuig kan niet dubbel geboekt worden op dezelfde dag | M |
| 6.5 | Chauffeur koppelen aan uitje en voertuig; waarschuwing als er geen chauffeur is | M |
| 6.6 | Deelnemers per voertuig verdelen (wie rijdt in welk busje), handmatig aanpasbaar, groepjes bij elkaar | S |
| 6.7 | Woonadres per deelnemer beschikbaar voor latere routemodule | C |
| 6.8 | Voertuigbeheer: kilometerstanden, onderhoud, schade | W |
| 6.9 | Ophaalroute berekenen | W |
| 6.10 | Chauffeurs geven hun beschikbaarheid door in het systeem ("ik kan op deze dagen"), zodat de coördinator ziet wie kan rijden. Nu geven chauffeurs dit op buiten het systeem; in versie 1 wijst de coördinator toe | C |

## 7. Reservelijst

| # | Eis | Prio |
|---|-----|------|
| 7.1 | Wie niet past komt op reservelijst van dat uitje, in volgorde van eerlijkheid | M |
| 7.2 | Bij afzegging of extra capaciteit: het systeem zet de eerste reservist (of groepje dat past) bovenaan een bellijst | M |
| 7.3 | Medewerker belt, registreert "komt mee" / "kan niet" / "niet bereikt"; bij "kan niet" schuift de volgende op | M |
| 7.4 | Plek blijft "in afwachting" tot de reservist bevestigd heeft; geen automatisch plaatsen zonder bevestiging | M |
| 7.5 | 🔎 Coördinator kan de volgorde van de reservelijst handmatig aanpassen | M |
| 7.6 | Let op: deelnemers hebben geen login, dus "automatisch vragen" betekent hier: een taak op de bellijst van de medewerker. Automatisch sms'en is optioneel en later | S |

## 8. Digitale kostendeclaratie

*Module Chauffeurskosten en Kas: niet in de eerste bouwronde (Besluit 19), wel als module voorbereid.*

| # | Eis | Prio |
|---|-----|------|
| 8.1 | Chauffeur logt in op telefoon, ziet alleen zijn eigen uitjes | M |
| 8.2 | Per uitje kosten invoeren: bedrag, soort (drinken, parkeren, brandstof, overig), korte omschrijving | M |
| 8.3 | 🔎 Foto van bonnetje toevoegen (camera van de telefoon) | S |
| 8.4 | Kosten blijven gekoppeld aan uitje en voertuig voor nacalculatie | M |
| 8.5 | Status: ingediend, goedgekeurd, uitbetaald; wie keurt goed en wanneer is zichtbaar | M |
| 8.6 | Overzicht per periode / per uitje voor Beheerder, export naar Excel/CSV | M |
| 8.7 | Chauffeur kan een fout herstellen zolang het niet is goedgekeurd | M |
| 8.8 | Werkt goed op een telefoon met slecht bereik: niets kwijtraken bij haperende verbinding | S |
| 8.9 | Standaardrol **Penningmeester**: ziet alle declaraties en kasgegevens, controleert en keurt goed, en haalt het maandoverzicht op. Heeft geen toegang tot deelnemersgegevens die hij daarvoor niet nodig heeft | M |
| 8.10 | **Maandoverzicht voor de penningmeester**: alle kosten en ontvangen contant geld per uitje en per maand, afdrukbaar en als Excel/CSV, zodat er niets meer overgetikt hoeft te worden | M |
| 8.11 | **Kasregistratie op het uitje**: de chauffeur legt digitaal vast wat er contant is ontvangen, in plaats van op het papieren formulier. *Welke gegevens precies (totaalbedrag of per deelnemer) is te verifiëren aan de hand van het huidige formulier, zie open punt D* | S |
| 8.12 | *Module Kas.* **Kasafsluiting per uitje**: verwacht bedrag, geteld bedrag, afgerond verschil en wie heeft geteld, vastgelegd nadat het busje is ingeleverd | S |
| 8.13 | *Module Kas.* **Storting vastleggen**: datum en bedrag van elke storting | S |
| 8.14 | *Module Kas.* **Saldo contant geld** op kantoor volgens de administratie, met een waarschuwing boven een door jullie instelbare grens (bijv. € 1.000) | S |

## 9. Gebruikers, rollen, rechten

| # | Eis | Prio |
|---|-----|------|
| 9.1 | Accounts worden in het systeem aangemaakt door Beheerder/Admin | M |
| 9.2 | Standaardrollen: Admin, Beheerder, Coördinator, Chauffeur, Penningmeester | M |
| 9.3 | Eigen rollen aanmaken en per rol rechten instellen (per onderdeel én per handeling: zien / aanmaken / wijzigen / verwijderen) | M |
| 9.4 | Beveiligde login; tweestapsverificatie voor Admin en Beheerder | M |
| 9.5 | 🔎 Wachtwoord vergeten werkt zonder hulp (voor niet-digitale vrijwilligers), plus eenvoudige inlogmethode (bijv. e-mailcode of lange wachtwoordzin) | M |
| 9.6 | Account uitschakelen in plaats van verwijderen, zodat de audit-log klopt | M |
| 9.7 | Alleen bevoegde rollen zien persoonsgegevens; chauffeur ziet alleen wat nodig is voor zijn eigen uitjes | M |
| 9.8 | Automatisch uitloggen na inactiviteit, maar niet zo agressief dat een bellende medewerker midden in een gesprek eruit ligt | M |

## 10. Wijzigingsoverzicht (audit-log)

| # | Eis | Prio |
|---|-----|------|
| 10.1 | Elke wijziging: wie, wanneer, wat, oude en nieuwe waarde | M |
| 10.2 | Log is niet te wijzigen of te verwijderen, ook niet door Admin | M |
| 10.3 | Filteren op persoon, medewerker, uitje, datum | M |
| 10.4 | Ook inzage in persoonsgegevens wordt vastgelegd (AVG) | S |
| 10.5 | In gewone taal ("Els heeft Jan de Vries afgemeld voor Efteling op 3 maart") | M |

## 11. Hulp en AI-assistent

| # | Eis | Prio |
|---|-----|------|
| 11.1 | Hulppagina's in gewone taal, per scherm bereikbaar via zichtbare knop "Hulp" | M |
| 11.2 | Korte stappenplannen met schermafbeeldingen voor de vijf à zes hoofdtaken | M |
| 11.3 | AI-assistent staat standaard uit, aan te zetten door Beheerder | M |
| 11.4 | Assistent beantwoordt alleen vragen over het programma en krijgt **geen** persoonsgegevens te zien | M |

## 12. Gebruiksvriendelijkheid (geldt voor elk scherm)

| # | Eis | Prio |
|---|-----|------|
| 12.1 | Grote knoppen, grote tekst, hoog contrast, WCAG 2.2 AA als ondergrens | M |
| 12.2 | Alle knoppen met tekst, geen losse iconen | M |
| 12.3 | Gewone Nederlandse taal, geen vakjargon, geen Engelse termen | M |
| 12.4 | Op elk scherm staat bovenaan wat de volgende stap is | M |
| 12.5 | Na elke actie een duidelijke bevestiging; elke actie heeft een "Ongedaan maken" | M |
| 12.6 | Gevaarlijke acties (verwijderen, indeling bevestigen) vragen om bevestiging met uitleg van het gevolg | M |
| 12.7 | Lege schermen leggen uit wat je nu kunt doen | M |
| 12.8 | Tablet, laptop en telefoon; geen horizontaal scrollen | M |
| 12.9 | Het eerste scherm na inloggen toont de taak van het moment (opgave invoeren tijdens opgaveperiode, indeling bekijken na deadline) | M |
| 12.10 | Concept wordt bewaard als de pagina per ongeluk sluit | S |

## 13. Techniek, beveiliging, beheer

| # | Eis | Prio |
|---|-----|------|
| 13.1 | Webapp in de browser, geen installatie | M |
| 13.2 | Data en hosting binnen de EU, verwerkersovereenkomst met hostingpartij | M |
| 13.3 | Versleuteld transport (HTTPS) en versleutelde opslag van gevoelige velden | M |
| 13.4 | 🔎 Automatische dagelijkse back-up met geteste terugzetprocedure | M |
| 13.5 | 🔎 Testomgeving met nepdata; echte persoonsgegevens nooit in test | M |
| 13.6 | 🔎 Import van bestaande deelnemerslijst (Excel/CSV) met controle vooraf en van de bezoekgeschiedenis van de laatste 12 maanden (nodig voor een eerlijke indeling, zie Besluit 18) | M |
| 13.17 | **Opschonen bij de import:** een lijst van deelnemers die al lang niet zijn meegeweest (instelbaar, bijv. 24 maanden, of zonder bekend bezoek) om te beoordelen: actief houden, pauzeren of archiveren. Nooit automatisch verwijderen | M |
| 13.7 | 🔎 Export van gegevens (Excel/CSV) voor Beheerder | S |
| 13.8 | 🔎 Rapportages: deelname per uitje, per deelnemer, bezettingsgraad, kosten per uitje | S |
| 13.9 | Privacyverklaring en verwerkingsregister (documenten, geen code) aanwezig voor livegang | M |

## 14. Modules (aan en uit te zetten)

| # | Eis | Prio |
|---|-----|------|
| 14.1 | De Admin kan per module zetten of die aan of uit staat, met per module een uitleg in gewone taal wat het doet en wat er verandert | M |
| 14.2 | **Kern** staat altijd aan en kan niet uit: deelnemers, groepjes, uitjes en periodes, opgave, indeling, reservelijst, accounts en rollen, wijzigingsoverzicht | M |
| 14.3 | **Optionele modules in versie 1:** Chauffeurskosten (sectie 8), Kas (8.12 t/m 8.14) en AI-assistent (sectie 11). Het systeem is zo gebouwd dat later andere modules kunnen aansluiten (routeplanning, voertuigbeheer) | M |
| 14.4 | Staat een module uit, dan zijn de bijbehorende menu's, schermen en rechten onzichtbaar en niet bereikbaar; de rest van het systeem werkt volledig. De chauffeur ziet dan alleen zijn uitjes en deelnemerslijsten | M |
| 14.5 | Aanzetten of uitzetten kan op elk moment zonder gegevensverlies; reeds ingevoerde gegevens van de module blijven bewaard | M |
| 14.6 | De module Kas kan alleen aan als Chauffeurskosten aan staat, want ze leunt op wat de chauffeur invoert. *Aanname, te bevestigen* | S |
| 14.7 | Elke wijziging van een module wordt vastgelegd in het wijzigingsoverzicht | M |

## 15. Invoering en draagvlak (het blijft vrijwilligerswerk)

| # | Eis | Prio |
|---|-----|------|
| 15.1 | Op elk scherm een zichtbare knop "Iets onduidelijk of werkt het niet goed? Vertel het ons", waarmee een vrijwilliger in een paar woorden feedback geeft; het systeem onthoudt op welk scherm hij zat | M |
| 15.2 | Overzicht van alle feedback voor de Beheerder (nieuw, in behandeling, afgehandeld), zodat zichtbaar is dat er iets mee gebeurt | S |
| 15.3 | **Uitrol in stappen:** eerst een kleine groep vrijwilligers die het systeem naast de oude werkwijze gebruikt, en pas daarna iedereen. Dit is een afspraak, geen software; de testomgeving (13.5) en de modules (sectie 14) maken het mogelijk | M |
| 15.4 | Elke grote functie (telefonische opgave, indeling bekijken, bellijst, kostendeclaratie) wordt vóór livegang door echte vrijwilligers uitgeprobeerd en op basis daarvan aangepast | M |
| 15.5 | Bij een verandering in het programma een korte uitleg "Wat is er nieuw" in gewone taal, die de gebruiker kan wegklikken | C |

---

## Besluiten (vastgelegd door opdrachtgever)

1. **Specifieke opgave gaat voor "alles".** Een nieuwe deelnemer die "alles" opgaf, gaat niet voor op iemand die specifiek dat uitje opgaf. De garantie van 2 uitjes voor nieuwe deelnemers geldt over de hele periode, niet per uitje: het systeem zoekt voor hen plekken bij uitjes waar ruimte is.
2. **De coördinator heeft altijd het laatste woord.** Het systeem doet een eerlijk voorstel met uitleg, maar de coördinator kan elke plaatsing handmatig aanpassen, ook na bevestigen. Het systeem waarschuwt, maar blokkeert nooit. Elke handmatige wijziging komt met reden in het wijzigingsoverzicht.
3. **Het systeem is een hulpmiddel, geen beslisser.** Vandaag gaat het handmatig en niet altijd eerlijk; het doel is eerlijker en uitlegbaar, zonder de vrijheid van de coördinator weg te nemen.

4. **Nieuw = nog nooit meegeweest.** Een deelnemer is nieuw zolang er geen aanwezigheid bij een uitje is geregistreerd. Een plek op de reservelijst of een opgave zonder deelname telt niet als meegeweest.

5. **Duur van de garantie van 2 uitjes.** De garantie geldt in de periode waarin iemand zich voor het eerst opgeeft, mits er ruimte is bij de uitjes waarvoor die persoon is opgegeven. Heeft iemand na het eerste uitje nog geen tweede gehad, dan blijft de garantie staan tot dat tweede uitje er is, ook in een volgende periode. Wie door te weinig ruimte niet aan 2 uitjes komt, krijgt in de volgende periode voorrang. De coördinator kan hier altijd een uitzondering op maken.

6. **"Vaak geweest" telt in totaal**, over alle uitjes samen, niet per soort uitje. Er hoeft dus geen soort of vaste naam per uitje bijgehouden te worden. **Achteraan betekent lagere voorrang, nooit uitsluiting:** is er na het plaatsen van iedereen met voorrang nog ruimte, dan mag ook wie al vaak is meegeweest mee.

7. **Terugkijkperiode: 12 maanden.** Alleen deelnames van de laatste 12 maanden tellen mee bij "vaak geweest". Oudere deelnames tellen niet meer mee, maar blijven wel in de bezoekgeschiedenis staan. De termijn is instelbaar door de Beheerder. Let op: dit is iets anders dan "nieuw" (Besluit 4): wie ooit is meegeweest, is nooit meer nieuw.

8. **Gelijke stand: wie het langst niet is meegeweest gaat voor.** Is ook dat gelijk, dan **beslist de coördinator handmatig** (geen loting). Het systeem markeert zo'n plek als "gelijke stand: coördinator beslist" en toont de betrokken personen naast elkaar, met de uitleg waarom ze gelijk staan.

9. **Score van een groepje = gemiddelde van de leden** (op "hoe vaak meegeweest in de laatste 12 maanden"). Groepjes geven zich vaak al bij het begin als groepje op; het systeem neemt altijd het hele groepje mee.
10. **Herhaalde uitjes en zoveel mogelijk mensen mee.** Hetzelfde uitje wordt soms meerdere keren op verschillende data gegeven (bijv. 4x). Sommige deelnemers geven zich op voor alle data van dat uitje; voor hen maakt de datum niet uit. Anderen geven zich voor één specifieke datum op. Het systeem moet bij het plannen proberen **zoveel mogelijk mensen mee te laten gaan**: flexibele deelnemers worden bij voorkeur geplaatst op data waar de mensen met een vaste datum ze niet in de weg zitten. **Bevestigd:** wie zich voor alle data van een uitje opgeeft, wil daar maar **één keer** heen; het systeem kiest de datum waar de meeste ruimte is. Gevolg voor het ontwerp: een uitje kan meerdere data hebben (een "reeks"), en de indeling is meer dan een simpele volgorde van voorrang: ze moet over alle data heen rekenen.

11. **Maximaal één groepje per persoon, maar altijd los op te geven.** Iemand zit in hooguit één groepje. Wie in een groepje zit, mag zich per uitje ook alleen opgeven ("deze keer zonder het groepje"). Dan telt die opgave als individuele opgave en wordt het groepje niet meegenomen. Bij de telefonische opgave is dit een duidelijke keuze op het scherm: "Met groepje" of "Alleen". *Aanvulling op eis 4.4: het groepje wordt standaard meegenomen, tenzij de medewerker "Alleen" kiest.*

12. **Reservelijst: gewoon de lijst afbellen tot iemand kan.** Afzeggingen komen vaak laat, en reservisten hebben dan zelf vaak al andere plannen. Zegt een reservist nee, dan wordt de volgende gebeld; dat heeft **geen negatief effect** op de eerlijkheidsscore. De bellijst moet daarom snel en handig zijn: per reservist één knop voor "komt mee", "kan niet" en "niet bereikt", waarna automatisch de volgende bovenaan komt. **Bevestigd:** wie nee zegt, blijft op de reservelijst voor andere uitjes; voor dat uitje gaat de volgende op. De coördinator kan altijd handmatig aanpassen.

13. **Kortingskaarten.** Entree van musea is gratis of goedkoper met een **Museumkaart (MK)** of een **VriendenLoterij-kaart (VL)**; wie geen kaart heeft, betaalt de entree zelf, en dat staat bij het uitje in het programma. Eten en drinken is voor eigen rekening. Het systeem legt per deelnemer vast welke kaart(en) die heeft en toont dat bij de opgave en op de deelnemerslijst, maar rekent in versie 1 geen entreebedragen uit. De kolom "Extra kosten" uit het programma wordt overgenomen als tekst. De lijst met kaarttypes is instelbaar door de Beheerder (standaard Museumkaart en VriendenLoterij; in de toelichting van de stichting wordt ook de BankGiro Loterij VIP-kaart genoemd, dat kan als extra type worden toegevoegd).

14. **Hoe deelnemers de uitslag horen.** Dat hangt af van de voorkeur van de deelnemer: telefoon of e-mail. Is er een e-mailadres bekend, dan stuurt het systeem altijd een bevestiging; daarnaast wordt gebeld als de deelnemer dat wil. De meeste deelnemers worden gebeld. Het systeem legt de contactvoorkeur per deelnemer vast, maakt een bellijst en verstuurt de e-mails. Hiermee is e-mail onderdeel van versie 1 (alleen voor wie een e-mailadres heeft).

15. **Geld en kosten.** Deelnemers betalen contant. De chauffeur houdt dat nu bij op een papieren formulier en vult daar ook zijn onkosten in; de penningmeester tikt dat elke maand met de hand over. Doel: de chauffeur zet het direct digitaal in het systeem, zodat de penningmeester niets meer hoeft over te tikken. De penningmeester is de standaardrol die controleert en goedkeurt (antwoord op open punt C). Online betalen door deelnemers valt buiten versie 1.

16. **Kas en chauffeurskosten als modules.** De kasafsluiting, het storten en het saldo contant geld ("zou moeten") worden als aparte module gebouwd. Ook de digitale chauffeurskosten zijn een module die in het begin **uit** kan blijven, zodat de stichting nog op de oude manier (papier, penningmeester tikt over) kan werken zolang de overstap nog tijd en acceptatie vraagt. De rest van het systeem (opgave, indeling, reservelijst) werkt zonder die modules. Zie sectie 14.

17. **Vrijwilligers staan centraal.** Het blijft vrijwilligerswerk en het moet leuk blijven. Het systeem mag voor niemand meer werk of minder plezier opleveren dan de huidige manier van werken; de mening van de vrijwilligers telt mee bij elke grote keuze. Daarom: uitrol in stappen, uitproberen met echte vrijwilligers, een feedbackknop op elk scherm, en modules die uit kunnen blijven zolang men er nog niet aan toe is (sectie 15 en 14).

18. **Eerst een proefmaand naast elkaar, beginnend met de indeling.** Het systeem draait ongeveer een maand naast de huidige werkwijze, om te zien waar het systeem en de handmatige indeling verschillen. Er wordt in die maand nog niets automatisch bevestigd of verstuurd. Gevolg voor de bouwvolgorde: eerst deelnemers (met import), uitjes en programma (met import), opgave, en dan de indeling met proefmodus en verschillenoverzicht. **Risico:** zonder de bezoekgeschiedenis van de laatste 12 maanden lijkt iedereen nieuw of onervaren en kan het systeem niet eerlijk rekenen; die gegevens moeten dus mee in de eerste import.

19. **Prioriteit: eerst de kern, daarna geld.** De modules Chauffeurskosten en Kas zijn minder belangrijk voor nu en staan op hold. De eerste bouwronde is: deelnemers (met import en opschonen), uitjes en programma (met import), opgave, indeling met proefmodus en verschillenoverzicht, reservelijst en bellijst. Het papieren chauffeursformulier en het Excel-bestand van de penningmeester zijn dus niet meer nodig om te beginnen.
20. **Bestuurskeuzes.** Vragen over wie modules aan en uit zet, het saldo-grensbedrag, welke e-mails er verstuurd worden en wie de proefmaand test, vallen buiten de scope van de opdrachtgever. Standaard: alleen de Admin zet modules aan of uit; de uitslag per e-mail is "moet", opgavebevestiging en herinnering zijn "zou moeten". Dit zijn voorstellen en niet bevestigd.
21. **Rolstoelen en rollators geven geen beperking op de plekken.** Rolstoelen komen niet echt voor en rollators leggen geen beperking op. De indeling rekent dus niet met mobiliteit. Het systeem legt mobiliteit wel vast en toont alleen een waarschuwing als iemand met een rollator zich opgeeft voor een uitje dat "minder geschikt voor rollators" is (eis 4.10).

## Open punten

*De oorspronkelijke open vragen zijn beantwoord, zie de Besluiten hierboven.*

**D. Geld en entree.** "Totaal" in het programma is het bedrag per persoon; deelnemers betalen alleen contant op de dag zelf (Besluit 15). Nog uitzoeken: hoe verhoudt de entree (kolom "Extra kosten") zich tot "Totaal", en wordt die ook contant op de dag betaald? Chauffeurs declareren drinken en parkeergeld; de busjes hebben een tankpas, dus brandstof wordt niet gedeclareerd. Een maximumbedrag is niet genoemd. Het papieren formulier volgt later; dit hoort bij de modules die later komen (Besluit 19).

**E. Chauffeurs.** Huidig: chauffeurs geven op wanneer ze beschikbaar zijn; is er niemand beschikbaar, dan belt de coördinator rond. Versie 1: de coördinator wijst toe en het systeem waarschuwt bij een uitje zonder chauffeur. Later: beschikbaarheid in het systeem (eis 6.10). Nog uitzoeken: hoe geven chauffeurs dat nu door (telefoon, app, mail)?

**F. Bestaande database overnemen.** Deelnemers en hun bezoekgeschiedenis staan in een bestaande database. De gegevens zijn vervuild: er staan geen einddatums bij mensen die zijn gestopt, dus iedereen lijkt actief. Aanpak: import met opschoonstap (eis 13.17) en einddatum/reden bij status "gestopt" (eis 1.4). Nog uitzoeken: welk programma is dit, kan het geëxporteerd worden (Excel/CSV), wie beheert het, hoeveel deelnemers, welke velden staan erin?

---

## Uitzoeklijst (te verifiëren, nog niet bevestigd)

1. Bestaande database: export (Excel/CSV) is volgens de opdrachtgever waarschijnlijk mogelijk, nog te controleren. Welk programma is het, wie beheert het, hoeveel deelnemers staan erin en welke kolommen heeft de export? (punt F)
2. Welke afspraak voor het opschonen: na hoeveel maanden zonder bezoek komt iemand op de beoordelingslijst? (eis 13.17)
3. Hoe verhoudt de entree zich tot het bedrag onder "Totaal", en wordt die ook contant op de dag betaald? (punt D)
4. Hoe geven chauffeurs nu hun beschikbaarheid door? (punt E)
5. Is de BankGiro Loterij VIP-kaart ook een kaarttype dat bij deelnemers voorkomt? (Besluit 13)
6. Is er een maximumbedrag voor chauffeurskosten? (later, bij de module)
7. Bestuurskeuzes (Besluit 20): wie zet modules aan/uit, welke e-mails, grensbedrag saldo, wie test de proefmaand.
8. Mag de module Kas alleen aan als Chauffeurskosten aan staat? (eis 14.6)
9. Foto van het papieren chauffeursformulier en het Excel-bestand van de penningmeester (on hold, bij de modules later).
