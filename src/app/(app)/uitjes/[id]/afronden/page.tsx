import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { formatDateLong, formatPhone } from "@/lib/format";
import { getLatestConfirmedRun, getPeriodById, type Outing } from "@/lib/queries";
import { saveAttendanceAction } from "@/app/actions";
import { Alert, BackLink, EmptyState, PageHeader } from "@/components/ui";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("program.manage");
  const { id } = await params;
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", id);
  if (!outing) notFound();
  const period = getPeriodById(outing.period_id);
  if (!period) notFound();

  const run = getLatestConfirmedRun(period.id);
  if (!run) {
    return (
      <>
        <PageHeader
          title="Aanwezigheid registreren"
          intro={`${outing.description} · ${formatDateLong(outing.date)}`}
          nextStep="Bevestig eerst de indeling."
          actions={<BackLink href={`/uitjes/${outing.id}`}>Terug naar het uitje</BackLink>}
        />
        <EmptyState title="Nog geen bevestigde indeling">
          Er is nog geen bevestigde indeling voor deze periode. Bevestig eerst de indeling.
        </EmptyState>
      </>
    );
  }

  const assigned = all<{
    participant_id: string;
    first_name: string;
    last_name: string;
    phone: string;
    group_name: string | null;
  }>(
    `SELECT a.participant_id, p.first_name, p.last_name, p.phone, g.name AS group_name
       FROM allocations a
       JOIN participants p ON p.id = a.participant_id
       LEFT JOIN "groups" g ON g.id = a.group_id
      WHERE a.run_id = ? AND a.outing_id = ? AND a.status = 'assigned'
      ORDER BY p.last_name, p.first_name`,
    run.id,
    outing.id,
  );
  const existing = new Set(
    all<{ participant_id: string }>(
      "SELECT participant_id FROM attendance WHERE outing_id = ? AND present = 1",
      outing.id,
    ).map((row) => row.participant_id),
  );
  const hasRegistration = existing.size > 0;

  return (
    <>
      <PageHeader
        title="Aanwezigheid registreren"
        intro={`${outing.description} · ${formatDateLong(outing.date)} · ${outing.start_time}–${outing.end_time}`}
        nextStep="Vink aan wie er echt mee was. Daarna wordt het uitje afgerond en telt de deelname mee voor de eerlijke indeling."
        actions={<BackLink href={`/uitjes/${outing.id}`}>Terug naar het uitje</BackLink>}
      />

      {outing.status === "completed" ? (
        <Alert kind="info">Dit uitje is al afgerond. Je kunt de aanwezigheid nog corrigeren.</Alert>
      ) : null}

      {assigned.length === 0 ? (
        <EmptyState title="Niemand ingedeeld">Er zijn geen deelnemers aan dit uitje toegewezen.</EmptyState>
      ) : (
        <form action={saveAttendanceAction} className="card">
          <input type="hidden" name="outing_id" value={outing.id} />
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Wie was er?</h2>
            <span className="small muted">{assigned.length} ingedeeld</span>
          </div>
          <p className="muted">
            Laat uitgevinkte personen leeg als ze niet zijn meegeweest. Bij een eerste registratie
            staat iedereen aangevinkt.
          </p>
          <div className="choice-list">
            {assigned.map((row) => (
              <label key={row.participant_id} className="choice">
                <input
                  type="checkbox"
                  name="present"
                  value={row.participant_id}
                  defaultChecked={!hasRegistration || existing.has(row.participant_id)}
                />
                <span>
                  <span className="title">
                    {row.first_name} {row.last_name}
                    {row.group_name ? <span className="small muted"> · {row.group_name}</span> : null}
                  </span>
                  <span className="sub">{formatPhone(row.phone)}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Aanwezigheid opslaan en uitje afronden</button>
            <Link className="btn btn-secondary" href={`/uitjes/${outing.id}/daglijst`}>Daglijst</Link>
          </div>
        </form>
      )}
    </>
  );
}
