"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { get, run } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

function value(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function createGroupAction(form: FormData): Promise<void> {
  const user = await requirePermission("groups.manage");
  const name = value(form, "name");
  if (!name) redirect("/groepjes?error=Vul+een+naam+in.");
  const id = `g-${randomUUID()}`;
  run(
    'INSERT INTO "groups" (id, name, archived_at, created_at) VALUES (?, ?, NULL, ?)',
    id,
    name,
    new Date().toISOString(),
  );
  writeAudit({
    actor: user,
    action: "group.create",
    entityType: "group",
    entityId: id,
    summary: `Groepje ${name} is aangemaakt.`,
    after: { name },
  });
  revalidatePath("/groepjes");
  redirect("/groepjes?ok=1");
}

export async function renameGroupAction(form: FormData): Promise<void> {
  const user = await requirePermission("groups.manage");
  const id = value(form, "id");
  const name = value(form, "name");
  const group = get<{ name: string }>('SELECT name FROM "groups" WHERE id = ? AND archived_at IS NULL', id);
  if (!group) redirect("/groepjes?error=Groepje+niet+gevonden.");
  if (!name) redirect("/groepjes?error=Vul+een+naam+in.");
  run('UPDATE "groups" SET name = ? WHERE id = ?', name, id);
  writeAudit({
    actor: user,
    action: "group.rename",
    entityType: "group",
    entityId: id,
    summary: `Groepje ${group.name} heet nu ${name}.`,
    before: { name: group.name },
    after: { name },
  });
  revalidatePath("/groepjes");
  redirect("/groepjes?ok=1");
}

export async function addGroupMemberAction(form: FormData): Promise<void> {
  const user = await requirePermission("groups.manage");
  const groupId = value(form, "group_id");
  const participantId = value(form, "participant_id");
  const group = get<{ name: string }>(
    'SELECT name FROM "groups" WHERE id = ? AND archived_at IS NULL',
    groupId,
  );
  const participant = get<{ first_name: string; last_name: string }>(
    "SELECT first_name, last_name FROM participants WHERE id = ? AND archived_at IS NULL AND status <> 'stopped'",
    participantId,
  );
  if (!group || !participant) redirect("/groepjes?error=Groepje+of+deelnemer+niet+gevonden.");
  const existing = get<{ group_id: string }>(
    "SELECT group_id FROM group_members WHERE participant_id = ? AND active = 1",
    participantId,
  );
  if (existing) {
    redirect("/groepjes?error=Deze+deelnemer+zit+al+in+een+groepje.");
  }
  run(
    "INSERT INTO group_members (group_id, participant_id, active, created_at) VALUES (?, ?, 1, ?)",
    groupId,
    participantId,
    new Date().toISOString(),
  );
  writeAudit({
    actor: user,
    action: "group.member_add",
    entityType: "group",
    entityId: groupId,
    summary: `${participant.first_name} ${participant.last_name} is toegevoegd aan ${group.name}.`,
    after: { participantId },
  });
  revalidatePath("/groepjes");
  redirect("/groepjes?ok=1");
}

export async function removeGroupMemberAction(form: FormData): Promise<void> {
  const user = await requirePermission("groups.manage");
  const groupId = value(form, "group_id");
  const participantId = value(form, "participant_id");
  const membership = get<{
    group_name: string;
    first_name: string;
    last_name: string;
  }>(
    `SELECT g.name AS group_name, p.first_name, p.last_name
       FROM group_members gm
       JOIN "groups" g ON g.id = gm.group_id
       JOIN participants p ON p.id = gm.participant_id
      WHERE gm.group_id = ? AND gm.participant_id = ? AND gm.active = 1`,
    groupId,
    participantId,
  );
  if (!membership) redirect("/groepjes?error=Lidmaatschap+niet+gevonden.");
  run(
    "UPDATE group_members SET active = 0 WHERE group_id = ? AND participant_id = ?",
    groupId,
    participantId,
  );
  writeAudit({
    actor: user,
    action: "group.member_remove",
    entityType: "group",
    entityId: groupId,
    summary: `${membership.first_name} ${membership.last_name} is uit ${membership.group_name} gehaald.`,
    after: { participantId },
  });
  revalidatePath("/groepjes");
  redirect("/groepjes?ok=1");
}

export async function archiveGroupAction(form: FormData): Promise<void> {
  const user = await requirePermission("groups.manage");
  const groupId = value(form, "id");
  const group = get<{ name: string }>('SELECT name FROM "groups" WHERE id = ? AND archived_at IS NULL', groupId);
  if (!group) redirect("/groepjes?error=Groepje+niet+gevonden.");
  run(
    'UPDATE "groups" SET archived_at = ? WHERE id = ?',
    new Date().toISOString(),
    groupId,
  );
  run("UPDATE group_members SET active = 0 WHERE group_id = ?", groupId);
  writeAudit({
    actor: user,
    action: "group.archive",
    entityType: "group",
    entityId: groupId,
    summary: `Groepje ${group.name} is opgeheven.`,
  });
  revalidatePath("/groepjes");
  redirect("/groepjes?ok=1");
}
