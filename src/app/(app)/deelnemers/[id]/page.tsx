import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatDate, formatMoney, formatPhone, fullName, statusLabel } from "@/lib/format";
import { getParticipant } from "@/lib/queries";
import { anonymizeParticipantAction } from "@/app/actions";
import { Alert, Badge, BackLink, PageHeader } from "@/components/ui";

export default async function ParticipantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requirePermission("participants.view");
  const { id } = await params;
  const { ok, error } = await searchParams;
  const participant = getParticipant(id);
  if (!participant) notFound();

  const groupMembers = participant.group_id
    ? all<{ id: string; first_name: string; last_name: string }>(
        `SELECT p.id, p.first_name, p.last_name
           FROM group_members gm
           JOIN participants p ON p.id = gm.participant_id
          WHERE gm.group_id = ? AND gm.active = 1
          ORDER BY p.last_name`,
        participant.group_id,
      )
    : [];

  const signups = all<{
    id: string;
    target_type: string;
    series_key: string;
    note: string;
    created_at: string;
    outing_id: string | null;
    date: string | null;
    start_time: string | null;
    description: string | null;
    price_cents: number | null;
  }>(
    `SELECT s.id, s.target_type, s.series_key, s.note, s.created_at,
            o.id AS outing_id, o.date, o.start_time, o.description, o.price_cents
       FROM signups s
       LEFT JOIN outings o ON o.id = s.outing_id
      WHERE s.participant_id = ? AND s.status = 'active'
      ORDER BY COALESCE(o.date, '9999-12-31'), o.start_time`,
    participant.id,
  );

  const history = all<{ id: string; visit_date: string; description: string }>(
    "SELECT id, visit_date, description FROM historical_visits WHERE participant_id = ? ORDER BY visit_date DESC LIMIT 12",
    participant.id,
  );

  return (
    <>
      <PageHeader
        title={fullName(participant)}
        intro={`${formatPhone(participant.phone)}${participant.city ? ` · ${participant.city}` : ""}`}
        nextStep="Bekijk de gegevens en het groepje. Met de knop hiernaast voer je een telefonische opgave in."
        actions={
          <>
            <Link className="btn btn-primary" href={`/opgave?participantId=${participant.id}`}>
              Opgave invoeren
            </Link>
            <a className="btn btn-secondary" href={`/deelnemers/${participant.id}/export`}>
              Gegevens exporteren
            </a>
            <BackLink href="/deelnemers">Terug</BackLink>
          </>
        }
      />

      {ok ? <Alert kind="success">{ok}</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="two-col">
        <div>
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Gegevens</h2>
              <Badge
                tone={
                  participant.status === "active"
                    ? "success"
                    : participant.status === "paused"
                      ? "warning"
                      : "muted"
                }
              >
                {statusLabel(participant.status)}
              </Badge>
            </div>
            <dl className="definition">
              <dt>Telefoon</dt>
              <dd>{formatPhone(participant.phone) || "Niet bekend"}</dd>
              <dt>Tweede telefoon</dt>
              <dd>{formatPhone(participant.phone_alt) || "—"}</dd>
              <dt>E-mail</dt>
              <dd>{participant.email || "—"}</dd>
              <dt>Voorkeur</dt>
              <dd>
                {participant.contact_preference === "phone"
                  ? "Telefoon"
                  : participant.contact_preference === "email"
                    ? "E-mail"
                    : "Allebei"}
              </dd>
              <dt>Adres</dt>
              <dd>
                {[participant.street, participant.house_number].filter(Boolean).join(" ")}
                {participant.postal_code || participant.city ? (
                  <>
                    <br />
                    {participant.postal_code} {participant.city}
                  </>
                ) : null}
              </dd>
              <dt>Kaarten</dt>
              <dd>{participant.cards || "Geen"}</dd>
              <dt>Mobiliteit</dt>
              <dd>
                {[
                  participant.mobility_walker ? "rollator" : "",
                  participant.mobility_wheelchair ? "rolstoel" : "",
                  participant.mobility_help_boarding ? "hulp bij instappen" : "",
                ]
                  .filter(Boolean)
                  .join(", ") || "Geen bijzonderheden"}
              </dd>
              <dt>Noodcontact</dt>
              <dd>
                {participant.emergency_name
                  ? `${participant.emergency_name} · ${formatPhone(participant.emergency_phone)}`
                  : "—"}
              </dd>
            </dl>
            {participant.notes ? (
              <>
                <div className="divider" />
                <h3>Notitie</h3>
                <p>{participant.notes}</p>
              </>
            ) : null}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Opgaven</h2>
              <span className="small muted">{signups.length} actief</span>
            </div>
            {signups.length === 0 ? (
              <p className="muted">Deze persoon heeft nog geen opgave voor de lopende periode.</p>
            ) : (
              <div className="list">
                {signups.map((signup) => (
                  <div key={signup.id} className="row-card" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div>
                      <div className="title">
                        {signup.target_type === "period"
                          ? "Alle uitjes van de periode"
                          : signup.description ?? "Uitje"}
                      </div>
                      <div className="sub">
                        {signup.date ? formatDate(signup.date) : "Hele periode"}
                        {signup.start_time ? ` · ${signup.start_time}` : ""}
                        {signup.price_cents !== null ? ` · ${formatMoney(signup.price_cents)}` : ""}
                      </div>
                      {signup.note ? <div className="small muted">Notitie: {signup.note}</div> : null}
                    </div>
                    <Badge tone="success">Opgegeven</Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="actions">
              <Link className="btn btn-secondary" href={`/opgave?participantId=${participant.id}`}>
                Opgave wijzigen
              </Link>
            </div>
          </div>
        </div>

        <aside>
          <div className="card">
            <h2>Groepje</h2>
            {participant.group_name ? (
              <>
                <p>
                  <strong>{participant.group_name}</strong>
                </p>
                <div className="meta">
                  {groupMembers.map((member) => (
                    <Badge key={member.id}>{member.first_name} {member.last_name}</Badge>
                  ))}
                </div>
                <p className="small muted" style={{ marginTop: 12 }}>
                  Als deze persoon met het groepje meegaat, neemt het systeem alle leden mee.
                </p>
              </>
            ) : (
              <p className="muted">Deze persoon zit niet in een groepje.</p>
            )}
          </div>

          <div className="card">
            <h2>Bezoekgeschiedenis</h2>
            {history.length === 0 ? (
              <p className="muted">Nog geen eerdere bezoeken bekend. Deze persoon is nieuw.</p>
            ) : (
              <div className="list">
                {history.map((visit) => (
                  <div key={visit.id} className="person-line">
                    <span className="who">{formatDate(visit.visit_date)}</span>
                    <span className="why">{visit.description || "Uitje"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>Privacy</h2>
            <p className="small muted">
              De deelnemer heeft recht op inzage en verwijdering. Exporteer de gegevens of
              anonimiseer het dossier. Deelname-statistieken blijven zonder naam bewaard.
            </p>
            <div className="actions">
              <a className="btn btn-secondary" href={`/deelnemers/${participant.id}/export`}>
                Gegevens exporteren
              </a>
            </div>
            {can(user, "participants.manage") && !participant.anonymized_at ? (
              <details style={{ marginTop: 12 }}>
                <summary>Deelnemer anonimiseren</summary>
                <p className="small" style={{ marginTop: 8 }}>
                  Naam, adres, telefoon, e-mail, notities en kaarten worden gewist. Dit kan niet
                  ongedaan worden gemaakt.
                </p>
                <form action={anonymizeParticipantAction}>
                  <input type="hidden" name="participant_id" value={participant.id} />
                  <button className="btn btn-danger" type="submit">
                    Definitief anonimiseren
                  </button>
                </form>
              </details>
            ) : participant.anonymized_at ? (
              <p className="small muted">Dit dossier is geanonimiseerd.</p>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
