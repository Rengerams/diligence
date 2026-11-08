import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, run } from "./db";
import { can, canAny, parsePermissions, type PermissionKey } from "./permissions";

export const SESSION_COOKIE = "diligence_session";
const SESSION_HOURS = 8;

export type Role = string;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleName: string;
  permissions: string[];
  mfaVerified: boolean;
  twoFactorEnabled: boolean;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = get<{
    id: string;
    name: string;
    email: string;
    role_key: string;
    role_name: string;
    permissions: string;
    expires_at: string;
    last_seen_at: string | null;
    active: number;
    mfa_verified: number;
    two_factor_enabled: number;
  }>(
    `SELECT u.id, u.name, u.email,
            COALESCE(u.role_key, u.role) AS role_key,
            COALESCE(r.name, u.role) AS role_name,
            COALESCE(r.permissions, '[]') AS permissions,
            s.expires_at, s.last_seen_at, u.active, s.mfa_verified, u.two_factor_enabled
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN roles r ON r.key = COALESCE(u.role_key, u.role)
      WHERE s.token = ?`,
    token,
  );

  if (!row || row.active !== 1 || new Date(row.expires_at).getTime() < Date.now()) {
    return null;
  }

  const idleMinutes = Math.max(5, Number(process.env.SESSION_IDLE_MINUTES ?? 60));
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : Date.now();
  if (Date.now() - lastSeen > idleMinutes * 60 * 1000) {
    run("DELETE FROM sessions WHERE token = ?", token);
    return null;
  }
  run(
    "UPDATE sessions SET last_seen_at = ? WHERE token = ?",
    new Date().toISOString(),
    token,
  );

  const permissions =
    row.role_key === "admin" ? ["*"] : parsePermissions(row.permissions);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role_key,
    roleName: row.role_name,
    permissions,
    mfaVerified: row.mfa_verified === 1,
    twoFactorEnabled: row.two_factor_enabled === 1,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mfaVerified) redirect("/login/2fa");
  if (
    process.env.ENFORCE_2FA === "true" &&
    user.role === "admin" &&
    !user.twoFactorEnabled
  ) {
    redirect("/account/beveiliging?verplicht=1");
  }
  return user;
}

export async function requirePermission(permission: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) {
    redirect("/?melding=Geen+toegang+tot+dit+onderdeel");
  }
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (
    !canAny(user, [
      "program.view",
      "participants.view",
      "allocation.manage",
      "signups.manage",
      "vehicles.view",
    ])
  ) {
    redirect("/?melding=Geen+toegang+tot+dit+onderdeel");
  }
  return user;
}

export function createSession(
  userId: string,
  mfaVerified = true,
): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  run(
    `INSERT INTO sessions (token, user_id, expires_at, created_at, last_seen_at, mfa_verified)
     VALUES (?, ?, ?, ?, ?, ?)`,
    token,
    userId,
    expiresAt.toISOString(),
    new Date().toISOString(),
    new Date().toISOString(),
    mfaVerified ? 1 : 0,
  );
  return { token, expiresAt };
}

export function deleteSession(token: string): void {
  run("DELETE FROM sessions WHERE token = ?", token);
}
