import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { getActivePeriod, getOutings, type Outing } from "@/lib/queries";
import { PrintButton } from "@/components/print-button";
import { EmptyState } from "@/components/ui";

function monthLabel(iso: string): string {
  const date = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
  return new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(date);
}

export default async function ProgramPrintPage() {
  await requirePermission("program.view");
  const period = getActivePeriod();

  if (!period) {
    return (
      <EmptyState title="Nog geen periode" action={<Link className="btn btn-primary" href="/uitjes">Naar evenementen</Link>}>
        Er is nog geen actieve periode.
      </EmptyState>
    );
  }

  const outings = getOutings(period.id).filter((outing) => outing.status !== "cancelled");
  const groups = new Map<string, Outing[]>();
  for (const outing of outings) {
    const key = outing.date.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(outing);
    groups.set(key, list);
  }

  return (
    <>
      <div className="no-print" style={{ marginBottom: 16 }}>
        <div className="actions">
          <Link className="btn btn-secondary" href="/uitjes">Terug naar evenementen</Link>
          <PrintButton label="Programma afdrukken" />
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-trim.png" alt="Logo Stichting Diligence Almere" style={{ height: 70, width: "auto" }} />
          <div>
            <div className="small muted">Stichting Diligence Almere</div>
            <h1 style={{ margin: "2px 0", fontSize: "1.7rem" }}>Programma {period.name}</h1>
            <div className="small muted">
              Opgave telefonisch via 036-2022044 of per e-mail via info@diligence-almere.nl
            </div>
          </div>
        </div>

        {outings.length === 0 ? (
          <p className="muted">Er staan nog geen evenementen in deze periode.</p>
        ) : (
          [...groups.entries()].map(([month, list]) => (
            <section key={month} style={{ marginTop: 22 }}>
              <h2 style={{ fontSize: "1.2rem", textTransform: "capitalize", borderBottom: "2px solid var(--accent)", paddingBottom: 6 }}>
                {monthLabel(`${month}-01`)}
              </h2>
              <div className="list">
                {list.map((outing) => (
                  <div key={outing.id} className="person-line" style={{ alignItems: "flex-start" }}>
                    <span className="who" style={{ minWidth: 170 }}>
                      {formatDate(outing.date)}
                      <span className="small muted">
                        <br />
                        {outing.start_time}–{outing.end_time}
                      </span>
                    </span>
                    <span style={{ flex: 1, paddingLeft: 12 }}>
                      <strong>{outing.description}</strong>
                      {outing.series_name ? (
                        <span className="small muted"> · {outing.series_name}</span>
                      ) : null}
                      <span className="small muted">
                        <br />
                        {outing.labels ? `${outing.labels} · ` : ""}
                        {outing.less_suitable_walkers ? "minder geschikt voor rollators · " : ""}
                        {outing.capacity} plekken
                      </span>
                    </span>
                    <span className="why" style={{ minWidth: 80, textAlign: "right" }}>
                      {formatMoney(outing.price_cents)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        <p className="small muted" style={{ marginTop: 24 }}>
          Het programma is onder voorbehoud van wijzigingen. Neem bij vragen contact op met de
          coördinator.
        </p>
      </div>

      <div className="no-print" style={{ marginTop: 16 }}>
        <Link className="btn btn-secondary" href="/uitjes">Terug naar evenementen</Link>
        <PrintButton label="Programma afdrukken" />
      </div>
    </>
  );
}
