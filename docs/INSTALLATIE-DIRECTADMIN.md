# Installatie via DirectAdmin (Setup Node.js App)

Deze handleiding zet de Diligence-app online op het **hostingpakket dat je al
hebt**, zonder VPS en zonder extra kosten. De app draait dan als Node.js-proces
achter de webserver van je pakket (via de knop **Setup Node.js App** /
NodeJS Selector) en de database blijft één SQLite-bestand in je eigen
home-map.

> **Voorwaarde:** "Setup Node.js App" moet **Node.js 24** aanbieden. Is dat zo,
> dan werkt deze route. Staat er alleen 20 of lager, dan kan het niet: de app
> gebruikt `node:sqlite`, dat pas vanaf Node 22.5 bestaat. Gebruik dan
> [`INSTALLATIE-THEORY7.md`](INSTALLATIE-THEORY7.md) (VPS met Docker).

Verschil met de Docker-route: Caddy regelt daar HTTPS en de back-up-cron; hier
regelt je pakket de HTTPS (SSL-certificaat in DirectAdmin) en zet je de back-up
als **Cron Job** in het paneel. Verder is het dezelfde app met dezelfde
database.

Afspraken in deze handleiding:

- `jouwdomein.nl` = je eigen domein.
- `app.jouwdomein.nl` = het subdomein waarop je test. Gebruik je een andere
  naam, vervang hem dan overal.
- `~/diligence` = de map met de app, **buiten** `public_html`, zodat de
  programmabestanden niet via de website te bereiken zijn.
- `~/diligence-data` = de map met de database.

---

## 1. Subdomein en SSL klaarzetten

