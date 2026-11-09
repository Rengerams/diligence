import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { formatDate, formatMoney, statusLabel } from "@/lib/format";
import {
  getActivePeriod,
  getLatestRun,
  getOutings,
  getPeriodById,
  type Outing,
} from "@/lib/queries";
import {
  assignManuallyAction,
  calculateAllocationAction,
  confirmAllocationAction,
} from "@/app/actions";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui";

export default async function AllocationPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    ok?: string;
    confirmed?: string;
    manual?: string;
    error?: string;
  }>;
}) {
  await requirePermission("allocation.manage");
  const { period: periodId, ok, confirmed, manual, error } = await searchParams;
  const period = periodId ? getPeriodById(periodId) : getActivePeriod();

  if (!period) {
    return (
      <EmptyState title="Nog geen periode" action={<Link className="btn btn-primary" href="/uitjes">Naar evenementen</Link>}>
        Er is nog geen actieve periode om in te delen.
      </EmptyState>
    );
  }

  const outings = getOutings(period.id);
  const run = getLatestRun(period.id);
  const today = new Date().toISOString().slice(0, 10);
  const canCalculate = period.deadline < today;

  const rows = run
    ? all<{
        id: string;
        outing_id: string;
        participant_id: string;
        status: "assigned" | "waitlist" | "tie";
        reason_text: string;
        rank: number;
        first_name: string;
        last_name: string;
        group_name: string | null;
      }>(
        `SELECT a.id, a.outing_id, a.participant_id, a.status, a.reason_text, a.rank,
                p.first_name, p.last_name, g.name AS group_name
           FROM allocations a
           JOIN participants p ON p.id = a.participant_id
           LEFT JOIN "groups" g ON g.id = a.group_id
          WHERE a.run_id = ?
          ORDER BY p.last_name, p.first_name`,
        run.id,
      )
    : [];

  const byOuting = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byOuting.get(row.outing_id) ?? [];
    list.push(row);
    byOuting.set(row.outing_id, list);
  }

  const assignedCount = rows.filter((row) => row.status === "assigned").length;
  const waitlistCount = rows.filter((row) => row.status === "waitlist").length;
  const tieCount = rows.filter((row) => row.status === "tie").length;

  return (
    <>
      <PageHeader
        title="Eerlijke indeling"
        intro={`${period.name}. Het systeem doet een voorstel met uitleg; de coördinator houdt altijd het laatste woord.`}
        nextStep={
          !canCalculate
            ? `De opgavedeadline is ${formatDate(period.deadline)}. Na de deadline kan het voorstel worden berekend.`
            : run?.phase === "confirmed"
              ? "De indeling is bevestigd. Werk de bellijst af en print de daglijsten."
              : run
                ? "Bekijk het voorstel, los een gelijke stand op en bevestig daarna."
                : "Bereken het voorstel. Er wordt nog niets bevestigd of verstuurd."
        }
        actions={
          <>
            {run?.phase === "confirmed" ? (
              <>
                <Link className="btn btn-primary" href="/bellen">Naar de bellijst</Link>
                <Link className="btn btn-secondary" href="/berichten">Naar de e-mailwachtrij</Link>
              </>
            ) : null}
            <Link className="btn btn-secondary" href={`/indeling/proef?period=${period.id}`}>
              Proefmodus
            </Link>
            <Link className="btn btn-secondary" href={`/indeling/vergelijken?period=${period.id}`}>
              Verschillen
            </Link>
            <Link className="btn btn-secondary" href="/uitjes">Programma</Link>
          </>
        }
      />

      {ok ? <Alert kind="success">Het voorstel is berekend. Er is nog niets bevestigd of verstuurd.</Alert> : null}
      {confirmed ? (
        <Alert kind="success">
          De indeling is bevestigd. De bellijst en de e-mailwachtrij staan klaar.
        </Alert>
      ) : null}
      {manual ? <Alert kind="success">De handmatige plaatsing is opgeslagen.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      {!run ? (
        <div className="card">
          <h2>Voorstel berekenen</h2>
          <p className="muted">
            Het systeem plaatst eerst de vaste opgaven, daarna de flexibele opgaven. Nieuwe
            deelnemers en mensen die lang niet meededen krijgen voorrang. Groepjes blijven bij
            elkaar.
          </p>
          {!canCalculate ? (
            <Alert kind="warning">
              De opgavedeadline is nog niet verstreken. Na {formatDate(period.deadline)} kan de
              indeling worden berekend.
            </Alert>
          ) : (
            <form action={calculateAllocationAction}>
              <input type="hidden" name="period_id" value={period.id} />
              <button className="btn btn-primary" type="submit">
                Voorstel berekenen
              </button>
            </form>
          )}
        </div>
      ) : (
        <>
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Uitkomst</h2>
              <Badge tone={run.phase === "confirmed" ? "success" : "warning"}>
                {run.phase === "confirmed" ? "Bevestigd" : "Voorstel"}
              </Badge>
            </div>
            <div className="stats" style={{ marginBottom: 0 }}>
              <div className="stat">
                <strong>{assignedCount}</strong>
                <span>geplaatst</span>
              </div>
              <div className="stat">
                <strong>{waitlistCount}</strong>
                <span>op de reservelijst</span>
              </div>
              <div className="stat">
                <strong>{tieCount}</strong>
                <span>gelijke stand</span>
              </div>
              <div className="stat">
                <strong>{rows.length}</strong>
                <span>beslissingen</span>
              </div>
            </div>

            {tieCount > 0 ? (
              <Alert kind="warning">
                Er {tieCount === 1 ? "is" : "zijn"} {tieCount} plek
                {tieCount === 1 ? "" : "ken"} met een gelijke stand. Die plekken zijn nog niet
                verdeeld; de coördinator beslist.
              </Alert>
            ) : null}

            {run.phase === "proposal" ? (
              <div className="actions">
                <form action={calculateAllocationAction}>
                  <input type="hidden" name="period_id" value={period.id} />
                  <button className="btn btn-secondary" type="submit">
                    Opnieuw berekenen
                  </button>
                </form>
                <form action={confirmAllocationAction}>
                  <input type="hidden" name="run_id" value={run.id} />
                  <button className="btn btn-primary" type="submit">
                    Indeling bevestigen
                  </button>
                </form>
              </div>
            ) : null}
            {run.phase === "proposal" ? (
              <p className="small muted" style={{ marginTop: 10 }}>
                Bevestigen zet de bellijst klaar. Er wordt nog geen e-mail verstuurd.
              </p>
            ) : null}
          </div>

          <div className="section-title">
            <h2>Per evenement</h2>
            <span className="small muted">Klik op een evenement voor de daglijst</span>
          </div>

          <div className="list">
            {outings.map((outing: Outing) => {
              const list = byOuting.get(outing.id) ?? [];
              const assigned = list.filter((row) => row.status === "assigned");
              const waitlist = list
                .filter((row) => row.status === "waitlist")
                .sort((a, b) => a.rank - b.rank);
              const ties = list.filter((row) => row.status === "tie");
              const free = Math.max(0, outing.capacity - assigned.length);

              return (
                <div key={outing.id} className="card">
                  <div className="section-title" style={{ marginTop: 0 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>
                        <Link href={`/uitjes/${outing.id}`}>{outing.description}</Link>
                      </h3>
                      <span className="small muted">
                        {formatDate(outing.date)} · {outing.start_time}–{outing.end_time} ·{" "}
                        {formatMoney(outing.price_cents)}
                      </span>
                    </div>
                    <Badge tone={free === 0 ? "muted" : "success"}>
                      {assigned.length}/{outing.capacity} bezet
                    </Badge>
                  </div>

                  {assigned.length === 0 && waitlist.length === 0 && ties.length === 0 ? (
                    <p className="muted">Geen opgaven voor dit evenement.</p>
                  ) : null}

                  {assigned.length ? (
                    <div className="assigned-list">
                      {assigned.map((row) => (
                        <div key={row.id} className="person-line">
                          <span className="who">
                            {row.first_name} {row.last_name}
                            {row.group_name ? <span className="small muted"> · {row.group_name}</span> : null}
                          </span>
                          <span className="why">{row.reason_text}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {ties.length ? (
                    <>
                      <div className="divider" />
                      <strong>Gelijke stand: coördinator beslist</strong>
                      <div className="assigned-list">
                        {ties.map((row) => (
                          <div key={row.id} className="person-line">
                            <span className="who">{row.first_name} {row.last_name}</span>
                            <span className="why">{row.reason_text}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {waitlist.length ? (
                    <>
                      <div className="divider" />
                      <strong>Reservelijst</strong>
                      <div className="assigned-list">
                        {waitlist.map((row) => (
                          <div key={row.id} className="person-line">
                            <span className="who">
                              {row.rank}. {row.first_name} {row.last_name}
                              {row.group_name ? <span className="small muted"> · {row.group_name}</span> : null}
                            </span>
                            {run.phase === "proposal" ? (
                              <form action={assignManuallyAction}>
                                <input type="hidden" name="run_id" value={run.id} />
                                <input type="hidden" name="outing_id" value={outing.id} />
                                <input type="hidden" name="participant_id" value={row.participant_id} />
                                <button className="btn btn-secondary" type="submit">
                                  Toch plaatsen
                                </button>
                              </form>
                            ) : (
                              <span className="why">{row.reason_text}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
