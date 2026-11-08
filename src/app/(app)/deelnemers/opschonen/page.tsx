import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { formatDate, formatPhone, fullName } from "@/lib/format";
import { cleanupParticipantAction } from "@/app/actions";
import { Alert, Badge, BackLink, PageHeader } from "@/components/ui";

export default async function CleanupPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string; ok?: string }>;
}) {
  await requirePermission("participants.manage");
  const { months: monthsParam = "24", ok } = await searchParams;
  const months = Math.min(120, Math.max(1, Number.parseInt(monthsParam, 10) || 24));
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const rows = all<{
    id: string;
    first_name: string;
    last_name_prefix: string;
    last_name: string;
    phone: string;
    last_visit: string | null;
    visits: number;
  }>(
    `SELECT * FROM (
       SELECT p.id, p.first_name, p.last_name_prefix, p.last_name, p.phone,
              MAX(v.visit_date) AS last_visit,
              COUNT(v.visit_date) AS visits
         FROM participants p
         LEFT JOIN (
           SELECT participant_id, visit_date FROM historical_visits
           UNION ALL
           SELECT a.participant_id, o.date AS visit_date
             FROM attendance a JOIN outings o ON o.id = a.outing_id
            WHERE a.present = 1
         ) v ON v.participant_id = p.id
        WHERE p.archived_at IS NULL AND p.status = 'active'
        GROUP BY p.id
     )
     WHERE last_visit IS NULL OR last_visit < ?
     ORDER BY last_visit IS NULL DESC, last_visit, last_name`,
    cutoffISO,
  );

  return (
    <>
      <PageHeader
        title="Opschonen"
        intro={`Deze deelnemers zijn actief, maar hebben in de laatste ${months} maanden niet meegedaan of hebben geen bekend bezoek.`}
        nextStep="Bekijk de lijst en kies per persoon: pauzeren of archiveren. Niets doen betekent actief laten; er wordt niets automatisch verwijderd."
        actions={<BackLink href="/deelnemers">Terug naar deelnemers</BackLink>}
      />

      {ok ? <Alert kind="success">De keuze is opgeslagen.</Alert> : null}

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Beoordelen</h2>
          <Badge tone={rows.length ? "warning" : "success"}>{rows.length} personen</Badge>
        </div>
        <p className="muted">
          De termijn is instelbaar. Een deelnemer die hier staat, is niet automatisch gestopt; de
          coördinator beslist.
        </p>
        <form method="get" action="/deelnemers/opschonen" className="actions">
          <div className="field">
            <label htmlFor="months">Laatste bezoek ouder dan</label>
            <select id="months" name="months" defaultValue={String(months)}>
              <option value="12">12 maanden</option>
              <option value="24">24 maanden</option>
              <option value="36">36 maanden</option>
              <option value="60">60 maanden</option>
            </select>
          </div>
          <button className="btn btn-secondary" type="submit">Lijst bijwerken</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>
          <h3>Niets te beoordelen</h3>
          <p>Alle actieve deelnemers hebben binnen {months} maanden meegedaan.</p>
        </div>
      ) : (
        <div className="list" style={{ marginTop: 20 }}>
          {rows.map((row) => (
            <div key={row.id} className="card" style={{ padding: 18 }}>
              <div className="row-card" style={{ border: 0, padding: 0, boxShadow: "none" }}>
                <div>
                  <div className="title">{fullName(row)}</div>
                  <div className="sub">
                    {formatPhone(row.phone) || "geen telefoon"} ·{" "}
                    {row.last_visit ? `laatst ${formatDate(row.last_visit)}` : "nooit meegeweest"} ·{" "}
                    {row.visits} bezoek{row.visits === 1 ? "" : "en"}
                  </div>
                </div>
                <div />
                <div className="btn-row">
                  <form action={cleanupParticipantAction}>
                    <input type="hidden" name="participant_id" value={row.id} />
                    <input type="hidden" name="decision" value="pause" />
                    <button className="btn btn-secondary" type="submit">Pauzeren</button>
                  </form>
                  <form action={cleanupParticipantAction}>
                    <input type="hidden" name="participant_id" value={row.id} />
                    <input type="hidden" name="decision" value="archive" />
                    <button className="btn btn-danger" type="submit">Archiveren</button>
                  </form>
                  <Link className="btn btn-secondary" href={`/deelnemers/${row.id}`}>
                    Bekijken
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
