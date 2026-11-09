import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can, canAny } from "@/lib/permissions";
import { all, get } from "@/lib/db";
import { formatDate, formatMoney, statusLabel } from "@/lib/format";
import { getActivePeriod, getOutings, type Outing } from "@/lib/queries";
import { Badge, EmptyState, PageHeader } from "@/components/ui";

export default async function OutingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; category?: string }>;
}) {
  const user = await requireUser();
  if (!canAny(user, ["program.view", "own.outings"])) {
    redirect("/?melding=Geen+toegang+tot+dit+onderdeel");
  }
  const { ok, error, category = "" } = await searchParams;
  const isDriver = can(user, "own.outings") && !can(user, "program.view");
  const period = getActivePeriod();
  const allOutings = period ? getOutings(period.id) : [];
  const driverOutingIds = isDriver
    ? new Set(
        all<{ outing_id: string }>(
          "SELECT DISTINCT outing_id FROM outing_vehicles WHERE driver_id = ?",
          user.id,
        ).map((row) => row.outing_id),
      )
    : null;
  const visibleOutings = driverOutingIds
    ? allOutings.filter((outing) => driverOutingIds.has(outing.id))
    : allOutings;
  const categories = all<{ id: string; name: string }>(
    "SELECT id, name FROM categories WHERE archived_at IS NULL ORDER BY name",
  );
  const locations = all<{ id: string; name: string }>(
    "SELECT id, name FROM locations WHERE archived_at IS NULL ORDER BY name",
  );
  const categoryNames = new Map(categories.map((row) => [row.id, row.name]));
  const locationNames = new Map(locations.map((row) => [row.id, row.name]));
  const outings = category
    ? visibleOutings.filter((outing) => outing.category_id === category)
    : visibleOutings;

  const signups = all<{ outing_id: string | null; target_type: string; series_key: string }>(
    "SELECT outing_id, target_type, series_key FROM signups WHERE status = 'active'",
  );
  const countFor = (outing: Outing) =>
    signups.filter(
      (signup) =>
        signup.outing_id === outing.id ||
        signup.target_type === "period" ||
        (signup.target_type === "series" && signup.series_key === outing.series_key),
    ).length;
  const allPeriodSignups = period
    ? signups.filter((signup) => signup.target_type === "period").length
    : 0;

  return (
    <>
      <PageHeader
        title="Evenementen en programma"
        intro={
          period
            ? `Het programma van ${period.name}. Klik op een evenement voor de deelnemers, het vervoer en de daglijst.`
            : "Er is nog geen actieve periode."
        }
        nextStep={
          period
            ? `De opgavedeadline is ${formatDate(period.deadline)}. ${
                period.deadline < new Date().toISOString().slice(0, 10)
                  ? "De deadline is verstreken; de indeling kan worden berekend."
                  : "Opgaven kunnen nog worden ingevoerd."
              }`
            : "Maak eerst een periode aan voordat je evenementen toevoegt."
        }
        actions={
          isDriver ? null : (
            <>
              <Link className="btn btn-primary" href="/uitjes/nieuw">
                Nieuw evenement
              </Link>
              <Link className="btn btn-secondary" href="/uitjes/import">
                Programma importeren
              </Link>
              <Link className="btn btn-secondary" href="/uitjes/print">
                Programma printen
              </Link>
            </>
          )
        }
      />

      {ok ? (
        <div className="alert alert-success">{ok}</div>
      ) : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {period ? (
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>{period.name}</h2>
            <Badge tone={period.deadline < new Date().toISOString().slice(0, 10) ? "warning" : "success"}>
              {period.deadline < new Date().toISOString().slice(0, 10)
                ? "Opgave gesloten"
                : "Opgave open"}
            </Badge>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {outings.length} evenementen · deadline {formatDate(period.deadline)}
            {allPeriodSignups > 0
              ? ` · ${allPeriodSignups} opgaven voor alle evenementen`
              : ""}
          </p>
        </div>
      ) : null}

      <div className="section-title">
        <h2>Programma</h2>
        <span className="small muted">Inclusief opgaven voor alle evenementen</span>
      </div>

      {!isDriver && categories.length ? (
        <form method="get" className="actions" style={{ marginBottom: 16 }}>
          <div className="field">
            <label htmlFor="category-filter">Filter op categorie</label>
            <select id="category-filter" name="category" defaultValue={category}>
              <option value="">Alle categorieën</option>
              {categories.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary" type="submit">Filteren</button>
          {category ? <Link className="btn btn-secondary" href="/uitjes">Wissen</Link> : null}
        </form>
      ) : null}

      {!period || outings.length === 0 ? (
        <EmptyState
          title={isDriver ? "Geen evenementen voor jou" : "Nog geen evenementen"}
          action={
            isDriver ? null : (
              <Link className="btn btn-primary" href="/uitjes/nieuw">
                Eerste evenement toevoegen
              </Link>
            )
          }
        >
          {isDriver
            ? "De coördinator heeft je nog niet aan een evenement gekoppeld."
            : "Voeg een evenement toe of importeer het programma uit Excel/CSV."}
        </EmptyState>
      ) : (
        <div className="list">
          {outings.map((outing: Outing) => {
            const count = countFor(outing);
            return (
              <Link
                key={outing.id}
                href={`/uitjes/${outing.id}`}
                className="outing-row"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="date">
                  {formatDate(outing.date)}
                  <span>
                    {outing.start_time}–{outing.end_time}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{outing.description}</div>
                  <div className="meta">
                    {outing.location_id ? (
                      <Badge tone="muted">{locationNames.get(outing.location_id) ?? "Locatie"}</Badge>
                    ) : null}
                    {outing.category_id ? (
                      <Badge tone="accent">{categoryNames.get(outing.category_id) ?? "Categorie"}</Badge>
                    ) : null}
                    {outing.series_name ? <Badge tone="muted">Reeks: {outing.series_name}</Badge> : null}
                    {outing.labels
                      ? outing.labels.split(",").map((label) => (
                          <Badge key={label} tone="accent">
                            {label.trim()}
                          </Badge>
                        ))
                      : null}
                    {outing.less_suitable_walkers ? (
                      <Badge tone="warning">Minder geschikt voor rollators</Badge>
                    ) : null}
                    <span className="small muted">{count} specifieke opgaven</span>
                  </div>
                </div>
                <div className="small muted">
                  Capaciteit {outing.capacity}
                  <div className="progress" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, (count / outing.capacity) * 100)}%` }} />
                  </div>
                  <span className="tiny">Status: {statusLabel(outing.status)}</span>
                </div>
                <div className="price">{formatMoney(outing.price_cents)}</div>
              </Link>
            );
          })}
        </div>
      )}

      {period && period.deadline < new Date().toISOString().slice(0, 10) ? (
        <div className="alert alert-info" style={{ marginTop: 24 }}>
          De opgavedeadline is verstreken. Ga naar <Link href="/indeling">Indeling</Link> om het
          voorstel te berekenen.
        </div>
      ) : null}
    </>
  );
}
