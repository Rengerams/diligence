import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { createUserAction, updateUserAction } from "./actions";
import { Alert, Badge, PageHeader } from "@/components/ui";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const actor = await requirePermission("users.manage");
  const { ok, error } = await searchParams;
  const users = all<{
    id: string;
    name: string;
    email: string;
    role_key: string | null;
    role_name: string | null;
    active: number;
    two_factor_enabled: number;
  }>(
    `SELECT u.id, u.name, u.email, COALESCE(u.role_key, u.role) AS role_key,
            COALESCE(r.name, u.role) AS role_name, u.active, u.two_factor_enabled
       FROM users u
       LEFT JOIN roles r ON r.key = COALESCE(u.role_key, u.role)
      ORDER BY u.name`,
  );
  const roles = all<{ key: string; name: string }>(
    "SELECT key, name FROM roles ORDER BY is_system DESC, name",
  );

  return (
    <>
      <PageHeader
        title="Gebruikers"
        intro="Maak accounts aan en wijs een rol toe. Rechten horen bij de rol, niet bij de persoon."
        nextStep="Nieuwe vrijwilligers krijgen een eigen account. Schakel een account uit in plaats van het te verwijderen."
      />

      {ok ? <Alert kind="success">De gebruiker is opgeslagen.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="list">
        {users.map((user) => (
          <div className="card" key={user.id}>
            <div className="section-title" style={{ marginTop: 0 }}>
              <div>
                <h2 style={{ margin: 0 }}>{user.name}</h2>
                <span className="small muted">{user.email}</span>
              </div>
              <div className="meta">
                <Badge tone={user.active ? "success" : "muted"}>
                  {user.active ? "Actief" : "Uitgeschakeld"}
                </Badge>
                <Badge tone={user.two_factor_enabled ? "success" : "muted"}>
                  2FA {user.two_factor_enabled ? "aan" : "uit"}
                </Badge>
              </div>
            </div>

            <form action={updateUserAction}>
              <input type="hidden" name="id" value={user.id} />
              <div className="form-grid">
                <div className="field">
                  <label htmlFor={`role-${user.id}`}>Rol</label>
                  <select id={`role-${user.id}`} name="role_key" defaultValue={user.role_key ?? "coordinator"}>
                    {roles.map((role) => (
                      <option key={role.key} value={role.key}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <span className="label">Toegang</span>
                  <label className="check">
                    <input type="checkbox" name="active" defaultChecked={Boolean(user.active)} />
                    Account is actief
                  </label>
                </div>
              </div>
              <div className="actions">
                <button className="btn btn-secondary" type="submit">Opslaan</button>
                <Link className="btn btn-secondary" href={`/wijzigingen?actor=${user.id}`}>
                  Activiteit bekijken
                </Link>
                {user.id === actor.id ? (
                  <span className="small muted">Dit is je eigen account.</span>
                ) : null}
              </div>
            </form>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Nieuwe gebruiker</h2>
        <form action={createUserAction}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="new-name">Naam</label>
              <input id="new-name" name="name" required autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="new-email">E-mailadres</label>
              <input id="new-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="new-password">Tijdelijk wachtwoord</label>
              <input
                id="new-password"
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
              <span className="help">Minstens 8 tekens; de gebruiker kan het later niet zelf wijzigen.</span>
            </div>
            <div className="field">
              <label htmlFor="new-role">Rol</label>
              <select id="new-role" name="role_key" required>
                {roles.map((role) => (
                  <option key={role.key} value={role.key}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Gebruiker aanmaken</button>
          </div>
        </form>
      </div>
    </>
  );
}
