import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { PageHeader } from "@/components/ui";

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    "auth.login": "Ingelogd",
    "auth.logout": "Uitgelogd",
    "auth.login_failed": "Mislukte inlogpoging",
    "auth.2fa": "Tweede stap voltooid",
    "auth.2fa_start": "2FA-installatie gestart",
    "auth.2fa_enable": "2FA aangezet",
    "auth.2fa_disable": "2FA uitgezet",
    "participant.create": "Deelnemer toegevoegd",
    "participant.update": "Deelnemer gewijzigd",
    "participant.pause": "Deelnemer gepauzeerd",
    "participant.archive": "Deelnemer gearchiveerd",
    "participant.email_unsubscribe": "E-mail afgemeld",
    "participant.import": "Deelnemers geïmporteerd",
    "signup.save": "Opgave opgeslagen",
    "allocation.calculate": "Indeling berekend",
    "allocation.confirm": "Indeling bevestigd",
    "allocation.manual": "Handmatig ingedeeld",
    "allocation.manual_import": "Proefindeling geïmporteerd",
    "call_task.update": "Beltaak bijgewerkt",
    "notification.send": "E-mail verzonden",
    "notification.send_all": "E-mailwachtrij verwerkt",
    "vehicle.create": "Voertuig toegevoegd",
    "vehicle.update": "Voertuig gewijzigd",
    "outing.create": "Uitje toegevoegd",
    "outing.capacity": "Capaciteit gewijzigd",
    "outing.vehicle_add": "Voertuig gekoppeld",
    "outing.vehicle_remove": "Voertuig verwijderd",
    "outing.vehicles_auto": "Voertuigen voorgesteld",
    "outing.driver": "Chauffeur gewijzigd",
    "program.import": "Programma geïmporteerd",
    "program.import_undo": "Import ongedaan gemaakt",
    "role.create": "Rol aangemaakt",
    "role.update": "Rol gewijzigd",
    "role.delete": "Rol verwijderd",
    "user.create": "Gebruiker aangemaakt",
    "user.update": "Gebruiker gewijzigd",
  };
  return labels[action] ?? action;
}

function formatJson(value: string | null): string {
  if (!value) return "";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    actor?: string;
    action?: string;
    from?: string;
    to?: string;
  }>;
}) {
  await requirePermission("audit.view");
  const { q = "", actor = "", action = "", from = "", to = "" } = await searchParams;
  const search = q.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (search) {
    conditions.push("(summary LIKE ? OR actor_name LIKE ? OR action LIKE ? OR entity_id LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (actor) {
    conditions.push("actor_id = ?");
    params.push(actor);
  }
  if (action) {
    conditions.push("action = ?");
    params.push(action);
  }
  if (from) {
    conditions.push("at >= ?");
    params.push(`${from}T00:00:00.000Z`);
  }
  if (to) {
    conditions.push("at <= ?");
    params.push(`${to}T23:59:59.999Z`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = all<{
    id: number;
    at: string;
    actor_id: string | null;
    actor_name: string;
    actor_role: string;
    action: string;
    entity_type: string;
    entity_id: string;
    summary: string;
    before_json: string | null;
    after_json: string | null;
  }>(
    `SELECT id, at, actor_id, actor_name, actor_role, action, entity_type, entity_id,
            summary, before_json, after_json
       FROM audit_log
       ${where}
      ORDER BY id DESC
      LIMIT 250`,
    ...params,
  );

  const actors = all<{ id: string; name: string }>(
    "SELECT id, name FROM users ORDER BY name",
  );
  const actions = all<{ action: string }>(
    "SELECT DISTINCT action FROM audit_log ORDER BY action",
  );

  return (
    <>
      <PageHeader
        title="Wijzigingsoverzicht"
        intro="Hier staat wie wat heeft gedaan, wanneer en met welke oude en nieuwe waarde. Het overzicht is niet te wijzigen of te verwijderen."
        nextStep="Filter op medewerker, actie of datum om een gebeurtenis terug te vinden."
      />

      <div className="card">
        <form method="get" action="/wijzigingen">
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="q">Zoeken</label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Bijv. Jan, indeling, e-mail of een entiteit-id"
              />
            </div>
            <div className="field">
              <label htmlFor="actor">Medewerker</label>
              <select id="actor" name="actor" defaultValue={actor}>
                <option value="">Alle medewerkers</option>
                {actors.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="action">Actie</label>
              <select id="action" name="action" defaultValue={action}>
                <option value="">Alle acties</option>
                {actions.map((item) => (
                  <option key={item.action} value={item.action}>
                    {actionLabel(item.action)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="from">Vanaf</label>
              <input id="from" name="from" type="date" defaultValue={from} />
            </div>
            <div className="field">
              <label htmlFor="to">Tot en met</label>
              <input id="to" name="to" type="date" defaultValue={to} />
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Filteren</button>
            <a className="btn btn-secondary" href="/wijzigingen">Alles tonen</a>
          </div>
        </form>
      </div>

      <div className="section-title">
        <h2>Gebeurtenissen</h2>
        <span className="small muted">{rows.length} regels (maximaal 250)</span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <h2>Geen gebeurtenissen</h2>
          <p>Pas de filters aan of wis ze om alles te zien.</p>
        </div>
      ) : (
        <div className="list">
          {rows.map((row) => (
            <div key={row.id} className="card" style={{ padding: 16 }}>
              <div className="section-title" style={{ marginTop: 0 }}>
                <strong>{row.summary}</strong>
                <span className="small muted">
                  {new Intl.DateTimeFormat("nl-NL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(row.at))}
                </span>
              </div>
              <div className="small muted">
                {row.actor_name}
                {row.actor_role ? ` (${row.actor_role})` : ""} · {actionLabel(row.action)} ·{" "}
                {row.entity_type}
                {row.entity_id ? ` #${row.entity_id}` : ""}
              </div>
              {row.before_json || row.after_json ? (
                <details className="small" style={{ marginTop: 8 }}>
                  <summary>Oude en nieuwe waarde</summary>
                  {row.before_json ? (
                    <>
                      <strong>Voor</strong>
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                        {formatJson(row.before_json)}
                      </pre>
                    </>
                  ) : null}
                  {row.after_json ? (
                    <>
                      <strong>Na</strong>
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                        {formatJson(row.after_json)}
                      </pre>
                    </>
                  ) : null}
                </details>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
