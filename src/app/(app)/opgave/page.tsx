import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { formatDate, formatMoney, formatPhone, fullName } from "@/lib/format";
import { searchParticipants } from "@/lib/search";
import {
  getActivePeriod,
  getOutings,
  getParticipant,
  getParticipantGroup,
  type Participant,
} from "@/lib/queries";
import { saveSignups } from "@/app/actions";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; participantId?: string; ok?: string; error?: string }>;
}) {
  await requirePermission("signups.manage");
  const { q = "", participantId, ok, error } = await searchParams;
  const period = getActivePeriod();

  if (!period) {
    return (
      <EmptyState title="Nog geen periode" action={<Link className="btn btn-primary" href="/uitjes">Naar evenementen</Link>}>
        Er is nog geen actieve periode. Maak eerst een periode en evenementen aan.
      </EmptyState>
    );
  }

  if (!participantId) {
    const rows = all<Participant>(
      `SELECT p.*, gm.group_id, g.name AS group_name
         FROM participants p
         LEFT JOIN group_members gm ON gm.participant_id = p.id AND gm.active = 1
         LEFT JOIN "groups" g ON g.id = gm.group_id
        WHERE p.archived_at IS NULL AND p.status <> 'stopped'
        ORDER BY p.last_name, p.first_name`,
    );
    const results = q.trim() ? searchParticipants(rows, q) : rows;

    return (
      <>
        <PageHeader
          title="Telefonische opgave"
          intro="Zoek eerst de deelnemer. Daarna zie je alle evenementen van de periode op één scherm."
          nextStep="Zoek op naam of telefoonnummer en kies de juiste persoon."
        />

        <div className="card">
          <form method="get" action="/opgave" className="actions" style={{ marginTop: 0 }}>
            <div className="field" style={{ flex: "1 1 320px" }}>
              <label htmlFor="q">Deelnemer zoeken</label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Naam of telefoonnummer"
                autoComplete="off"
              />
            </div>
            <button className="btn btn-primary" type="submit">Zoeken</button>
          </form>
        </div>

        <div className="section-title">
          <h2>{q ? "Zoekresultaten" : "Kies een deelnemer"}</h2>
          <span className="small muted">{results.length} personen</span>
        </div>

        {results.length === 0 ? (
          <EmptyState title="Niemand gevonden">Probeer een andere spelling of een deel van het telefoonnummer.</EmptyState>
        ) : (
          <div className="list">
            {results.map((participant) => (
              <Link
                key={participant.id}
                href={`/opgave?participantId=${participant.id}`}
                className="row-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div>
                  <div className="title">{fullName(participant)}</div>
                  <div className="sub">{formatPhone(participant.phone)}</div>
                </div>
                <div className="small muted">
                  {participant.group_name ? `Groepje: ${participant.group_name}` : "Geen groepje"}
                </div>
                <span className="btn btn-secondary">Opgave</span>
              </Link>
            ))}
          </div>
        )}
      </>
    );
  }

  const participant = getParticipant(participantId);
  if (!participant) {
    return <EmptyState title="Deelnemer niet gevonden" action={<Link className="btn btn-primary" href="/opgave">Terug</Link>}>Deze deelnemer bestaat niet meer.</EmptyState>;
  }
  const group = getParticipantGroup(participant.id);
  const outings = getOutings(period.id);
  const existing = all<{
    id: string;
    target_type: string;
    outing_id: string | null;
    group_mode: string;
    note: string;
  }>(
    "SELECT id, target_type, outing_id, group_mode, note FROM signups WHERE participant_id = ? AND period_id = ? AND status = 'active'",
    participant.id,
    period.id,
  );
  const allMode = existing.some((row) => row.target_type === "period");
  const selected = new Set(existing.map((row) => row.outing_id).filter(Boolean) as string[]);
  const groupMode = existing.some((row) => row.group_mode === "with_group") ? "with_group" : group ? "with_group" : "alone";
  const note = existing[0]?.note ?? "";
  const afterDeadline = period.deadline < new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title={`Opgave: ${fullName(participant)}`}
        intro={`${formatPhone(participant.phone)} · ${participant.city || "Almere"}${group ? ` · groepje ${group.name}` : ""}`}
        nextStep="Vink de evenementen aan of kies 'alle evenementen'. Controleer daarna de bevestigingsregel en sla op."
        actions={
          <>
            <Link className="btn btn-secondary" href="/opgave">Andere deelnemer</Link>
            <Link className="btn btn-secondary" href={`/deelnemers/${participant.id}`}>Deelnemer</Link>
          </>
        }
      />

      {ok ? (
        <Alert kind="success">
          De opgave is opgeslagen. Lees de bevestigingsregel hieronder voor aan de telefoon.
        </Alert>
      ) : null}
      {error ? <Alert kind="error">{error}</Alert> : null}
      {afterDeadline ? (
        <Alert kind="warning">
          De opgavedeadline is verstreken. Je kunt de opgave alleen met een reden aanpassen; de
          wijziging komt in het wijzigingsoverzicht.
        </Alert>
      ) : null}

      <div className="two-col">
        <form action={saveSignups} className="card">
          <input type="hidden" name="participant_id" value={participant.id} />
          <input type="hidden" name="period_id" value={period.id} />

          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Wat heeft deze persoon opgegeven?</h2>
            <Badge tone={allMode ? "accent" : "muted"}>
              {allMode ? "Alle evenementen" : `${existing.length} gekozen`}
            </Badge>
          </div>

          <div className="choice-list">
            <label className="choice">
              <input type="radio" name="mode" value="specific" defaultChecked={!allMode} />
              <span>
                <span className="title">Specifieke evenementen</span>
                <span className="sub">Kies hieronder de evenementen waarvoor deze persoon belt.</span>
              </span>
            </label>
            <label className="choice">
              <input type="radio" name="mode" value="all" defaultChecked={allMode} />
              <span>
                <span className="title">Alle evenementen van deze periode</span>
                <span className="sub">
                  Eén plek per uniek evenement. Bij een reeks kiest het systeem één datum.
                </span>
              </span>
            </label>
          </div>

          <div className="section-title">
            <h2>Evenementen</h2>
            <span className="small muted">Vink aan waarvoor de persoon meegaat</span>
          </div>
          <div className="choice-list">
            {outings.map((outing) => (
              <label key={outing.id} className="choice">
                <input
                  type="checkbox"
                  name="outing_ids"
                  value={outing.id}
                  defaultChecked={selected.has(outing.id)}
                />
                <span>
                  <span className="title">{outing.description}</span>
                  <span className="sub">
                    {formatDate(outing.date)} · {outing.start_time}–{outing.end_time} ·{" "}
                    {formatMoney(outing.price_cents)} · {outing.capacity} plekken
                    {outing.series_name ? ` · reeks ${outing.series_name}` : ""}
                  </span>
                  {outing.less_suitable_walkers && (participant.mobility_walker || participant.mobility_wheelchair) ? (
                    <span className="badge badge-warning" style={{ marginTop: 6 }}>
                      Let op: minder geschikt voor rollators
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>

          <div className="section-title">
            <h2>Groepje en notitie</h2>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="group_mode">Met groepje of alleen?</label>
              <select
                id="group_mode"
                name="group_mode"
                defaultValue={group ? groupMode : "alone"}
                disabled={!group}
              >
                {group ? <option value="with_group">Met groepje: {group.name}</option> : null}
                <option value="alone">Alleen</option>
              </select>
              {group ? (
                <span className="help">
                  Het groepje wordt automatisch meegenomen, tenzij je “Alleen” kiest.
                </span>
              ) : (
                <span className="help">Deze persoon zit niet in een groepje.</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="note">Notitie (optioneel)</label>
              <input id="note" name="note" defaultValue={note} placeholder="Bijv. graag naast mevrouw Jansen" />
            </div>
            {afterDeadline ? (
              <div className="field full">
                <label htmlFor="override_reason">Reden voor wijziging na de deadline</label>
                <input id="override_reason" name="override_reason" required placeholder="Bijv. deelnemer belde later door ziekte" />
              </div>
            ) : null}
          </div>

          <div className="actions">
            <button className="btn btn-primary" type="submit">Opgave opslaan</button>
            <Link className="btn btn-secondary" href={`/deelnemers/${participant.id}`}>Annuleren</Link>
          </div>
        </form>

        <aside>
          <div className="card">
            <h2>Bevestigingsregel</h2>
            <p className="small muted">
              Deze regel lees je voor aan de telefoon. Hij wordt pas definitief na opslaan.
            </p>
            <div className="alert alert-info">
              {allMode
                ? `${participant.first_name} ${participant.last_name} doet mee met alle evenementen van ${period.name}.`
                : selected.size
                  ? `${participant.first_name} ${participant.last_name} is opgegeven voor ${selected.size} evenement${selected.size === 1 ? "" : "en"}.`
                  : "Nog geen evenement gekozen."}
              {group ? " Het groepje gaat mee." : ""}
            </div>
          </div>

          {group ? (
            <div className="card">
              <h2>Groepje</h2>
              <p><strong>{group.name}</strong></p>
              <div className="meta">
                {all<{ id: string; first_name: string; last_name: string }>(
                  `SELECT p.id, p.first_name, p.last_name
                     FROM group_members gm JOIN participants p ON p.id = gm.participant_id
                    WHERE gm.group_id = ? AND gm.active = 1
                    ORDER BY p.last_name`,
                  group.id,
                ).map((member) => (
                  <Badge key={member.id}>{member.first_name} {member.last_name}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card">
            <h2>Al opgegeven</h2>
            {existing.length === 0 ? (
              <p className="muted">Nog geen opgave voor deze periode.</p>
            ) : (
              <div className="list">
                {existing.map((row) => {
                  const outing = outings.find((item) => item.id === row.outing_id);
                  return (
                    <div key={row.id} className="person-line">
                      <span className="who">
                        {row.target_type === "period" ? "Alle evenementen" : outing?.description ?? "Evenement"}
                      </span>
                      <span className="why">
                        {outing ? formatDate(outing.date) : "Hele periode"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
