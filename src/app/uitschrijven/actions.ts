"use server";

import { redirect } from "next/navigation";
import { get, run, transaction } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function unsubscribeAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const notification = get<{ participant_id: string; first_name: string; last_name: string }>(
    `SELECT n.participant_id, p.first_name, p.last_name
       FROM notifications n
       JOIN participants p ON p.id = n.participant_id
      WHERE n.unsubscribe_token = ?`,
    token,
  );

  if (!notification) {
    redirect("/uitschrijven?error=1");
  }

  transaction(() => {
    run(
      "UPDATE participants SET email_unsubscribed_at = ?, updated_at = ? WHERE id = ?",
      new Date().toISOString(),
      new Date().toISOString(),
      notification.participant_id,
    );
  });

  writeAudit({
    actor: { id: "public", name: "Deelnemer (uitschrijving)" },
    action: "participant.email_unsubscribe",
    entityType: "participant",
    entityId: notification.participant_id,
    summary: `${notification.first_name} ${notification.last_name} heeft zich afgemeld voor e-mail.`,
  });

  redirect("/uitschrijven?done=1");
}
