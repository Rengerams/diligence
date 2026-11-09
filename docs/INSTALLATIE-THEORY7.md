# Installatie op een eigen server (Theory7 VPS)

Deze handleiding zet de Diligence-app stap voor stap op een eigen server bij
Theory7, zodat je hem op **je eigen subdomein** kunt testen. Alles wat je nodig
hebt staat erin: server bestellen, DNS, code plaatsen, HTTPS, inloggen, back-ups
en problemen oplossen.

> **Over het adres.** Je test op een subdomein, bijvoorbeeld
> `app.jouwdomein.nl`. Dat is in deze handleiding het voorbeeldadres; vervang het
> overal door het subdomein dat je aanvraagt. Je huidige website blijft gewoon
> staan en daar hoef je niets aan te veranderen.

> **Eerst dit, want dit is de kern van je vraag.** Deze app is **geen losse
> website met een aparte database**. Het is één Node.js-programma dat zelf de
> pagina's maakt én de database bijhoudt. De database is een bestand (SQLite) dat
> naast de app staat. Er is dus geen MySQL-database, geen losse API en geen aparte
> frontend-server. Daarom past de app niet op gedeelde webhosting en past hij wél
> op een VPS met Docker.

---

## 1. Kan het op mijn Theory7-pakket?

| Soort hosting | Kan de app hierop? | Waarom |
|---|---|---|
| Gedeelde webhosting (Mini t/m Ultimate) | **Nee** | Daar draait alleen PHP in een LiteSpeed-webserver. Een Node.js-app moet als langdurig proces blijven draaien op een eigen poort, met een eigen databasebestand. Dat kan op shared hosting niet. Theory7 schrijft dit ook zelf in hun kennisbank. |
| **VPS (Rebel V4 of groter)** | **Ja** | Je hebt root, je eigen poorten 80/443 en je kunt Docker draaien. Dit is de route in deze handleiding. |
| Managed VPS (vanaf € 47,85) | Ja | Zelfde resultaat, maar Theory7 beheert de server. Vraag bij de bestelling om Docker en Ubuntu 24.04. |

Advies: **Rebel V4 unmanaged, € 9,95 per maand, Ubuntu 24.04**. Dat is ruim
genoeg (4 CPU, 4 GB RAM, 100 GB SSD) voor deze app en voor testgebruik met een
handvol vrijwilligers.

Zet de app op een **eigen subdomein** (bijvoorbeeld `app.jouwdomein.nl`). Zo blijft
je huidige website bereikbaar terwijl je test. Je hoeft aan die website niets te
veranderen.

---

## 2. Wat je nodig hebt

- Een Theory7-account met een VPS (Rebel V4, unmanaged) en Ubuntu 24.04.
- Een gekozen subdomeinnaam, bijvoorbeeld `app`, `beheer` of `diligence`. Je
  maakt hem in stap 2 aan bij de DNS van je domein; je hebt daar geen extra
  hostingpakket voor nodig.
- Toegang tot de DNS van je domein (bij Theory7 of bij de partij waar het domein
  nu staat), zodat je een subdomein kunt toevoegen.
- Een terminal op je eigen computer (macOS/Linux) of PuTTY (Windows).
- Ongeveer 30 minuten.

Afspraken in deze handleiding:

- `JOUW-SERVER-IP` = het IP-adres van je VPS, bijvoorbeeld `203.0.113.10`.
- `app.jouwdomein.nl` = het subdomein waarop je test. Gebruik je een ander
  subdomein, vervang die naam dan overal in deze handleiding.

---

## 3. Stap 1 – VPS bestellen

1. Bestel bij Theory7 een **VPS Rebel V4** en kies **Ubuntu 24.04 LTS**.
2. Wil je unmanaged (€ 9,95, zelf beheren)? Dat vraag je aan via een
   supportticket: *"Ik wil een unmanaged VPS Rebel V4 met Ubuntu 24.04, zonder
   DirectAdmin, voor een Docker-applicatie."*
3. Je krijgt per e-mail het IP-adres en het root-wachtwoord (of een SSH-sleutel).
4. Test de verbinding vanaf je eigen computer:

   ```bash
   ssh root@JOUW-SERVER-IP
   ```

