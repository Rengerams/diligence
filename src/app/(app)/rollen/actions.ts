"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { get, run } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";

function value(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function selectedPermissions(form: FormData): string[] {
  const allowed = new Set(PERMISSIONS.map((permission) => permission.key));
  return [...new Set(form.getAll("permissions").map(String))].filter((permission) =>
    allowed.has(permission as never),
  );
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function createRoleAction(form: FormData): Promise<void> {
  const user = await requirePermission("roles.manage");
  const name = value(form, "name");
  const description = value(form, "description");
  const key = slug(value(form, "key") || name);
  if (!name || !key) {
    redirect("/rollen?error=Vul+een+naam+in.");
  }
  if (get("SELECT key FROM roles WHERE key = ?", key)) {
    redirect("/rollen?error=Deze+rolnaam+bestaat+al.");
  }
  const permissions = selectedPermissions(form);
  run(
    "INSERT INTO roles (key, name, description, permissions, is_system, created_at) VALUES (?, ?, ?, ?, 0, ?)",
    key,
    name,
    description,
    JSON.stringify(permissions),
    new Date().toISOString(),
  );
  writeAudit({
    actor: user,
    action: "role.create",
    entityType: "role",
    entityId: key,
    summary: `Rol ${name} is aangemaakt.`,
    after: { key, permissions },
  });
  revalidatePath("/rollen");
  redirect("/rollen?ok=1");
}

export async function updateRoleAction(form: FormData): Promise<void> {
  const user = await requirePermission("roles.manage");
  const key = value(form, "key");
  const role = get<{ is_system: number; name: string }>(
    "SELECT is_system, name FROM roles WHERE key = ?",
    key,
  );
  if (!role) redirect("/rollen?error=Rol+niet+gevonden.");
  if (role.is_system) redirect("/rollen?error=Systeemrollen+kunnen+niet+worden+gewijzigd.");
  const name = value(form, "name");
  if (!name) redirect("/rollen?error=Vul+een+naam+in.");
  const permissions = selectedPermissions(form);
  run(
    "UPDATE roles SET name = ?, description = ?, permissions = ? WHERE key = ?",
    name,
    value(form, "description"),
    JSON.stringify(permissions),
    key,
  );
  writeAudit({
    actor: user,
    action: "role.update",
    entityType: "role",
    entityId: key,
    summary: `Rol ${name} is gewijzigd.`,
    before: { name: role.name },
    after: { key, permissions },
  });
  revalidatePath("/rollen");
  redirect("/rollen?ok=1");
}

export async function deleteRoleAction(form: FormData): Promise<void> {
  const user = await requirePermission("roles.manage");
  const key = value(form, "key");
  const role = get<{ is_system: number; name: string }>(
    "SELECT is_system, name FROM roles WHERE key = ?",
    key,
  );
  if (!role) redirect("/rollen?error=Rol+niet+gevonden.");
  if (role.is_system) redirect("/rollen?error=Systeemrollen+kunnen+niet+worden+verwijderd.");
  const inUse = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM users WHERE role_key = ?",
    key,
  )?.n ?? 0;
  if (inUse > 0) {
    redirect("/rollen?error=Deze+rol+is+nog+aan+gebruikers+gekoppeld.");
  }
  run("DELETE FROM roles WHERE key = ?", key);
  writeAudit({
    actor: user,
    action: "role.delete",
    entityType: "role",
    entityId: key,
    summary: `Rol ${role.name} is verwijderd.`,
  });
  revalidatePath("/rollen");
  redirect("/rollen?ok=1");
}
