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

export async function createFreeSpotAlertAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const outingId = value(form, "outing_id");
  const participantId = value(form, "participant_id");
  const message = value(form, "message");
  const outing = get<{ description: string; date: string }>(
    "SELECT description, date FROM outings WHERE id = ?",
    outingId,
  );
  if (!outing) redirect("/uitjes?error=Uitje+niet+gevonden.");
  const id = `alert-${randomUUID()}`;
  run(
    "INSERT INTO alerts (id, type, outing_id, participant_id, message, status, created_by, created_at) VALUES (?, 'free_spot', ?, ?, ?, 'open', ?, ?)",
    id,
    outingId,
    participantId || null,
    message,
    user.id,
    new Date().toISOString(),
  );
  writeAudit({
    actor: user,
    action: "alert.free_spot",
    entityType: "outing",
    entityId: outingId,
    summary: `Plek vrij gemeld bij ${outing.description} op ${outing.date}.`,
    after: { participantId: participantId || null, message },
  });
  revalidatePath("/meldingen");
  revalidatePath(`/uitjes/${outingId}`);
  redirect("/meldingen?ok=1");
}

export async function handleAlertAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const id = value(form, "id");
  const alert = get<{ outing_id: string }>("SELECT outing_id FROM alerts WHERE id = ?", id);
  if (!alert) redirect("/meldingen?error=Melding+niet+gevonden.");
  run("UPDATE alerts SET status = 'done', handled_at = ? WHERE id = ?", new Date().toISOString(), id);
  writeAudit({
    actor: user,
    action: "alert.done",
    entityType: "outing",
    entityId: alert.outing_id,
    summary: "Vrije plek afgehandeld.",
  });
  revalidatePath("/meldingen");
  redirect("/meldingen?ok=1");
}