> **Belangrijk:** is de VPS "managed", dan beheert Theory7 het systeem. Vraag dan
> of Docker en Docker Compose geïnstalleerd mogen worden; dan kun je stap 4
> overslaan.

---

## 4. Stap 2 – DNS instellen voor je subdomein

Je hebt één A-record nodig dat naar de VPS wijst.

| Type | Naam | Waarde | TTL |
|---|---|---|---|
| A | `app` (jouw gekozen subdomein) | `JOUW-SERVER-IP` | 300 |

- Staat het domein bij Theory7? Dan doe je dit in het DNS-beheer van het
  controlepaneel.
- Staat het domein ergens anders? Voeg het A-record daar toe.
- Je hoofddomein en `www` laat je ongemoeid; die blijven naar je huidige website
  wijzen.
- Controleren of het al werkt (kan tot een paar uur duren):

  ```bash
  dig +short app.jouwdomein.nl
  ```

  Je moet `JOUW-SERVER-IP` zien.

---

## 5. Stap 3 – Server klaarzetten

Log in op de server en werk de software bij:

```bash
ssh root@JOUW-SERVER-IP
apt update && apt upgrade -y
```

Maak de firewall dicht op wat je niet nodig hebt (SSH, HTTP, HTTPS):

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## 6. Stap 4 – Docker installeren

```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

Je moet twee versienummers zien. Klaar.

> **Waarom Docker?** De app heeft Node.js 24 en een aantal systeembestanden
> nodig. In de Docker-container zit precies de goede versie, en je hoeft op de
> server niets aan Node.js of databases te installeren of bij te werken.

---

## 7. Stap 5 – De code op de server zetten

### Optie A – via Git (aanbevolen, makkelijk bijwerken)

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/JOUW-ORGANISATIE/JOUW-REPO.git diligence
cd diligence
```

### Optie B – bestaande bestanden uploaden

Maak op je eigen computer een schoon archief (zonder `data`, `.next` en
back-ups), bijvoorbeeld met `pnpm package:source`. Zet het daarna op de server:

```bash
# op je eigen computer
scp diligence-source-2026-11-09.tar.gz root@JOUW-SERVER-IP:/opt/

# op de server
cd /opt
mkdir diligence && tar -xzf diligence-source-*.tar.gz -C diligence
cd diligence
```

Je moet nu onder andere `docker-compose.yml`, `Dockerfile` en `.env.example`
zien:

```bash
ls
```

---

## 8. Stap 6 – Instellingen maken (`.env.production`)

De app leest zijn instellingen uit één bestand dat **niet** in Git staat.

```bash
cd /opt/diligence
cp .env.example .env.production
```

Maak eerst twee geheimen:

```bash
openssl rand -base64 32   # 1e uitkomst: RATE_LIMIT_SECRET
openssl rand -base64 32   # 2e uitkomst: BACKUP_KEY (bewaar apart, buiten de server!)
```

Open nu het bestand:

```bash
nano .env.production
```

Vul dit in (vervang de voorbeelden):

```ini
DOMAIN=app.jouwdomein.nl
APP_URL=https://app.jouwdomein.nl

COOKIE_SECURE=true
ENFORCE_2FA=true
SESSION_IDLE_MINUTES=60
RATE_LIMIT_SECRET=uitkomst-van-de-eerste-openssl-opdracht

# Eerste beheerder. Alleen nodig bij een lege database.
SEED_ADMIN_EMAIL=jij@jouwdomein.nl
SEED_ADMIN_NAME=Beheerder
SEED_ADMIN_PASSWORD=kies-een-lang-wachtwoord
SEED_DEMO_DATA=false

BREVO_API_KEY=
EMAIL_FROM=info@jouwdomein.nl
EMAIL_FROM_NAME=Stichting Diligence Almere

BACKUP_KEY=uitkomst-van-de-tweede-openssl-opdracht
BACKUP_DIR=/app/backups
BACKUP_RETENTION_DAYS=30
```

Wat betekenen de belangrijkste regels?

