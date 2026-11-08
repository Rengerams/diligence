# Productiehandleiding

**Versie:** 1.0  
**Doel:** de Diligence-app veilig en herstelbaar laten draaien op één EU-server.  
**Uitgangspunt:** één applicatie-instantie met SQLite op een persistente volumeschijf, achter Caddy met automatisch HTTPS.

> Deze handleiding beschrijft de productie-opstelling. De demo op `localhost:3100` gebruikt dezelfde applicatie, maar zonder Docker, TLS of echte e-mail.

---

## 1. Opzet

```text
Internet
   │  HTTPS (443)
   ▼
Caddy  ──►  Next.js-app (poort 3100)  ──►  SQLite-bestand op persistent volume
   │
   └── automatische certificaten, HSTS, access-log
```

- **Eén app-instantie.** SQLite ondersteunt geen veilige multi-writer-opstelling over meerdere containers. Schaalbare replicatie vraagt later om PostgreSQL.
- **Caddy** regelt TLS, HSTS en de reverse proxy.
- **Docker Compose** herstart de app automatisch na een crash of herstart van de server.
- **Volume** `diligence_data` bewaart de database buiten de container.
- **Back-ups** worden op de host gemaakt en versleuteld met een aparte sleutel.

---

## 2. Server

- Nederlandse of EU-VPS, Ubuntu 24.04 LTS of Debian 12.
- 2 vCPU, 4 GB RAM, 40 GB schijf is ruim voldoende.
- Poorten 80 en 443 open; 3100 niet publiek.
- Docker Engine en Docker Compose-plugin.
- Eigen domein, bijvoorbeeld `beheer.diligence-almere.nl`, met een A-record naar de server.
- Eén niet-root beheerder met SSH-sleutel; root-login uit.

---

## 3. Configuratie

Maak `.env.production` op de server. Gebruik [`.env.example`](../.env.example) als sjabloon; zet nooit echte waarden in git.

Verplicht:

| Variabele | Betekenis |
|---|---|
| `DOMAIN` | Publieke hostnaam voor Caddy |
| `APP_URL` | Volledige HTTPS-URL, gebruikt in afmeldlinks |
| `COOKIE_SECURE` | `true` achter HTTPS |
| `ENFORCE_2FA` | `true` om 2FA voor Admin verplicht te maken |
| `SESSION_IDLE_MINUTES` | Inactiviteitsgrens, standaard 60 |
| `RATE_LIMIT_SECRET` | Lang willekeurig geheim voor de rate-limit-sleutel |

Optioneel:

| Variabele | Betekenis |
|---|---|
| `BREVO_API_KEY` | Verzenden via Brevo; zonder sleutel blijft de wachtrij in demo-stand |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | Afzender |
| `BACKUP_KEY` | Alleen op de host, voor back-up/restore |
| `BACKUP_DIR` / `BACKUP_RETENTION_DAYS` | Back-uplocatie en retentie |

Genereer geheimen bijvoorbeeld met:

```bash
openssl rand -base64 32
```

---

## 4. Uitrollen

```bash
git clone <repo> /opt/diligence
cd /opt/diligence
cp .env.example .env.production
# vul .env.production met echte waarden
docker compose --env-file .env.production up -d --build
docker compose ps
```

`--env-file` is nodig zodat Caddy de publieke `DOMAIN` krijgt. De app krijgt dezelfde waarden via `env_file` in de Compose-configuratie.

Caddy vraagt automatisch een certificaat aan zodra DNS naar de server wijst en poort 80/443 bereikbaar zijn.

Controleer:

```bash
curl -fsS https://beheer.diligence-almere.nl/api/health
docker compose logs --tail=50 app
docker compose logs --tail=50 caddy
```

Verwacht:

```json
{"status":"ok","database":"ok","timestamp":"..."}
```

---

## 5. Back-ups

De back-up maakt een consistente SQLite-snapshot met `VACUUM INTO`, versleutelt die met AES-256-GCM en bewaart het resultaat buiten de container.

```bash
cd /opt/diligence
BACKUP_KEY="$(grep '^BACKUP_KEY=' .env.production | cut -d= -f2-)" pnpm backup
```

Of maak een klein script `/usr/local/bin/diligence-backup` dat dezelfde opdracht uitvoert en de sleutel uit een root-only bestand leest.

Aanbevolen cron (dagelijks 02:15):

