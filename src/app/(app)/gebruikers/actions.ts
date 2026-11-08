"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { get, run } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/passwords";

function value(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function checked(form: FormData, key: string): boolean {
  return form.get(key) === "on";
}

function legacyRole(roleKey: string): "admin" | "coordinator" | "driver" {
  if (roleKey === "admin" || roleKey === "coordinator" || roleKey === "driver") {
    return roleKey;
  }
  return "coordinator";
}

export async function createUserAction(form: FormData): Promise<void> {
  const user = await requirePermission("users.manage");
  const name = value(form, "name");
  const email = value(form, "email").toLowerCase();
  const password = value(form, "password");
  const roleKey = value(form, "role_key");

  if (!name || !email || !roleKey) {
    redirect("/gebruikers?error=Vul+naam,+e-mailadres+en+rol+in.");
  }
  if (password.length < 8) {
    redirect("/gebruikers?error=Het+wachtwoord+moet+minimaal+8+tekens+hebben.");
  }
  if (get("SELECT id FROM users WHERE lower(email) = ?", email)) {
    redirect("/gebruikers?error=Dit+e-mailadres+bestaat+al.");
  }
  const role = get<{ key: string; name: string }>("SELECT key, name FROM roles WHERE key = ?", roleKey);
  if (!role) redirect("/gebruikers?error=Rol+niet+gevonden.");

  const id = `u-${randomUUID()}`;
  run(
    `INSERT INTO users (id, name, email, password_hash, role, role_key, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    id,
    name,
    email,
    hashPassword(password),
    legacyRole(roleKey),
    roleKey,
    new Date().toISOString(),
  );
  writeAudit({
    actor: user,
    action: "user.create",
    entityType: "user",
    entityId: id,
    summary: `Gebruiker ${name} is aangemaakt met rol ${role.name}.`,
    after: { email, roleKey },
  });
  revalidatePath("/gebruikers");
  redirect("/gebruikers?ok=1");
}

export async function updateUserAction(form: FormData): Promise<void> {
  const actor = await requirePermission("users.manage");
  const id = value(form, "id");
  const roleKey = value(form, "role_key");
  const active = checked(form, "active");
  const existing = get<{ name: string; role_key: string | null; active: number }>(
    "SELECT name, role_key, active FROM users WHERE id = ?",
    id,
  );
  if (!existing) redirect("/gebruikers?error=Gebruiker+niet+gevonden.");
  if (id === actor.id && !active) {
    redirect("/gebruikers?error=Je+kunt+je+eigen+account+niet+uitschakelen.");
  }
  if (id === actor.id && roleKey !== "admin") {
    redirect("/gebruikers?error=Je+kunt+je+eigen+adminrol+niet+weggeven.");
  }
  const role = get<{ key: string }>("SELECT key FROM roles WHERE key = ?", roleKey);
  if (!role) redirect("/gebruikers?error=Rol+niet+gevonden.");

  run(
    "UPDATE users SET role_key = ?, role = ?, active = ? WHERE id = ?",
    roleKey,
    legacyRole(roleKey),
    active ? 1 : 0,
    id,
  );
  writeAudit({
    actor,
    action: "user.update",
    entityType: "user",
    entityId: id,
    summary: `Gebruiker ${existing.name} is gewijzigd naar rol ${roleKey}${active ? "" : " en uitgeschakeld"}.`,
    before: { roleKey: existing.role_key, active: existing.active },
    after: { roleKey, active },
  });
  revalidatePath("/gebruikers");
  redirect("/gebruikers?ok=1");
}
