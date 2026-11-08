import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { all, get } from "@/lib/db";
import { formatDate, formatMoney, statusLabel } from "@/lib/format";
import {
  getActivePeriod,
  getLatestRun,
  type Outing,
  type Run,
} from "@/lib/queries";
import { Badge, PageHeader } from "@/components/ui";

function taskFor(period: ReturnType<typeof getActivePeriod>, run: Run | undefined) {
  const today = new Date().toISOString().slice(0, 10);
  if (!period) {
    return {
      title: "Er is nog geen actieve periode.",
      text: "Maak eerst een periode en uitjes aan.",
      href: "/uitjes",
      label: "Naar uitjes",
    };
  }
  if (period.status === "published" && period.deadline >= today) {
    return {
      title: "De opgave is open.",
      text: `Neem telefonische opgaven aan tot en met ${formatDate(period.deadline)}.`,
      href: "/opgave",
      label: "Opgave invoeren",
    };
  }
  if (!run) {
    return {
      title: "De deadline is verstreken.",
      text: "Bereken nu het indelingsvoorstel en bekijk de uitkomst.",
      href: "/indeling",
      label: "Voorstel berekenen",
    };
  }
  if (run.phase === "proposal") {
    return {
      title: "Het voorstel staat klaar.",
      text: "Bekijk de indeling, de reservelijst en de uitleg. Bevestig daarna.",
      href: "/indeling",
      label: "Voorstel bekijken",
    };
  }
  return {
    title: "De indeling is bevestigd.",
    text: "Werk de bellijst af en print de daglijsten voor de chauffeurs.",
    href: "/bellen",
    label: "Naar de bellijst",
  };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const period = getActivePeriod();
  const run = period ? getLatestRun(period.id) : undefined;
  const task = taskFor(period, run);
  const today = new Date().toISOString().slice(0, 10);

  const participantCount = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM participants WHERE archived_at IS NULL",
  )?.n ?? 0;
  const signupCount = period
    ? get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM signups WHERE period_id = ? AND status = 'active'",
        period.id,
      )?.n ?? 0
    : 0;
  const outingCount = period
    ? get<{ n: number }>("SELECT COUNT(*) AS n FROM outings WHERE period_id = ?", period.id)?.n ?? 0
    : 0;
  const assignedCount = run
    ? get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM allocations WHERE run_id = ? AND status = 'assigned'",
        run.id,
      )?.n ?? 0
    : 0;
  const waitlistCount = run
    ? get<{ n: number }>(
        "SELECT COUNT(*) AS n FROM allocations WHERE run_id = ? AND status = 'waitlist'",
        run.id,
      )?.n ?? 0
    : 0;

  const nextOutings = all<Outing & { signup_count: number }>(
    `SELECT o.*,
            (SELECT COUNT(*) FROM signups s
              WHERE s.status = 'active'
                AND (s.outing_id = o.id OR s.target_type = 'period'
                     OR (s.target_type = 'series' AND s.series_key = o.series_key))) AS signup_count
       FROM outings o
      WHERE o.status = 'planned' AND o.date >= ?
      ${!can(user, "program.view") && can(user, "own.outings") ? "AND EXISTS (SELECT 1 FROM outing_vehicles ov WHERE ov.outing_id = o.id AND ov.driver_id = ?)" : ""}
      ORDER BY o.date, o.start_time
      LIMIT 4`,
    ...(!can(user, "program.view") && can(user, "own.outings") ? [today, user.id] : [today]),
  );
  const opgaveOpen = period
    ? period.status === "published" && period.deadline >= today
    : false;

  return (
    <>
      <PageHeader
        title={`Goedendag, ${user.name.split(" ")[0]}`}
        intro="Dit is het overzicht van de lopende periode. Bovenaan staat wat er nu gedaan moet worden."
        nextStep={task.text}
        actions={
          <Link className="btn btn-primary" href={task.href}>
            {task.label}
          </Link>
        }
      />

      {!can(user, "program.view") && can(user, "own.outings") ? (
        <div className="alert alert-info">
          Je ziet alleen de uitjes en daglijsten waarvoor je als chauffeur bent ingedeeld.
        </div>
      ) : null}

      <div className="stats">
        <div className="stat">
          <strong>{participantCount}</strong>
          <span>deelnemers</span>
        </div>
        <div className="stat">
          <strong>{outingCount}</strong>
          <span>uitjes in de periode</span>
        </div>
        <div className="stat">
          <strong>{signupCount}</strong>
          <span>opgaven</span>
        </div>
        <div className="stat">
          <strong>{run ? assignedCount : "—"}</strong>
          <span>{run ? `ingedeeld · ${waitlistCount} reserve` : "nog geen indeling"}</span>
        </div>
      </div>

      {period ? (
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>{period.name}</h2>
            <Badge tone={opgaveOpen ? "success" : "warning"}>
              {opgaveOpen ? "Opgave open" : "Opgave gesloten"}
            </Badge>
          </div>
          <p className="muted">
            Opgavedeadline: {formatDate(period.deadline)} · standaardcapaciteit{" "}
            {period.default_capacity} personen
          </p>
          <div className="actions">
            <Link className="btn btn-secondary" href="/uitjes">
              Programma bekijken
            </Link>
            <Link className="btn btn-secondary" href="/opgave">
              Opgave invoeren
            </Link>
            <Link className="btn btn-secondary" href="/indeling">
              Indeling bekijken
            </Link>
          </div>
        </div>
      ) : null}

      <div className="section-title">
        <h2>Eerstvolgende uitjes</h2>
        <Link href="/uitjes" className="btn-link">
          Alle uitjes
        </Link>
      </div>

      {nextOutings.length === 0 ? (
        <div className="empty">
          <h3>Nog geen uitjes gepland</h3>
          <p>Voeg een periode en uitjes toe om te kunnen beginnen.</p>
        </div>
      ) : (
        <div className="list">
          {nextOutings.map((outing) => (
            <Link key={outing.id} href={`/uitjes/${outing.id}`} className="outing-row" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="date">
                {formatDate(outing.date)}
                <span>
                  {outing.start_time}–{outing.end_time}
                </span>
              </div>
              <div>
                <div className="title" style={{ fontWeight: 700 }}>{outing.description}</div>
                <div className="meta">
                  {outing.labels ? <Badge tone="accent">{outing.labels}</Badge> : null}
                  {outing.less_suitable_walkers ? <Badge tone="warning">Minder geschikt voor rollators</Badge> : null}
                  <span className="small muted">{outing.signup_count} opgaven</span>
                </div>
              </div>
              <div className="small muted">
                Capaciteit {outing.capacity}
                <div className="progress" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, (outing.signup_count / outing.capacity) * 100)}%` }} />
                </div>
              </div>
              <div className="price">{formatMoney(outing.price_cents)}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="alert alert-info" style={{ marginTop: 24 }}>
        <strong>Demo-omgeving.</strong> Alle namen, telefoonnummers en uitjes zijn verzonnen.
        Gebruik deze omgeving niet met echte persoonsgegevens.
      </div>
    </>
  );
}
