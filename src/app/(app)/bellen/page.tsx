import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { formatDate, formatPhone } from "@/lib/format";
import { getActivePeriod, getLatestConfirmedRun } from "@/lib/queries";
import { updateCallTaskAction } from "@/app/actions";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui";

export default async function CallListPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requirePermission("calls.manage");
  const { ok, error } = await searchParams;
  const period = getActivePeriod();
  const run = period ? getLatestConfirmedRun(period.id) : undefined;

  const tasks = run
    ? all<{
        id: string;
        status: string;
        message: string;
        kind: string;
        outing_id: string;
        outing_date: string;
        description: string;
        first_name: string;
        last_name: string;
        phone: string;
        group_name: string | null;
      }>(
        `SELECT t.id, t.status, t.message, t.kind, t.outing_id,
                o.date AS outing_date, o.description,
                p.first_name, p.last_name, p.phone, g.name AS group_name
           FROM call_tasks t
           JOIN outings o ON o.id = t.outing_id
           JOIN participants p ON p.id = t.participant_id
           LEFT JOIN "groups" g ON g.id = (
             SELECT gm.group_id FROM group_members gm
              WHERE gm.participant_id = p.id AND gm.active = 1 LIMIT 1
           )
          WHERE t.run_id = ?
          ORDER BY o.date, o.start_time, p.last_name`,
        run.id,
      )
    : [];

  const open = tasks.filter((task) => task.status === "to_call").length;
  const byOuting = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const list = byOuting.get(task.outing_id) ?? [];
    list.push(task);
    byOuting.set(task.outing_id, list);
  }

  return (
    <>
      <PageHeader
        title="Bellijst"
        intro="Bel de deelnemers over hun plaatsing of reservering. Eén klik legt vast wat je hebt afgesproken."
        nextStep={
          !run
            ? "Er is nog geen bevestigde indeling. Bevestig eerst de indeling."
            : open > 0
              ? `Er ${open === 1 ? "is" : "zijn"} nog ${open} telefoontje${open === 1 ? "" : "s"} te doen.`
              : "Alle telefoontjes zijn afgehandeld."
        }
        actions={
          run ? (
            <>
              <Link className="btn btn-secondary" href="/indeling">Naar de indeling</Link>
              <Link className="btn btn-secondary" href="/berichten">Naar de e-mailwachtrij</Link>
            </>
          ) : null
        }
      />

      {ok ? <Alert kind="success">Beltaak bijgewerkt.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      {!run ? (
        <EmptyState
          title="Nog geen bellijst"
          action={<Link className="btn btn-primary" href="/indeling">Naar de indeling</Link>}
        >
          De bellijst ontstaat zodra de indeling is bevestigd.
        </EmptyState>
      ) : tasks.length === 0 ? (
        <EmptyState title="Geen telefoontjes">Er zijn geen taken voor deze indeling.</EmptyState>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <strong>{tasks.length}</strong>
              <span>taken</span>
            </div>
            <div className="stat">
              <strong>{open}</strong>
              <span>nog te bellen</span>
            </div>
            <div className="stat">
              <strong>{tasks.filter((task) => task.status === "called").length}</strong>
              <span>gebeld</span>
            </div>
            <div className="stat">
              <strong>{tasks.filter((task) => task.status === "declined").length}</strong>
              <span>kan niet</span>
            </div>
          </div>

          <div className="list">
            {[...byOuting.entries()].map(([outingId, list]) => (
              <div key={outingId} className="card">
                <div className="section-title" style={{ marginTop: 0 }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{list[0].description}</h2>
                    <span className="small muted">{formatDate(list[0].outing_date)}</span>
                  </div>
                  <Badge tone={list.some((task) => task.status === "to_call") ? "warning" : "success"}>
                    {list.filter((task) => task.status === "to_call").length} open
                  </Badge>
                </div>

                <div className="list">
                  {list.map((task) => (
                    <div key={task.id} className="card" style={{ padding: 14, boxShadow: "none" }}>
                      <div className="section-title" style={{ marginTop: 0 }}>
                        <div>
                          <strong>
                            {task.first_name} {task.last_name}
                            {task.group_name ? <span className="small muted"> · {task.group_name}</span> : null}
                          </strong>
                          <div className="small muted">{formatPhone(task.phone)}</div>
                        </div>
                        <Badge
                          tone={
                            task.status === "called"
                              ? "success"
                              : task.status === "declined"
                                ? "warning"
                                : task.status === "not_reached"
                                  ? "muted"
                                  : "accent"
                          }
                        >
                          {task.status === "to_call"
                            ? "Nog bellen"
                            : task.status === "called"
                              ? "Gebeld"
                              : task.status === "declined"
                                ? "Kan niet"
                                : "Niet bereikt"}
                        </Badge>
                      </div>
                      <p className="small" style={{ marginBottom: 10 }}>{task.message}</p>
                      <div className="btn-row">
                        <form action={updateCallTaskAction}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value="called" />
                          <button className="btn btn-primary" type="submit">Gebeld</button>
                        </form>
                        <form action={updateCallTaskAction}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value="not_reached" />
                          <button className="btn btn-secondary" type="submit">Niet bereikt</button>
                        </form>
                        <form action={updateCallTaskAction}>
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value="declined" />
                          <button className="btn btn-secondary" type="submit">Kan niet</button>
                        </form>
                      </div>
                      {task.kind === "waitlist" && task.status === "declined" ? (
                        <p className="small" style={{ color: "var(--warning)" }}>
                          Deze reserverist kan niet. De volgende op de reservelijst moet worden
                          gebeld.
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