1. DirectAdmin → **Subdomain Management** → maak `app` aan onder je domein.
2. DirectAdmin → **SSL/TLS Certificates** → kies dat subdomein → **Free &
   automatic certificate (Let's Encrypt)** → sla op.
3. Controleer dat `https://app.jouwdomein.nl` opent (een lege of
   standaardpagina is nu goed; die wordt straks vervangen).

---

## 2. De code in je home-map zetten

Twee mogelijkheden; kies er één.

**A – via SSH (aanbevolen, makkelijk bijwerken)**

```bash
cd ~
git clone <repo-url> diligence
```

**B – via File Manager**

Upload een zip van het project naar je home-map, pak hem uit en hernoem de map
naar `diligence`. De map moet `package.json` bevatten, anders staat hij één map
te diep.

Maak daarna de mappen aan:

```bash
mkdir -p ~/diligence-data ~/diligence-backups ~/diligence/tmp
```

---

## 3. De Node-app aanmaken in het paneel

DirectAdmin → **Setup Node.js App** → **Create Application**:

| Veld | Wat je invult |
|---|---|
| Node.js version | **24** (de hoogste die er staat) |
| Application mode | **Production** |
| Application root | `diligence` (dus `~/diligence`) |
| Application URL | `app.jouwdomein.nl` |
| Application startup file | `scripts/start-standalone.mjs` |

Sla op. Het paneel maakt een `.htaccess` in de app-map; die heb je nodig, laat
hem staan.

> **Weigert het paneel een startup-bestand in een submap?** Maak dan in
> `~/diligence` een bestand `app.js` met deze inhoud en kies `app.js` als
> startup file:
>
> ```js
> import("./scripts/start-standalone.mjs");
> ```

---

## 4. Instellingen (omgevingsvariabelen)

In dezelfde app-pagina zet je onder **Environment variables** deze regels.
Gebruik twee willekeurige sleutels: draai `openssl rand -base64 32` in de
Terminal (twee keer) en plak de uitkomsten.

```ini
NODE_ENV=production
APP_URL=https://app.jouwdomein.nl
COOKIE_SECURE=true
ENFORCE_2FA=true
SESSION_IDLE_MINUTES=60
RATE_LIMIT_SECRET=<uitkomst eerste openssl>

SEED_ADMIN_EMAIL=jij@jouwdomein.nl
SEED_ADMIN_NAME=Beheerder
SEED_ADMIN_PASSWORD=<lang wachtwoord, minstens 12 tekens>
SEED_DEMO_DATA=false

DILIGENCE_DB_PATH=/home/<gebruikersnaam>/diligence-data/diligence.db
BACKUP_DIR=/home/<gebruikersnaam>/diligence-backups
BACKUP_RETENTION_DAYS=30
BACKUP_KEY=<uitkomst tweede openssl; bewaar apart, buiten de server>

EMAIL_FROM=info@jouwdomein.nl
EMAIL_FROM_NAME=Stichting Diligence Almere
BREVO_API_KEY=
```

- `SEED_ADMIN_EMAIL` en `SEED_ADMIN_PASSWORD` zijn **verplicht** in productie:
  zonder deze regels start de app niet. Ze worden alleen gebruikt als de
  database nog leeg is.
- `DILIGENCE_DB_PATH` moet **buiten** `~/diligence` staan, anders raak je de
  database kwijt bij het vervangen van de app-map.
- `BREVO_API_KEY` mag leeg blijven; de e-mailwachtrij blijft dan in demo-stand.

---

## 5. Installeren en bouwen

Open **Terminal** in DirectAdmin:

```bash
cd ~/diligence
corepack enable
corepack prepare pnpm@11.28.5 --activate
pnpm install --frozen-lockfile
NODE_OPTIONS=--max-old-space-size=2048 pnpm build
```

Werkt `corepack` niet op je pakket, gebruik dan:

```bash
npm install -g pnpm@11.28.5
```

De build duurt een paar minuten en heeft tijdelijk ±1,5 GB geheugen nodig. Loopt
hij vast op geheugen, probeer het dan opnieuw zonder andere processen, of vraag
je host om een tijdelijke verhoging van de geheugenlimiet.

---

## 6. Starten

DirectAdmin → **Setup Node.js App** → **Restart**. Controleer daarna:

```bash
curl -s https://app.jouwdomein.nl/api/health     # verwacht: ok
```

Gaat het mis, kijk dan in `~/diligence/stderr.log` (of de log die het paneel
toont) en in `~/logs/`.

Log in op `https://app.jouwdomein.nl` met het beheerdersaccount uit stap 4 en
stel direct tweestapsverificatie in.

---

## 7. Back-ups

Handmatig (in de Terminal):

```bash
cd ~/diligence
node scripts/backup.mjs
ls -lh ~/diligence-backups
```

Automatisch: DirectAdmin → **Cron Jobs** → nieuwe cron, elke dag om 02:15:

```bash
cd /home/<gebruikersnaam>/diligence && DILIGENCE_DB_PATH=/home/<gebruikersnaam>/diligence-data/diligence.db BACKUP_DIR=/home/<gebruikersnaam>/diligence-backups BACKUP_KEY=<sleutel> /usr/local/bin/node scripts/backup.mjs
```

Haal de back-ups regelmatig van de server (File Manager → download) en bewaar
`BACKUP_KEY` buiten de server. Zonder die sleutel is een back-up niets waard.

---

## 8. Bijwerken naar een nieuwe versie

```bash
cd ~/diligence
git pull
pnpm install --frozen-lockfile
NODE_OPTIONS=--max-old-space-size=2048 pnpm build
```

Daarna **Restart** in het paneel. De database in `~/diligence-data` blijft
ongemoeid.

---

## 9. Als het niet werkt

| Klacht | Oorzaak en oplossing |
|---|---|
| 503 / "Application is not running" | De app start niet. Kijk in `~/diligence/stderr.log`; meestal ontbreekt `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` of is `NODE_ENV` niet `production`. |
| `node:sqlite` niet gevonden | De app draait op een te oude Node-versie. Zet in het paneel de Node-versie op 24 en herstart. |
| Build stopt met "JavaScript heap out of memory" | Niet genoeg geheugen tijdens de build; zie stap 5. |
| Witte pagina of 404 op alle pagina's | De app-map is niet de map met `package.json`, of de startup file staat verkeerd. |
| Database leeg na een update | `DILIGENCE_DB_PATH` staat binnen `~/diligence`; zet hem op `~/diligence-data/diligence.db`. |
| Wachtwoord van de beheerder vergeten | Zie § 14 van `INSTALLATIE-THEORY7.md` (opnieuw beginnen met een lege database) — dat wist ook de gegevens. |

---

## 10. Grenzen van deze route

- Eén Node-proces op één pakket. Dat past bij deze app (SQLite), maar het is geen
  opzet voor zware belasting of meerdere servers tegelijk.
- Je host beheert de webserver en de Node-versie; bij een upgrade kunnen zij de
  versie wijzigen. Controleer na zo'n wijziging `/api/health`.
- Back-ups en updates zijn hier handwerk (cron + `git pull`), niet automatisch
  zoals bij Docker.