| Regel | Betekenis |
|---|---|
| `DOMAIN` | Het adres dat Caddy gebruikt. Meerdere namen mogen, gescheiden door een komma: `DOMAIN=app.jouwdomein.nl, beheer.jouwdomein.nl`. |
| `APP_URL` | Volledige URL met `https://`, gebruikt in afmeldlinks van e-mails. |
| `COOKIE_SECURE` | `true` zodra je via HTTPS werkt. |
| `ENFORCE_2FA` | `true` verplicht tweestapsverplichting voor de beheerder. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Het beheerdersaccount dat wordt aangemaakt als de database nog leeg is. **Verplicht in productie**: zonder deze regels start de app niet, zodat er nooit een account met een standaardwachtwoord ontstaat. Het wachtwoord moet minimaal 12 tekens zijn. |
| `SEED_DEMO_DATA` | `false` = alleen een beheerder, geen verzonnen deelnemers en uitjes. In productie worden demogegevens nooit aangemaakt, ook niet met `true`. |
| `BACKUP_KEY` | Sleutel om back-ups te versleutelen. Zet hem **niet** op dezelfde server als de back-ups. |
| `BREVO_API_KEY` | Optioneel. Zonder sleutel blijft de e-mailwachtrij in demo-stand. |

Beveilig het bestand:

```bash
chmod 600 .env.production
```

> **Let op:** deze waarden worden alleen gebruikt als de database **leeg** is. Wil
> je later een andere beheerder of demo-gegevens, dan moet je de app opnieuw
> beginnen (zie § 13) of de gebruiker in de app beheren.

---

## 9. Stap 7 – Starten

```bash
cd /opt/diligence
docker compose --env-file .env.production up -d --build
```

De eerste keer duurt dit een paar minuten: Docker bouwt de app, installeert de
afhankelijkheden en start daarna twee containers (de app en Caddy voor HTTPS).

Controleren:

```bash
docker compose ps
docker compose logs --tail=30 app
```

Je wilt bij `app` de status **healthy** zien. Test daarna de app zelf:

```bash
curl -s http://127.0.0.1:3100/api/health ; echo
```

Verwacht antwoord:

```json
{"status":"ok","database":"ok","timestamp":"..."}
```

Open nu `https://app.jouwdomein.nl` in je browser. Het certificaat wordt automatisch
aangevraagd zodra DNS goed staat.

- Duurt het laden lang of krijg je een certificaatfout? Wacht twee minuten en
  herlaad. Kijk daarna in `docker compose logs --tail=50 caddy`.
- Krijg je "connection refused"? Dan wijst DNS nog niet naar de server
  (`dig +short app.jouwdomein.nl`) of is poort 80/443 dicht (stap 3).

### Testen zonder domein

Heb je nog geen DNS? Zet dan tijdelijk `DOMAIN=:80` en `APP_URL=http://JOUW-SERVER-IP`
in `.env.production`, start opnieuw en open `http://JOUW-SERVER-IP`. Je hebt dan
geen HTTPS. Gebruik dit alleen om even te kijken, niet om mee te werken.

---

## 10. Stap 8 – Eerste keer inloggen

1. Open `https://app.jouwdomein.nl`.
2. Log in met `SEED_ADMIN_EMAIL` en `SEED_ADMIN_PASSWORD`.
3. Ga naar **Mijn account → Beveiliging** en stel tweestapsverificatie in met een
   authenticator-app. Bewaar de herstelcodes op papier, buiten de server.
4. Maak de echte gebruikers aan onder **Gebruikers** en koppel ze aan een rol.
5. Verander het wachtwoord van de beheerder naar iets dat alleen jij kent.

---

## 11. Stap 9 – Back-ups

De back-up is een versleutelde momentopname van de database. Zonder
`BACKUP_KEY` is een back-up niets waard, dus bewaar die sleutel apart (bijvoorbeeld
in een wachtwoordmanager).

### Handmatig een back-up maken

```bash
cd /opt/diligence
docker compose --env-file .env.production run --rm app node scripts/backup.mjs
```

