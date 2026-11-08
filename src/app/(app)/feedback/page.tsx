import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { can } from "@/lib/permissions";
import { handleFeedbackAction, sendFeedbackAction } from "./actions";
import { Alert, Badge, PageHeader } from "@/components/ui";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; from?: string }>;
}) {
  const user = await requireUser();
  const { ok, error, from = "" } = await searchParams;
  const canManage = can(user, "feedback.manage");

  const rows = all<{
    id: string;
    route: string;
    message: string;
    status: string;
    created_at: string;
    user_name: string;
    handled_name: string | null;
  }>(
    `SELECT f.id, f.route, f.message, f.status, f.created_at,
            u.name AS user_name, h.name AS handled_name
       FROM feedback f
       LEFT JOIN users u ON u.id = f.user_id
       LEFT JOIN users h ON h.id = f.handled_by
      ${canManage ? "" : "WHERE f.user_id = ?"}
      ORDER BY f.created_at DESC
      LIMIT 100`,
    ...(canManage ? [] : [user.id]),
  );

  return (
    <>
      <PageHeader
        title="Feedback"
        intro="Iets onduidelijk of werkt het niet goed? Vertel het hier. De beheerder ziet je melding en kan hem afhandelen."
        nextStep="Schrijf in gewone woorden wat er aan de hand is. Je hoeft geen technische termen te gebruiken."
      />

      {ok ? <Alert kind="success">Bedankt, je feedback is opgeslagen.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="card">
        <h2>Melding doorgeven</h2>
        <form action={sendFeedbackAction}>
          <input type="hidden" name="route" value={from} />
          <div className="field">
            <label htmlFor="message">Wat ging er mis of wat is onduidelijk?</label>
            <textarea
              id="message"
              name="message"
              required
              placeholder="Bijvoorbeeld: ik kan de knop 'Opgave opslaan' niet vinden."
            />
          </div>
          {from ? <p className="small muted">Scherm: {from}</p> : null}
          <div className="actions">
            <button className="btn btn-primary" type="submit">Feedback versturen</button>
          </div>
        </form>
      </div>

      <div className="section-title">
        <h2>{canManage ? "Alle feedback" : "Mijn feedback"}</h2>
        <span className="small muted">{rows.length} meldingen</span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <h2>Nog geen feedback</h2>
          <p>Meldingen verschijnen hier zodra iemand iets doorgeeft.</p>
        </div>
      ) : (
        <div className="list">
          {rows.map((row) => (
            <div className="card" key={row.id}>
              <div className="section-title" style={{ marginTop: 0 }}>
                <div>
                  <strong>{row.user_name ?? "Onbekend"}</strong>
                  <div className="small muted">
                    {new Intl.DateTimeFormat("nl-NL", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(row.created_at))}
                    {row.route ? ` · ${row.route}` : ""}
                  </div>
                </div>
                <Badge
                  tone={
                    row.status === "done"
                      ? "success"
                      : row.status === "in_progress"
                        ? "warning"
                        : "accent"
                  }
                >
                  {row.status === "done"
                    ? "Afgehandeld"
                    : row.status === "in_progress"
                      ? "In behandeling"
                      : "Nieuw"}
                </Badge>
              </div>
              <p>{row.message}</p>
              {row.handled_name ? (
                <p className="small muted">Afgehandeld door {row.handled_name}.</p>
              ) : null}
              {canManage && row.status !== "done" ? (
                <form action={handleFeedbackAction} className="actions">
                  <input type="hidden" name="id" value={row.id} />
                  <button className="btn btn-secondary" type="submit" name="status" value="in_progress">
                    In behandeling
                  </button>
                  <button className="btn btn-primary" type="submit" name="status" value="done">
                    Afgehandeld
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
