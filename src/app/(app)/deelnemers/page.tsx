import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { formatPhone, fullName, statusLabel } from "@/lib/format";
import { searchParticipants } from "@/lib/search";
import type { Participant } from "@/lib/queries";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ok?: string; error?: string }>;
}) {
  await requirePermission("participants.view");
  const { q = "", ok, error } = await searchParams;
  const rows = all<Participant>(
    `SELECT p.*, gm.group_id, g.name AS group_name
       FROM participants p
       LEFT JOIN group_members gm ON gm.participant_id = p.id AND gm.active = 1
       LEFT JOIN "groups" g ON g.id = gm.group_id
      WHERE p.archived_at IS NULL
      ORDER BY p.last_name, p.first_name`,
  );

  const results = q.trim() ? searchParticipants(rows, q) : rows;

  return (
    <>
      <PageHeader
        title="Deelnemers"
        intro="Zoek een deelnemer op naam of telefoonnummer. Klik op de naam voor de gegevens, het groepje en de opgaven."
        nextStep={
          q
            ? `${results.length} resultaten voor “${q}”. Kies de juiste persoon of pas de zoekopdracht aan.`
            : "Zoek een deelnemer of voeg iemand nieuw toe."
        }
        actions={
          <>
            <Link className="btn btn-primary" href="/deelnemers/nieuw">
              Nieuwe deelnemer
            </Link>
            <Link className="btn btn-secondary" href="/deelnemers/import">
              Deelnemers importeren
            </Link>
            <Link className="btn btn-secondary" href="/deelnemers/geschiedenis">
              Geschiedenis importeren
            </Link>
            <Link className="btn btn-secondary" href="/deelnemers/opschonen">
              Opschonen
            </Link>
          </>
        }
      />

      {ok ? <Alert kind="success">{ok}</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="card">
        <form method="get" action="/deelnemers" className="actions" style={{ marginTop: 0 }}>
          <div className="field" style={{ flex: "1 1 320px" }}>
            <label htmlFor="q">Zoeken op naam of telefoonnummer</label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Bijvoorbeeld: Jan de Vr of 06 12 34"
              autoComplete="off"
            />
            <span className="help">Een deel van de naam en kleine typefouten zijn genoeg.</span>
          </div>
          <button className="btn btn-primary" type="submit">
            Zoeken
          </button>
          {q ? (
            <Link className="btn btn-secondary" href="/deelnemers">
              Wis zoekopdracht
            </Link>
          ) : null}
        </form>
      </div>

      <div className="section-title">
        <h2>{q ? "Zoekresultaten" : "Alle deelnemers"}</h2>
        <span className="small muted">{results.length} personen</span>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="Niemand gevonden"
          action={
            <Link className="btn btn-primary" href="/deelnemers/nieuw">
              Nieuwe deelnemer toevoegen
            </Link>
          }
        >
          Controleer de spelling of zoek op een deel van het telefoonnummer.
        </EmptyState>
      ) : (
        <div className="list">
          {results.map((participant) => (
            <Link
              key={participant.id}
              href={`/deelnemers/${participant.id}`}
              className="row-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div>
                <div className="title">{fullName(participant)}</div>
                <div className="sub">
                  {formatPhone(participant.phone)}
                  {participant.city ? ` · ${participant.city}` : ""}
                </div>
                <div className="meta">
                  {participant.group_name ? (
                    <Badge tone="muted">Groepje: {participant.group_name}</Badge>
                  ) : null}
                  {participant.mobility_walker ? <Badge tone="warning">Rollator</Badge> : null}
                  {participant.mobility_wheelchair ? <Badge tone="warning">Rolstoel</Badge> : null}
                  {participant.cards ? <Badge tone="accent">{participant.cards}</Badge> : null}
                </div>
              </div>
              <div className="small muted">
                {participant.email || "Geen e-mailadres"}
                <br />
                {participant.contact_preference === "phone"
                  ? "Voorkeur: telefoon"
                  : participant.contact_preference === "email"
                    ? "Voorkeur: e-mail"
                    : "Voorkeur: allebei"}
              </div>
              <div>
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
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