Je krijgt een regel terug met het pad, bijvoorbeeld
`/app/backups/diligence-2026-11-09T02-15-00-000Z.db.enc`.

### Automatisch, elke dag om 02:15

```bash
crontab -e
```

Voeg toe:

```cron
15 2 * * * cd /opt/diligence && docker compose --env-file .env.production run --rm app node scripts/backup.mjs >> /var/log/diligence-backup.log 2>&1
```

### Back-up van de server halen

De back-ups staan in een Docker-volume. Kopieer ze naar je eigen computer of naar
opslag in de EU:

```bash
cd /opt/diligence
docker compose cp app:/app/backups ./backups-van-server
```

### Terugzetten

```bash
cd /opt/diligence
docker compose stop app
docker compose --env-file .env.production run --rm app \
  node scripts/restore.mjs /app/backups/diligence-2026-11-09T02-15-00-000Z.db.enc /app/data/restored.db
docker compose --env-file .env.production run --rm app \
  sh -c 'mv /app/data/diligence.db /app/data/diligence.db.oud-$(date +%F) && mv /app/data/restored.db /app/data/diligence.db'
docker compose start app
curl -s https://app.jouwdomein.nl/api/health
```

Het restore-script controleert de back-up op schade voordat hij iets terugzet.

---

## 12. Stap 10 – Later een ander adres gebruiken (optioneel)

Je kunt op het testsubdomein blijven werken zolang je wilt. Wil je de app later
op een ander (sub)domein zetten, dan is dat alleen een kwestie van het adres
aanpassen:

1. Zet in `.env.production` de nieuwe naam. Meerdere namen mogen, gescheiden door
   een komma:

   ```ini
   DOMAIN=app.jouwdomein.nl, beheer.jouwdomein.nl
   APP_URL=https://beheer.jouwdomein.nl
   ```

2. Zet in de DNS een A-record voor de nieuwe naam naar `JOUW-SERVER-IP`.
3. Herstart zodat Caddy de nieuwe naam en het certificaat oppakt:

   ```bash
   cd /opt/diligence
   docker compose --env-file .env.production up -d
   ```

4. Open het nieuwe adres en controleer `/api/health`.

> **Let op:** een adres kan maar naar één ding wijzen. Wil je de app op je
> hoofdomein of op `www` zetten terwijl daar nu je website staat, dan moet je
> eerst kiezen welk van de twee daar komt te staan. Laat de app in dat geval
> liever op een eigen subdomein zoals `beheer.jouwdomein.nl` staan.

---

## 13. Bijwerken naar een nieuwe versie

```bash
cd /opt/diligence
git pull
docker compose --env-file .env.production up -d --build
docker compose ps
```

De database in het volume blijft bewaard. Maak voor een grote wijziging eerst een
back-up.

### Opnieuw beginnen met een lege database (alleen in de testfase!)

Dit **verwijdert alle gegevens**. Doe het nooit op een omgeving met echte
deelnemers.

```bash
cd /opt/diligence
docker compose --env-file .env.production down
docker volume ls                     # zoek het volume dat eindigt op _diligence_data
docker volume rm diligence_diligence_data
docker compose --env-file .env.production up -d
```

---

## 14. Veelvoorkomende problemen

| Verschijnsel | Oorzaak en oplossing |
|---|---|
| `port is already allocated` bij het starten | Er draait al iets op poort 80/443 (bijvoorbeeld een oude webserver). `ss -tlnp \| grep -E ':80\|:443'` laat zien wat. Stop dat, of vraag Theory7 het te verwijderen. |
| Certificaatfout of "not secure" | DNS wijst nog niet naar de server, of poort 80 is dicht. Controleer `dig +short app.jouwdomein.nl` en `ufw status`. |
| App-container blijft `restarting` | Bekijk `docker compose logs --tail=80 app`. Vaak een typefout in `.env.production` of geen schrijfrechten op het datavolume. |
| Inloggen lukt niet met je eigen e-mailadres | De database was al gevuld voordat je `SEED_ADMIN_*` instelde. Bestaande databases worden niet opnieuw ingevuld; begin opnieuw (§ 13) of log in met het bestaande account. |
| "Te veel inlogpogingen" | De app blokkeert 10 pogingen per 15 minuten per e-mailadres/IP. Wacht 15 minuten. |
| E-mails worden niet verstuurd | Zonder `BREVO_API_KEY` blijven berichten in de wachtrij staan. Dat is de demo-stand, geen fout. |
| Schijf vol | `df -h`. SQLite heeft ruimte nodig. Maak oude back-ups weg of breid de VPS uit. |
| Alles kwijt na `docker compose down -v` | `-v` verwijdert volumes, dus ook de database. Gebruik `down` zonder `-v`. |

