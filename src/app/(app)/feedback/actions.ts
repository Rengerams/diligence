"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { get, run } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

function value(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function sendFeedbackAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const message = value(form, "message");
  const route = value(form, "route");
  if (!message) {
    redirect("/feedback?error=Schrijf+in+een+paar+woorden+wat+er+aan+de+hand+is.");
  }
  const id = `fb-${randomUUID()}`;
  run(
    "INSERT INTO feedback (id, user_id, route, message, status, created_at) VALUES (?, ?, ?, ?, 'new', ?)",
    id,
    user.id,
    route,
    message,
    new Date().toISOString(),
  );
  writeAudit({
    actor: user,
    action: "feedback.create",
    entityType: "feedback",
    entityId: id,
    summary: `Feedback ontvangen van ${user.name}.`,
    after: { route },
  });
  revalidatePath("/feedback");
  redirect("/feedback?ok=1");
}

export async function handleFeedbackAction(form: FormData): Promise<void> {
  const user = await requirePermission("feedback.manage");
  const id = value(form, "id");
  const status = value(form, "status");
  if (!["new", "in_progress", "done"].includes(status)) {
    redirect("/feedback?error=Onbekende+status.");
  }
  const feedback = get<{ message: string }>("SELECT message FROM feedback WHERE id = ?", id);
  if (!feedback) redirect("/feedback?error=Feedback+niet+gevonden.");
  run(
    "UPDATE feedback SET status = ?, handled_by = ?, handled_at = ? WHERE id = ?",
    status,
    user.id,
    status === "done" ? new Date().toISOString() : null,
    id,
  );
  writeAudit({
    actor: user,
    action: "feedback.update",
    entityType: "feedback",
    entityId: id,
    summary: `Feedback bijgewerkt naar ${status}.`,
    before: { message: feedback.message },
    after: { status },
  });
  revalidatePath("/feedback");
  redirect("/feedback?ok=1");
}