```cron
15 2 * * * cd /opt/diligence && set -a && . ./.env.production && set +a && pnpm backup >> /var/log/diligence-backup.log 2>&1
```

- Bewaar de back-up **offsite** in EU-objectopslag.
- Bewaar `BACKUP_KEY` niet op dezelfde server als de back-up.
- Test elk kwartaal een restore op een testserver.
- Retentie: standaard 30 dagen; pas `BACKUP_RETENTION_DAYS` aan.

### Restore

1. Stop de app: `docker compose stop app`.
2. Pak de back-up uit naar een nieuw bestand:

   ```bash
   BACKUP_KEY="..." pnpm restore backups/diligence-....db.enc data/restored.db
   ```

3. Controleer de integriteit (het script doet al `PRAGMA integrity_check`).
4. Hernoem de huidige database naar `diligence.db.before-restore-<datum>`.
5. Zet `data/restored.db` op de plek van `diligence.db` en controleer eigenaar/rechten.
6. Start: `docker compose start app`.
7. Meld aan en controleer de laatste gegevens en het wijzigingsoverzicht.

---

## 6. Beveiliging

- **HTTPS** verplicht; HSTS via Caddy.
- **Cookies** `HttpOnly`, `SameSite=Lax`, `Secure` in productie.
- **2FA** verplicht voor Admin met `ENFORCE_2FA=true`; herstelcodes worden bij installatie getoond.
- **Rate limiting** op inlogpogingen: 10 per 15 minuten per e-mailadres/IP-combinatie. De sleutel is gehasht; er worden geen IP-adressen opgeslagen.
- **Sessies** verlopen absoluut na 8 uur en na 60 minuten inactiviteit.
- **Securityheaders** via Next.js en Caddy: CSP, `X-Frame-Options`, `nosniff`, referrer-policy, permissions-policy.
- **Logboek** is append-only met databasetriggers.
- **Geen PII in logs**; Caddy-accesslogs bevatten IP-adressen. Beperk de bewaartermijn en toegang.
- **Updates:** maandelijks `pnpm outdated`, Docker-images en OS-patches; daarna opnieuw testen.
- **Least privilege:** alleen de benodigde rollen; Admin alleen voor beheerders.
- **Penetratietest** of security-review vóór livegang met echte gegevens.

---

## 7. Monitoring en beheer

- Uptime-monitor op `/api/health` (verwacht 200 binnen 5 seconden).
- Schijfruimte: minimaal 20% vrij houden; SQLite heeft ruimte nodig voor WAL en `VACUUM`.
- Docker-healthcheck herstart een ongezonde container niet automatisch; gebruik een uptime-alert en `docker compose restart app` bij een storing.
- Bekijk dagelijks/wekelijks de applicatielogs op fouten; zonder persoonsgegevens.
- Houd de back-up-log en de laatste succesvolle back-up bij.
- Na een crash: `docker compose ps`, `docker compose logs app`, daarna herstarten.

---

## 8. Wat deze opstelling niet is

- Geen high-availability of multi-node-cluster.
- Geen automatische failover.
- Geen beheerde PostgreSQL; SQLite is gekozen voor eenvoud bij deze omvang.
- Geen ingebouwde offsite-replicatie; de back-upcron en objectopslag moeten apart worden ingericht.
- Geen vervanging van een DPIA, verwerkersovereenkomsten of penetration test.

Bij groei naar meerdere instanties of zware gelijktijdigheid is PostgreSQL de logische volgende stap; de applicatie is nu niet voorbereid op horizontaal schalen.

---

## 9. Checklist vóór livegang

- [ ] DNS wijst naar de server; HTTPS werkt.
- [ ] `.env.production` staat buiten git en heeft alle verplichte waarden.
- [ ] `COOKIE_SECURE=true` en `ENFORCE_2FA=true`.
- [ ] Admin heeft 2FA ingesteld en herstelcodes veilig bewaard.
- [ ] `BREVO_API_KEY` en afzenderdomein getest (SPF/DKIM/DMARC).
- [ ] Back-upjob draait en een restore is getest.
- [ ] `/api/health` wordt gemonitord.
- [ ] Echte gegevens zijn geïmporteerd en gecontroleerd.
- [ ] Rollen en rechten zijn doorgenomen.
- [ ] Privacyverklaring, verwerkingsregister en verwerkersovereenkomsten staan klaar.
- [ ] Testvrijwilligers hebben de hoofdtaken doorlopen.
- [ ] Er is een contactpersoon voor storingen en een incidentprocedure.