Nuttige commando's:

```bash
cd /opt/diligence
docker compose ps                     # status
docker compose logs -f app            # meelopen met de app
docker compose logs --tail=100 caddy  # HTTPS-problemen
curl -s https://app.jouwdomein.nl/api/health
docker stats --no-stream              # geheugen en CPU
```

---

## 15. Alternatief: zonder Docker

Kan, maar het is meer werk en je moet Node.js zelf bijhouden. De app heeft
**Node.js 24** nodig (voor `node:sqlite`) en een procesmanager.

```bash
apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
npm install -g pnpm@11.28.5

adduser --system --group --home /opt/diligence diligence
cd /opt/diligence
pnpm install --frozen-lockfile
pnpm build
```

Maak `/etc/systemd/system/diligence.service`:

```ini
[Unit]
Description=Diligence beheer
After=network.target

[Service]
Type=simple
User=diligence
WorkingDirectory=/opt/diligence
EnvironmentFile=/opt/diligence/.env.production
Environment=NODE_ENV=production
Environment=PORT=3100
Environment=HOSTNAME=127.0.0.1
Environment=DILIGENCE_DB_PATH=/opt/diligence/data/diligence.db
ExecStart=/usr/bin/node scripts/start-standalone.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
mkdir -p /opt/diligence/data
chown -R diligence:diligence /opt/diligence
systemctl daemon-reload
systemctl enable --now diligence
```

Zet daarna Caddy of Nginx als reverse proxy naar `127.0.0.1:3100` en regel HTTPS
met Certbot. Bijwerken = `git pull && pnpm install --frozen-lockfile && pnpm build && systemctl restart diligence`.

---

## 16. Checklist voordat je met vrijwilligers gaat testen

- [ ] `https://app.jouwdomein.nl` opent en `/api/health` zegt `ok`.
- [ ] Inloggen werkt met het beheerdersaccount uit `.env.production`.
- [ ] Tweestapsverificatie is ingesteld en herstelcodes liggen buiten de server.
- [ ] `docker compose ps` toont `healthy` en beide containers starten na een
      herstart van de server automatisch mee (`reboot` en opnieuw kijken).
- [ ] De dagelijkse back-up-cron draait en je hebt één restore getest.
- [ ] `BACKUP_KEY` staat veilig buiten de server.
- [ ] Er staan **geen echte persoonsgegevens** in de testomgeving.
- [ ] Je weet wie je belt als de site niet bereikbaar is.

---

## 17. Eerlijk over de grenzen

- Dit is nog een **werkversie**, geen productieklare versie. Zet er geen echte
  deelnemersgegevens in tot de privacy- en beveiligingsstappen uit
  [`PRODUCTIE.md`](PRODUCTIE.md) zijn afgerond (DPIA, verwerkersovereenkomsten,
  penetratietest).
- **Eén server, één databasebestand.** Dat is bewust: SQLite kan niet veilig door
  meerdere servers tegelijk worden beschreven. Bij groei is PostgreSQL de volgende
  stap; de app is daar nu niet op voorbereid.
- **Gedeelde Theory7-hosting werkt niet** voor deze app, ook niet met een
  `.htaccess` of een upload van alleen de `out`-map: er is geen map met kant-en-klare
  HTML-bestanden. De pagina's worden per bezoek door Node.js gemaakt.
- Een THEORY7-managed VPS is duurder dan unmanaged, maar scheelt beheer. Kies wat
  bij je past; de stappen hierboven zijn hetzelfde.
