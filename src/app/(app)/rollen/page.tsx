import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { PERMISSIONS, parsePermissions } from "@/lib/permissions";
import { createRoleAction, deleteRoleAction, updateRoleAction } from "./actions";
import { Alert, Badge, PageHeader } from "@/components/ui";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requirePermission("roles.manage");
  const { ok, error } = await searchParams;
  const roles = all<{
    key: string;
    name: string;
    description: string;
    permissions: string;
    is_system: number;
    user_count: number;
  }>(
    `SELECT r.key, r.name, r.description, r.permissions, r.is_system,
            (SELECT COUNT(*) FROM users u WHERE u.role_key = r.key) AS user_count
       FROM roles r
      ORDER BY r.is_system DESC, r.name`,
  );

  const permissionBoxes = (selected: string[]) => (
    <div className="grid two">
      {PERMISSIONS.map((permission) => (
        <label className="check" key={permission.key}>
          <input
            type="checkbox"
            name="permissions"
            value={permission.key}
            defaultChecked={selected.includes(permission.key)}
          />
          {permission.label}
        </label>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Rollen en rechten"
        intro="Bepaal per rol wat iemand mag zien en doen. Rechten worden op de server gecontroleerd, niet alleen in het menu."
        nextStep="Maak een eigen rol of bekijk de rechten van de systeemrollen. Systeemrollen kunnen niet worden verwijderd."
      />

      {ok ? <Alert kind="success">De rol is opgeslagen.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="list">
        {roles.map((role) => {
          const selected = role.permissions === '["*"]' ? ["*"] : parsePermissions(role.permissions);
          return (
            <div className="card" key={role.key}>
              <div className="section-title" style={{ marginTop: 0 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{role.name}</h2>
                  <span className="small muted">{role.key}</span>
                </div>
                <div className="meta">
                  {role.is_system ? <Badge tone="muted">Systeemrol</Badge> : <Badge tone="accent">Eigen rol</Badge>}
                  <Badge>{role.user_count} gebruiker{role.user_count === 1 ? "" : "s"}</Badge>
                </div>
              </div>
              <p className="muted">{role.description || "Geen omschrijving."}</p>
              <div className="meta">
                {selected.includes("*") ? (
                  <Badge tone="success">Alle rechten</Badge>
                ) : selected.length ? (
                  selected.map((key) => (
                    <Badge key={key}>
                      {PERMISSIONS.find((permission) => permission.key === key)?.label ?? key}
                    </Badge>
                  ))
                ) : (
                  <span className="small muted">Geen rechten</span>
                )}
              </div>

              {!role.is_system ? (
                <details style={{ marginTop: 14 }}>
                  <summary>Rol wijzigen</summary>
                  <form action={updateRoleAction} style={{ marginTop: 12 }}>
                    <input type="hidden" name="key" value={role.key} />
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor={`name-${role.key}`}>Naam</label>
                        <input id={`name-${role.key}`} name="name" defaultValue={role.name} required />
                      </div>
                      <div className="field">
                        <label htmlFor={`desc-${role.key}`}>Omschrijving</label>
                        <input id={`desc-${role.key}`} name="description" defaultValue={role.description} />
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>{permissionBoxes(selected)}</div>
                    <div className="actions">
                      <button className="btn btn-secondary" type="submit">Opslaan</button>
                    </div>
                  </form>
                  <form action={deleteRoleAction} className="actions">
                    <input type="hidden" name="key" value={role.key} />
                    <button className="btn btn-danger" type="submit" disabled={role.user_count > 0}>
                      Rol verwijderen
                    </button>
                    {role.user_count > 0 ? (
                      <span className="small muted">Eerst gebruikers een andere rol geven.</span>
                    ) : null}
                  </form>
                </details>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Nieuwe rol</h2>
        <form action={createRoleAction}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="role-name">Naam</label>
              <input id="role-name" name="name" required placeholder="Bijv. Balie" />
            </div>
            <div className="field">
              <label htmlFor="role-key">Technische naam (optioneel)</label>
              <input id="role-key" name="key" placeholder="balie" />
            </div>
            <div className="field full">
              <label htmlFor="role-description">Omschrijving</label>
              <input id="role-description" name="description" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>{permissionBoxes([])}</div>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Rol aanmaken</button>
          </div>
        </form>
      </div>
    </>
  );
}
