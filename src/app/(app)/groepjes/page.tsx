import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import {
  addGroupMemberAction,
  archiveGroupAction,
  createGroupAction,
  removeGroupMemberAction,
  renameGroupAction,
} from "./actions";
import { Alert, Badge, PageHeader } from "@/components/ui";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requirePermission("groups.manage");
  const { ok, error } = await searchParams;

  const groups = all<{ id: string; name: string; created_at: string }>(
    'SELECT id, name, created_at FROM "groups" WHERE archived_at IS NULL ORDER BY name',
  );
  const members = all<{
    group_id: string;
    participant_id: string;
    first_name: string;
    last_name: string;
    last_name_prefix: string;
  }>(
    `SELECT gm.group_id, gm.participant_id, p.first_name, p.last_name, p.last_name_prefix
       FROM group_members gm
       JOIN participants p ON p.id = gm.participant_id
      WHERE gm.active = 1 AND p.archived_at IS NULL
      ORDER BY p.last_name, p.first_name`,
  );
  const available = all<{
    id: string;
    first_name: string;
    last_name: string;
    last_name_prefix: string;
  }>(
    `SELECT p.id, p.first_name, p.last_name, p.last_name_prefix
       FROM participants p
      WHERE p.archived_at IS NULL AND p.status <> 'stopped'
        AND NOT EXISTS (
          SELECT 1 FROM group_members gm WHERE gm.participant_id = p.id AND gm.active = 1
        )
      ORDER BY p.last_name, p.first_name`,
  );

  return (
    <>
      <PageHeader
        title="Groepjes"
        intro="Koppel deelnemers die altijd samen meegaan. Een groepje wordt bij de opgave en de indeling als geheel behandeld."
        nextStep="Maak een groepje of voeg een deelnemer toe. Iemand kan maar in één groepje zitten."
      />

      {ok ? <Alert kind="success">Het groepje is bijgewerkt.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      {groups.length === 0 ? (
        <div className="empty">
          <h2>Nog geen groepjes</h2>
          <p>Maak hieronder het eerste groepje aan.</p>
        </div>
      ) : (
        <div className="list">
          {groups.map((group) => {
            const groupMembers = members.filter((member) => member.group_id === group.id);
            return (
              <div className="card" key={group.id}>
                <div className="section-title" style={{ marginTop: 0 }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{group.name}</h2>
                    <span className="small muted">
                      {groupMembers.length} lid{groupMembers.length === 1 ? "" : "en"}
                    </span>
                  </div>
                  <Badge tone={groupMembers.length > 1 ? "success" : "muted"}>
                    {groupMembers.length > 1 ? "Compleet groepje" : "Los lid"}
                  </Badge>
                </div>

                <div className="meta">
                  {groupMembers.map((member) => (
                    <span key={member.participant_id} className="badge badge-muted">
                      {member.first_name} {member.last_name_prefix} {member.last_name}
                    </span>
                  ))}
                </div>

                <div className="form-grid" style={{ marginTop: 14 }}>
                  <form action={renameGroupAction} className="field">
                    <input type="hidden" name="id" value={group.id} />
                    <label htmlFor={`name-${group.id}`}>Naam wijzigen</label>
                    <div className="btn-row">
                      <input id={`name-${group.id}`} name="name" defaultValue={group.name} required />
                      <button className="btn btn-secondary" type="submit">Opslaan</button>
                    </div>
                  </form>

                  <form action={addGroupMemberAction} className="field">
                    <input type="hidden" name="group_id" value={group.id} />
                    <label htmlFor={`member-${group.id}`}>Deelnemer toevoegen</label>
                    <div className="btn-row">
                      <select id={`member-${group.id}`} name="participant_id" required>
                        <option value="">Kies een deelnemer</option>
                        {available.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.first_name} {participant.last_name}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-secondary" type="submit">Toevoegen</button>
                    </div>
                  </form>
                </div>

                {groupMembers.length ? (
                  <div className="actions">
                    {groupMembers.map((member) => (
                      <form key={member.participant_id} action={removeGroupMemberAction}>
                        <input type="hidden" name="group_id" value={group.id} />
                        <input type="hidden" name="participant_id" value={member.participant_id} />
                        <button className="btn-link" type="submit">
                          {member.first_name} eruit halen
                        </button>
                      </form>
                    ))}
                  </div>
                ) : null}

                <form action={archiveGroupAction} className="actions">
                  <input type="hidden" name="id" value={group.id} />
                  <button className="btn btn-danger" type="submit">Groepje opheffen</button>
                  <span className="small muted">Leden blijven bestaan; alleen de koppeling vervalt.</span>
                </form>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Nieuw groepje</h2>
        <form action={createGroupAction} className="actions">
          <div className="field" style={{ flex: "1 1 280px" }}>
            <label htmlFor="new-group">Naam</label>
            <input id="new-group" name="name" required placeholder="Bijv. De Wandelaars" />
          </div>
          <button className="btn btn-primary" type="submit">Groepje aanmaken</button>
        </form>
      </div>

      <p className="small muted" style={{ marginTop: 16 }}>
        Groepjes zijn ook zichtbaar op de <Link href="/deelnemers">deelnemerspagina</Link> en in de
        deelnemerslijst van een uitje.
      </p>
    </>
  );
}
