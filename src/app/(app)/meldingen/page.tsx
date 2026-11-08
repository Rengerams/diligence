import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { handleAlertAction } from "./actions";
import { Alert, BackLink, EmptyState, PageHeader } from "@/components/ui";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requirePermission("program.manage");
  const { ok, error } = await searchParams;
  const alerts = all<{
    id: string;
    message: string;
    created_at: string;
    outing_id: string;
    description: string;
    date: string;
    first_name: string | null;
    last_name: string | null;
  }>(
    `SELECT a.id, a.message, a.created_at, a.outing_id, o.description, o.date,
            p.first_name, p.last_name
       FROM alerts a
       JOIN outings o ON o.id = a.outing_id
       LEFT JOIN participants p ON p.id = a.participant_id
      WHERE a.status = 'open'
      ORDER BY a.created_at DESC`,
  );

  return (
    <>
      <PageHeader
        title="Meldingen"
        intro="Plekken die vrijkomen nadat de indeling rond is. De coördinator bekijkt ze zelf; de app plaatst niet automatisch iemand anders."
        nextStep="Bel of mail zelf iemand van de reservelijst en vink de melding daarna af."
        actions={<BackLink href="/uitjes">Terug naar uitjes</BackLink>}
      />
      {ok ? <Alert kind="success">Opgeslagen.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      {alerts.length === 0 ? (
        <EmptyState title="Geen open meldingen">
          Er zijn geen vrije plekken gemeld.
        </EmptyState>
      ) : (
        <div className="list">
          {alerts.map((alert) => (
            <div className="card" key={alert.id}>
              <div className="section-title" style={{ marginTop: 0 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{alert.description}</h2>
                  <span className="small muted">
                    {formatDate(alert.date)}
                    {alert.first_name ? ` · ${alert.first_name} ${alert.last_name}` : ""}
                  </span>
                </div>
                <Link className="btn btn-secondary" href={`/uitjes/${alert.outing_id}`}>
                  Naar uitje
                </Link>
              </div>
              <p>{alert.message || "Er is een plek vrijgekomen."}</p>
              <form action={handleAlertAction}>
                <input type="hidden" name="id" value={alert.id} />
                <button className="btn btn-primary" type="submit">Afgehandeld</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
