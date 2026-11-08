"use server";

import { createHash, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, get, run, transaction } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { digitsOnly, formatDate, normalize } from "@/lib/format";
import { newUnsubscribeToken, sendEmail, unsubscribeUrl } from "@/lib/email";
import { calculateAllocation, type AllocationInput } from "@/domain/allocation";
import { parseProgramCsv } from "@/lib/program-import";
import { parseParticipantCsv } from "@/lib/participant-import";
import { parseHistoryCsv } from "@/lib/history-import";
import { parseManualAllocationCsv } from "@/lib/manual-allocation-import";
import { readExcelProgram } from "@/lib/excel-program";
import type { Outing, Participant, Period, Run } from "@/lib/queries";

const NOW = () => new Date().toISOString();
const TODAY = () => new Date().toISOString().slice(0, 10);

function value(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function checked(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "1" || form.get(key) === "true";
}

function parseMoney(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function cleanupParticipantAction(form: FormData): Promise<void> {
  const user = await requirePermission("participants.manage");
  const participantId = value(form, "participant_id");
  const decision = value(form, "decision");
  const participant = get<Participant>("SELECT * FROM participants WHERE id = ?", participantId);
  if (!participant) fail("/deelnemers/opschonen", "Deelnemer niet gevonden.");
  if (!["pause", "archive"].includes(decision)) {
    fail("/deelnemers/opschonen", "Onbekende keuze.");
  }

  if (decision === "archive") {
    run(
      "UPDATE participants SET archived_at = ?, status = 'paused', updated_at = ? WHERE id = ?",
      NOW(),
      NOW(),
      participantId,
    );
  } else {
    run("UPDATE participants SET status = 'paused', updated_at = ? WHERE id = ?", NOW(), participantId);
  }

  writeAudit({
    actor: user,
    action: decision === "archive" ? "participant.archive" : "participant.pause",
    entityType: "participant",
    entityId: participantId,
    summary:
      decision === "archive"
        ? `${participant.first_name} ${participant.last_name} is gearchiveerd na de opschooncontrole.`
        : `${participant.first_name} ${participant.last_name} is gepauzeerd na de opschooncontrole.`,
    before: { status: participant.status, archived_at: participant.archived_at },
    after: { status: "paused" },
  });
  revalidatePath("/deelnemers");
  revalidatePath("/deelnemers/opschonen");
  redirect(`/deelnemers/opschonen?ok=1`);
}

export async function createParticipant(form: FormData): Promise<void> {
  const user = await requirePermission("participants.manage");
  const firstName = value(form, "first_name");
  const lastName = value(form, "last_name");
  const phone = digitsOnly(value(form, "phone"));
  const email = value(form, "email").toLowerCase();
  const status = value(form, "status") || "active";

  if (!firstName || !lastName) {
    fail("/deelnemers/nieuw", "Vul minimaal een voornaam en achternaam in.");
  }
  if (!phone && !email) {
    fail("/deelnemers/nieuw", "Vul een telefoonnummer of e-mailadres in, anders kunnen we niemand bereiken.");
  }
  if (status === "stopped") {
    fail("/deelnemers/nieuw", "Een nieuwe deelnemer kan niet direct op 'gestopt' staan. Voeg eerst een einddatum en reden toe.");
  }

  const id = `p-${randomUUID()}`;
  const now = NOW();
  run(
    `INSERT INTO participants (
      id, first_name, last_name_prefix, last_name, phone, phone_alt, email,
      street, house_number, postal_code, city, contact_preference, status,
      stopped_on, stop_reason, mobility_walker, mobility_wheelchair,
      mobility_help_boarding, notes, emergency_name, emergency_phone, cards,
      archived_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    id,
    firstName,
    value(form, "last_name_prefix"),
    lastName,
    phone,
    digitsOnly(value(form, "phone_alt")),
    email,
    value(form, "street"),
    value(form, "house_number"),
    value(form, "postal_code").toUpperCase(),
    value(form, "city") || "Almere",
    value(form, "contact_preference") || "phone",
    status === "paused" ? "paused" : "active",
    checked(form, "mobility_walker") ? 1 : 0,
    checked(form, "mobility_wheelchair") ? 1 : 0,
    checked(form, "mobility_help_boarding") ? 1 : 0,
    value(form, "notes"),
    value(form, "emergency_name"),
    digitsOnly(value(form, "emergency_phone")),
    value(form, "cards"),
    now,
    now,
  );

  writeAudit({
    actor: user,
    action: "participant.create",
    entityType: "participant",
    entityId: id,
    summary: `${firstName} ${lastName} is toegevoegd als deelnemer.`,
    after: { firstName, lastName, status },
  });

  revalidatePath("/deelnemers");
  redirect(`/deelnemers/${id}?ok=${encodeURIComponent("Deelnemer toegevoegd.")}`);
}

export async function saveSignups(form: FormData): Promise<void> {
  const user = await requirePermission("signups.manage");
  const participantId = value(form, "participant_id");
  const periodId = value(form, "period_id");
  const mode = value(form, "mode") || "specific";
  const groupMode = value(form, "group_mode") || "alone";
  const note = value(form, "note");
  const outingIds = form.getAll("outing_ids").map(String);

  const participant = get<Participant>("SELECT * FROM participants WHERE id = ?", participantId);
  const period = get<Period>("SELECT * FROM periods WHERE id = ?", periodId);
  if (!participant || !period) fail("/opgave", "Deelnemer of periode niet gevonden.");
  if (participant.status === "stopped") {
    fail(`/opgave?participantId=${participantId}`, "Een gestopte deelnemer kan geen opgave meer doen.");
  }
  if (period.status !== "published") {
    fail(`/opgave?participantId=${participantId}`, "De opgave is voor deze periode niet open.");
  }
  const afterDeadline = period.deadline < TODAY();
  const overrideReason = value(form, "override_reason");
  if (afterDeadline && !overrideReason) {
    fail(
      `/opgave?participantId=${participantId}`,
      "De opgavedeadline is verstreken. Vul een reden in om de opgave toch te wijzigen.",
    );
  }
  if (mode === "specific" && outingIds.length === 0) {
    fail(`/opgave?participantId=${participantId}`, "Kies minimaal één uitje.");
  }

  const group = get<{ id: string; name: string }>(
    `SELECT g.id, g.name FROM group_members gm JOIN "groups" g ON g.id = gm.group_id
      WHERE gm.participant_id = ? AND gm.active = 1`,
    participantId,
  );
  const groupId = groupMode === "with_group" && group ? group.id : null;

  const validOutingIds = new Set(
    all<{ id: string }>("SELECT id FROM outings WHERE period_id = ?", periodId).map((row) => row.id),
  );
  for (const outingId of outingIds) {
    if (!validOutingIds.has(outingId)) {
      fail(`/opgave?participantId=${participantId}`, "Een van de gekozen uitjes hoort niet bij deze periode.");
    }
  }

  transaction(() => {
    run(
      "DELETE FROM signups WHERE participant_id = ? AND period_id = ? AND status = 'active'",
      participantId,
      periodId,
    );

    if (mode === "all") {
      run(
        `INSERT INTO signups
          (id, period_id, participant_id, target_type, outing_id, series_key, group_mode, group_id, note, status, created_at, created_by)
         VALUES (?, ?, ?, 'period', NULL, '', ?, ?, ?, 'active', ?, ?)`,
        `s-${randomUUID()}`,
        periodId,
        participantId,
        groupId ? "with_group" : "alone",
        groupId,
        note,
        NOW(),
        user.id,
      );
    } else {
      for (const outingId of outingIds) {
        run(
          `INSERT INTO signups
            (id, period_id, participant_id, target_type, outing_id, series_key, group_mode, group_id, note, status, created_at, created_by)
           VALUES (?, ?, ?, 'outing', ?, '', ?, ?, ?, 'active', ?, ?)`,
          `s-${randomUUID()}`,
          periodId,
          participantId,
          outingId,
          groupId ? "with_group" : "alone",
          groupId,
          note,
          NOW(),
          user.id,
        );
      }
    }
  });

  writeAudit({
    actor: user,
    action: "signup.save",
    entityType: "participant",
    entityId: participantId,
    summary: `Opgave van ${participant.first_name} ${participant.last_name} voor ${period.name} is opgeslagen.${afterDeadline ? ` Na de deadline, met reden: ${overrideReason}.` : ""}`,
    after: { mode, groupMode: groupMode, outingIds, note, afterDeadline, overrideReason },
  });

  revalidatePath("/opgave");
  revalidatePath(`/deelnemers/${participantId}`);
  redirect(`/opgave?participantId=${participantId}&ok=1`);
}

export async function calculateAllocationAction(form: FormData): Promise<void> {
  const user = await requirePermission("allocation.manage");
  const periodId = value(form, "period_id");
  const period = get<Period>("SELECT * FROM periods WHERE id = ?", periodId);
  if (!period) fail("/indeling", "Periode niet gevonden.");
  if (period.deadline >= TODAY()) {
    fail("/indeling", "De indeling kan pas na de opgavedeadline worden berekend.");
  }

  const existing = get<Run>(
    "SELECT * FROM allocation_runs WHERE period_id = ? AND phase = 'confirmed' ORDER BY confirmed_at DESC LIMIT 1",
    periodId,
  );
  if (existing) fail("/indeling", "Deze periode is al bevestigd.");

  const outings = all<Outing>(
    "SELECT * FROM outings WHERE period_id = ? ORDER BY date, start_time, id",
    periodId,
  );
  const participants = all<Participant>(
    "SELECT * FROM participants WHERE archived_at IS NULL AND status <> 'stopped'",
  );
  const groups = all<{ id: string; name: string }>('SELECT id, name FROM "groups"');
  const groupMembers = all<{ group_id: string; participant_id: string }>(
    "SELECT group_id, participant_id FROM group_members WHERE active = 1",
  );
  const signups = all<{
    id: string;
    participant_id: string;
    target_type: "outing" | "series" | "period";
    outing_id: string | null;
    series_key: string;
    group_mode: "with_group" | "alone";
    group_id: string | null;
  }>(
    "SELECT id, participant_id, target_type, outing_id, series_key, group_mode, group_id FROM signups WHERE period_id = ? AND status = 'active'",
    periodId,
  );

  const visits = all<{ participant_id: string; visit_date: string }>(
    `SELECT participant_id, visit_date FROM historical_visits
     UNION ALL
     SELECT a.participant_id, o.date AS visit_date
       FROM attendance a JOIN outings o ON o.id = a.outing_id
      WHERE a.present = 1`,
  );

  const reference = new Date(`${period.deadline}T00:00:00Z`);
  reference.setUTCMonth(reference.getUTCMonth() - 12);
  const cutoff = reference.toISOString().slice(0, 10);

  const plannedRows = all<{ participant_id: string; n: number }>(
    `SELECT a.participant_id, COUNT(*) AS n
       FROM allocations a
       JOIN allocation_runs r ON r.id = a.run_id
       JOIN outings o ON o.id = a.outing_id
      WHERE r.phase = 'confirmed' AND a.status = 'assigned' AND o.status = 'planned'
      GROUP BY a.participant_id`,
  );
  const plannedCounts = new Map(plannedRows.map((row) => [row.participant_id, Number(row.n)]));

  const engineInput: AllocationInput = {
    outings: outings.map((outing) => ({
      id: outing.id,
      date: outing.date,
      capacity: outing.capacity,
      seriesKey: outing.series_key,
      description: outing.description,
      status: outing.status,
    })),
    participants: participants.map((participant) => {
      const rows = visits.filter((visit) => visit.participant_id === participant.id);
      const recent = rows.filter((visit) => visit.visit_date >= cutoff);
      const lastVisitDate = rows
        .map((visit) => visit.visit_date)
        .sort((a, b) => (a < b ? 1 : -1))[0] ?? null;
      return {
        id: participant.id,
        name: `${participant.first_name} ${participant.last_name}`,
        count12m: recent.length,
        plannedCount: plannedCounts.get(participant.id) ?? 0,
        lastVisitDate,
        guaranteeRemaining: Math.max(0, 2 - rows.length),
      };
    }),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      memberIds: groupMembers
        .filter((member) => member.group_id === group.id)
        .map((member) => member.participant_id),
    })),
    signups: signups.map((signup) => ({
      id: signup.id,
      participantId: signup.participant_id,
      targetType: signup.target_type,
      outingId: signup.outing_id,
      seriesKey: signup.series_key,
      groupMode: signup.group_mode,
      groupId: signup.group_id,
    })),
  };

  const result = calculateAllocation(engineInput);
  const runId = `run-${randomUUID()}`;
  const hash = createHash("sha256")
    .update(JSON.stringify(engineInput))
    .digest("hex")
    .slice(0, 24);

  transaction(() => {
    run(
      `INSERT INTO allocation_runs
        (id, period_id, kind, phase, algorithm_version, input_hash, created_at, created_by)
       VALUES (?, ?, 'system', 'proposal', '0.1.0', ?, ?, ?)`,
      runId,
      periodId,
      hash,
      NOW(),
      user.id,
    );

    const insert = (item: {
      outingId: string;
      participantId: string;
      groupId: string | null;
      status: "assigned" | "waitlist" | "tie";
      reasonCode: string;
      reasonText: string;
      rank: number;
    }) => {
      run(
        `INSERT INTO allocations
          (id, run_id, outing_id, participant_id, group_id, status, source, reason_code, reason_text, rank, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'system', ?, ?, ?, ?)`,
        `a-${randomUUID()}`,
        runId,
        item.outingId,
        item.participantId,
        item.groupId,
        item.status,
        item.reasonCode,
        item.reasonText,
        item.rank,
        NOW(),
      );
    };

    for (const allocation of result.assignments) {
      insert({
        outingId: allocation.outingId,
        participantId: allocation.participantId,
        groupId: allocation.groupId,
        status: "assigned",
        reasonCode: allocation.reasonCode,
        reasonText: allocation.reasonText,
        rank: 0,
      });
    }
    for (const allocation of result.waitlist) {
      insert({
        outingId: allocation.outingId,
        participantId: allocation.participantId,
        groupId: allocation.groupId,
        status: "waitlist",
        reasonCode: allocation.reasonCode,
        reasonText: allocation.reasonText,
        rank: allocation.rank,
      });
    }
    for (const allocation of result.ties) {
      insert({
        outingId: allocation.outingId,
        participantId: allocation.participantId,
        groupId: allocation.groupId,
        status: "tie",
        reasonCode: allocation.reasonCode,
        reasonText: allocation.reasonText,
        rank: 0,
      });
    }
  });

  writeAudit({
    actor: user,
    action: "allocation.calculate",
    entityType: "allocation_run",
    entityId: runId,
    summary: `Indelingsvoorstel berekend voor ${period.name}: ${result.stats.placed} geplaatst, ${result.stats.waitlisted} reserve, ${result.stats.ties} gelijke stand.`,
    after: { runId, inputHash: hash, stats: result.stats },
  });

  revalidatePath("/indeling");
  redirect(`/indeling?period=${periodId}&ok=1`);
}

export async function confirmAllocationAction(form: FormData): Promise<void> {
  const user = await requirePermission("allocation.manage");
  const runId = value(form, "run_id");
  const allocationRun = get<Run>("SELECT * FROM allocation_runs WHERE id = ?", runId);
  if (!allocationRun) fail("/indeling", "Voorstel niet gevonden.");
  if (allocationRun.phase === "confirmed") fail("/indeling", "Deze indeling is al bevestigd.");

  const rows = all<{
    participant_id: string;
    outing_id: string;
    status: "assigned" | "waitlist" | "tie";
    outing_description: string;
    outing_date: string;
    first_name: string;
    last_name: string;
    email: string;
    contact_preference: "phone" | "email" | "both";
    email_unsubscribed_at: string | null;
  }>(
    `SELECT a.participant_id, a.outing_id, a.status,
            o.description AS outing_description, o.date AS outing_date,
            p.first_name, p.last_name, p.email, p.contact_preference, p.email_unsubscribed_at
       FROM allocations a
       JOIN outings o ON o.id = a.outing_id
       JOIN participants p ON p.id = a.participant_id
      WHERE a.run_id = ?`,
    runId,
  );

  let queued = 0;
  let calls = 0;

  transaction(() => {
    run(
      "UPDATE allocation_runs SET phase = 'confirmed', confirmed_at = ?, confirmed_by = ? WHERE id = ?",
      NOW(),
      user.id,
      runId,
    );
    run("UPDATE periods SET status = 'closed' WHERE id = ?", allocationRun.period_id);
    run("DELETE FROM call_tasks WHERE run_id = ?", runId);
    run("DELETE FROM notifications WHERE run_id = ?", runId);

    for (const row of rows) {
      if (row.status === "tie") continue;
      const email = row.email.trim();
      const unsubscribed = Boolean(row.email_unsubscribed_at);
      const needsEmail = Boolean(email) && !unsubscribed;
      const needsCall = !email || unsubscribed || row.contact_preference !== "email";
      const message =
        row.status === "assigned"
          ? `U bent ingedeeld voor ${row.outing_description} op ${formatDate(row.outing_date)}.`
          : `U staat op de reservelijst voor ${row.outing_description} op ${formatDate(row.outing_date)}.`;

      if (needsEmail) {
        const token = newUnsubscribeToken();
        const subject =
          row.status === "assigned"
            ? `Uitslag: ingedeeld voor ${row.outing_description}`
            : `Uitslag: reservelijst voor ${row.outing_description}`;
        const body = [
          `Beste ${row.first_name},`,
          "",
          message,
          "",
          "U hoeft niets te doen. Als u niet kunt, neem dan contact op met de stichting.",
          "",
          "Met vriendelijke groet,",
          "Stichting Diligence Almere",
          "",
          `Wilt u geen e-mails meer ontvangen? Meld u af via ${unsubscribeUrl(token)}.`,
        ].join("\n");
        run(
          `INSERT INTO notifications
            (id, run_id, participant_id, outing_id, kind, recipient, subject, body,
             status, unsubscribe_token, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)`,
          `n-${randomUUID()}`,
          runId,
          row.participant_id,
          row.outing_id,
          row.status === "assigned" ? "assigned" : "waitlist",
          email,
          subject,
          body,
          token,
          NOW(),
        );
        queued += 1;
      }

      if (needsCall) {
        run(
          `INSERT INTO call_tasks
            (id, run_id, participant_id, outing_id, kind, status, message, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'to_call', ?, ?, ?)`,
          `c-${randomUUID()}`,
          runId,
          row.participant_id,
          row.outing_id,
          row.status === "assigned" ? "assigned" : "waitlist",
          message,
          NOW(),
          NOW(),
        );
        calls += 1;
      }
    }
  });

  writeAudit({
    actor: user,
    action: "allocation.confirm",
    entityType: "allocation_run",
    entityId: runId,
    summary: `De indeling is bevestigd: ${calls} beltaken en ${queued} e-mails klaargezet.`,
    after: { calls, emails: queued },
  });

  revalidatePath("/indeling");
  revalidatePath("/bellen");
  revalidatePath("/berichten");
  redirect(`/indeling?period=${allocationRun.period_id}&confirmed=1`);
}

export async function sendNotificationAction(form: FormData): Promise<void> {
  const user = await requirePermission("messages.manage");
  const notificationId = value(form, "notification_id");
  const notification = get<{
    id: string;
    recipient: string;
    subject: string;
    body: string;
    status: string;
  }>("SELECT id, recipient, subject, body, status FROM notifications WHERE id = ?", notificationId);
  if (!notification) fail("/berichten", "Bericht niet gevonden.");
  if (notification.status === "sent") fail("/berichten", "Dit bericht is al verzonden.");

  const result = await sendEmail({
    to: notification.recipient,
    subject: notification.subject,
    text: notification.body,
  });

  run(
    `UPDATE notifications
        SET status = ?, sent_at = ?, provider_message_id = ?, error = ?
      WHERE id = ?`,
    result.status,
    result.status === "failed" ? null : NOW(),
    result.status === "sent" ? result.providerMessageId : null,
    result.status === "failed" ? result.error : null,
    notificationId,
  );

  writeAudit({
    actor: user,
    action: "notification.send",
    entityType: "notification",
    entityId: notificationId,
    summary:
      result.status === "sent"
        ? "E-mail verzonden."
        : result.status === "demo"
          ? "E-mail klaargezet in demonstratiemodus (niet echt verstuurd)."
          : `E-mail mislukt: ${result.error}`,
    after: { status: result.status },
  });
  revalidatePath("/berichten");
  redirect("/berichten?ok=1");
}

export async function sendAllNotificationsAction(form: FormData): Promise<void> {
  const user = await requirePermission("messages.manage");
  const runId = value(form, "run_id");
  const rows = all<{ id: string; recipient: string; subject: string; body: string; status: string }>(
    "SELECT id, recipient, subject, body, status FROM notifications WHERE run_id = ? AND status IN ('queued', 'failed')",
    runId,
  );

  let sent = 0;
  let demo = 0;
  let failed = 0;
  for (const row of rows) {
    const result = await sendEmail({ to: row.recipient, subject: row.subject, text: row.body });
    run(
      `UPDATE notifications
          SET status = ?, sent_at = ?, provider_message_id = ?, error = ?
        WHERE id = ?`,
      result.status,
      result.status === "failed" ? null : NOW(),
      result.status === "sent" ? result.providerMessageId : null,
      result.status === "failed" ? result.error : null,
      row.id,
    );
    if (result.status === "sent") sent += 1;
    else if (result.status === "demo") demo += 1;
    else failed += 1;
  }

  writeAudit({
    actor: user,
    action: "notification.send_all",
    entityType: "allocation_run",
    entityId: runId,
    summary: `E-mailwachtrij verwerkt: ${sent} verzonden, ${demo} demo, ${failed} mislukt.`,
    after: { sent, demo, failed },
  });
  revalidatePath("/berichten");
  redirect("/berichten?ok=1");
}

export async function assignManuallyAction(form: FormData): Promise<void> {
  const user = await requirePermission("allocation.manage");
  const runId = value(form, "run_id");
  const outingId = value(form, "outing_id");
  const participantId = value(form, "participant_id");
  const allocationRun = get<Run>("SELECT * FROM allocation_runs WHERE id = ?", runId);
  if (!allocationRun) fail("/indeling", "Voorstel niet gevonden.");
  if (allocationRun.phase === "confirmed") fail("/indeling", "De indeling is al bevestigd.");

  const participant = get<Participant>("SELECT * FROM participants WHERE id = ?", participantId);
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", outingId);
  if (!participant || !outing) fail("/indeling", "Deelnemer of uitje niet gevonden.");

  run(
    `INSERT INTO allocations
      (id, run_id, outing_id, participant_id, group_id, status, source, reason_code, reason_text, rank, created_at)
     VALUES (?, ?, ?, ?, NULL, 'assigned', 'manual', 'manual_override', ?, 0, ?)
     ON CONFLICT(run_id, outing_id, participant_id) DO UPDATE SET
       status = 'assigned', source = 'manual', reason_code = 'manual_override',
       reason_text = excluded.reason_text, rank = 0`,
    `a-${randomUUID()}`,
    runId,
    outingId,
    participantId,
    "De coördinator heeft deze persoon handmatig ingedeeld.",
    NOW(),
  );

  writeAudit({
    actor: user,
    action: "allocation.manual",
    entityType: "allocation_run",
    entityId: runId,
    summary: `${participant.first_name} ${participant.last_name} is handmatig ingedeeld voor ${outing.description}.`,
    after: { outingId, participantId },
  });

  revalidatePath("/indeling");
  redirect(`/indeling?period=${allocationRun.period_id}&manual=1`);
}

export async function updateCallTaskAction(form: FormData): Promise<void> {
  const user = await requirePermission("calls.manage");
  const taskId = value(form, "task_id");
  const status = value(form, "status");
  if (!["to_call", "called", "not_reached", "declined"].includes(status)) {
    fail("/bellen", "Onbekende status.");
  }
  const task = get<{ id: string; participant_id: string }>(
    "SELECT id, participant_id FROM call_tasks WHERE id = ?",
    taskId,
  );
  if (!task) fail("/bellen", "Beltaak niet gevonden.");

  run("UPDATE call_tasks SET status = ?, updated_at = ? WHERE id = ?", status, NOW(), taskId);
  writeAudit({
    actor: user,
    action: "call_task.update",
    entityType: "call_task",
    entityId: taskId,
    summary: `Beltaak bijgewerkt naar ${status}.`,
    after: { status },
  });
  revalidatePath("/bellen");
  redirect("/bellen?ok=1");
}

export async function createVehicleAction(form: FormData): Promise<void> {
  const user = await requirePermission("vehicles.manage");
  const name = value(form, "name");
  const plate = value(form, "license_plate");
  const seats = Number.parseInt(value(form, "seats"), 10);
  if (!name) fail("/voertuigen", "Vul een naam voor het voertuig in.");
  if (!Number.isFinite(seats) || seats < 1 || seats > 100) {
    fail("/voertuigen", "Het aantal plekken moet tussen 1 en 100 liggen.");
  }
  const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  try {
    run(
      `INSERT INTO vehicles
        (id, name, license_plate, license_plate_normalized, seats, active, notes, archived_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, NULL, ?, ?)`,
      `v-${randomUUID()}`,
      name,
      plate.toUpperCase(),
      normalized,
      seats,
      value(form, "notes"),
      NOW(),
      NOW(),
    );
  } catch {
    fail("/voertuigen", "Dit kenteken bestaat al bij een actief voertuig.");
  }

  writeAudit({
    actor: user,
    action: "vehicle.create",
    entityType: "vehicle",
    entityId: name,
    summary: `Voertuig ${name} (${plate || "geen kenteken"}) met ${seats} plekken is toegevoegd.`,
    after: { name, plate, seats },
  });
  revalidatePath("/voertuigen");
  redirect("/voertuigen?ok=1");
}

export async function updateVehicleAction(form: FormData): Promise<void> {
  const user = await requirePermission("vehicles.manage");
  const id = value(form, "id");
  const name = value(form, "name");
  const plate = value(form, "license_plate");
  const seats = Number.parseInt(value(form, "seats"), 10);
  const active = checked(form, "active");
  const existing = get<{ name: string; seats: number; license_plate: string }>(
    "SELECT name, seats, license_plate FROM vehicles WHERE id = ?",
    id,
  );
  if (!existing) fail("/voertuigen", "Voertuig niet gevonden.");
  if (!name) fail("/voertuigen", "Vul een naam voor het voertuig in.");
  if (!Number.isFinite(seats) || seats < 1 || seats > 100) {
    fail("/voertuigen", "Het aantal plekken moet tussen 1 en 100 liggen.");
  }
  const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  try {
    run(
      `UPDATE vehicles
          SET name = ?, license_plate = ?, license_plate_normalized = ?, seats = ?,
              active = ?, notes = ?, updated_at = ?
        WHERE id = ?`,
      name,
      plate.toUpperCase(),
      normalized,
      seats,
      active ? 1 : 0,
      value(form, "notes"),
      NOW(),
      id,
    );
  } catch {
    fail("/voertuigen", "Dit kenteken bestaat al bij een ander actief voertuig.");
  }

  writeAudit({
    actor: user,
    action: "vehicle.update",
    entityType: "vehicle",
    entityId: id,
    summary: `Voertuig ${name} is gewijzigd.`,
    before: existing,
    after: { name, plate, seats, active },
  });
  revalidatePath("/voertuigen");
  redirect("/voertuigen?ok=1");
}

export async function createOutingAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const periodId = value(form, "period_id");
  const description = value(form, "description");
  const date = value(form, "date");
  const start = value(form, "start_time");
  const end = value(form, "end_time");
  const capacity = Number.parseInt(value(form, "capacity"), 10);

  if (!description || !date || !start || !end) {
    fail("/uitjes/nieuw", "Vul datum, tijden en omschrijving in.");
  }
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 100) {
    fail("/uitjes/nieuw", "De capaciteit moet tussen 1 en 100 liggen.");
  }
  if (end <= start) {
    fail("/uitjes/nieuw", "De eindtijd moet na de begintijd liggen.");
  }

  const seriesName = value(form, "series_name");
  const seriesKey = seriesName
    ? `series-${seriesName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
    : "";
  const locationId = value(form, "location_id");
  const categoryId = value(form, "category_id");

  const id = `o-${randomUUID()}`;
  run(
    `INSERT INTO outings
      (id, period_id, series_key, series_name, date, start_time, end_time,
       description, location_id, category_id, price_cents, extra_costs, labels, capacity,
       less_suitable_walkers, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?)`,
    id,
    periodId,
    seriesKey,
    seriesName,
    date,
    start,
    end,
    description,
    locationId || null,
    categoryId || null,
    parseMoney(value(form, "price")),
    value(form, "extra_costs"),
    value(form, "labels"),
    capacity,
    checked(form, "less_suitable") ? 1 : 0,
    NOW(),
  );

  writeAudit({
    actor: user,
    action: "outing.create",
    entityType: "outing",
    entityId: id,
    summary: `Uitje ${description} op ${date} is toegevoegd.`,
    after: { description, date, capacity },
  });
  revalidatePath("/uitjes");
  redirect(`/uitjes/${id}?ok=1`);
}

export async function updateOutingPlaceAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const outingId = value(form, "outing_id");
  const locationId = value(form, "location_id");
  const categoryId = value(form, "category_id");
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", outingId);
  if (!outing) fail("/uitjes", "Uitje niet gevonden.");
  run(
    "UPDATE outings SET location_id = ?, category_id = ? WHERE id = ?",
    locationId || null,
    categoryId || null,
    outingId,
  );
  writeAudit({
    actor: user,
    action: "outing.place",
    entityType: "outing",
    entityId: outingId,
    summary: `Locatie of categorie van ${outing.description} is bijgewerkt.`,
    before: { locationId: outing.location_id, categoryId: outing.category_id },
    after: { locationId: locationId || null, categoryId: categoryId || null },
  });
  revalidatePath(`/uitjes/${outingId}`);
  redirect(`/uitjes/${outingId}?ok=1`);
}

export async function updateCapacityAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const outingId = value(form, "outing_id");
  const capacity = Number.parseInt(value(form, "capacity"), 10);
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", outingId);
  if (!outing) fail("/uitjes", "Uitje niet gevonden.");
  if (!Number.isFinite(capacity) || capacity < 1 || capacity > 100) {
    fail(`/uitjes/${outingId}`, "De capaciteit moet tussen 1 en 100 liggen.");
  }
  run("UPDATE outings SET capacity = ? WHERE id = ?", capacity, outingId);
  writeAudit({
    actor: user,
    action: "outing.capacity",
    entityType: "outing",
    entityId: outingId,
    summary: `Capaciteit van ${outing.description} is gewijzigd van ${outing.capacity} naar ${capacity}.`,
    before: { capacity: outing.capacity },
    after: { capacity },
  });
  revalidatePath(`/uitjes/${outingId}`);
  redirect(`/uitjes/${outingId}?ok=1`);
}

export async function importParticipantsAction(form: FormData): Promise<void> {
  const user = await requirePermission("participants.manage");
  const parsed = parseParticipantCsv(value(form, "csv"));
  if (parsed.errors.length) {
    fail(
      "/deelnemers/import",
      `De import is niet opgeslagen. Herstel eerst ${parsed.errors.length} fout${parsed.errors.length === 1 ? "" : "en"}.`,
    );
  }
  if (parsed.rows.length === 0) fail("/deelnemers/import", "Er staan geen geldige deelnemers in het bestand.");

  const existingPhones = new Set(
    all<{ phone: string }>("SELECT phone FROM participants WHERE phone <> ''").map((row) => row.phone),
  );
  const seen = new Set<string>();
  for (const row of parsed.rows) {
    if (row.phone && (existingPhones.has(row.phone) || seen.has(row.phone))) {
      fail(
        "/deelnemers/import",
        `Het telefoonnummer ${row.phone} bestaat al. Controleer de lijst op dubbele deelnemers.`,
      );
    }
    if (row.phone) seen.add(row.phone);
  }

  const now = NOW();
  let imported = 0;
  transaction(() => {
    for (const row of parsed.rows) {
      run(
        `INSERT INTO participants (
          id, first_name, last_name_prefix, last_name, phone, phone_alt, email,
          street, house_number, postal_code, city, contact_preference, status,
          stopped_on, stop_reason, mobility_walker, mobility_wheelchair,
          mobility_help_boarding, notes, emergency_name, emergency_phone, cards,
          archived_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'phone', 'active', NULL, NULL, ?, ?, ?, ?, '', '', ?, NULL, ?, ?)`,
        `p-${randomUUID()}`,
        row.first_name,
        row.last_name_prefix,
        row.last_name,
        row.phone,
        row.phone_alt,
        row.email,
        row.street,
        row.house_number,
        row.postal_code,
        row.city,
        row.mobility_walker ? 1 : 0,
        row.mobility_wheelchair ? 1 : 0,
        row.mobility_help_boarding ? 1 : 0,
        row.notes,
        row.cards,
        now,
        now,
      );
      imported += 1;
    }
  });

  writeAudit({
    actor: user,
    action: "participant.import",
    entityType: "participant",
    summary: `${imported} deelnemers geïmporteerd.`,
    after: { count: imported },
  });
  revalidatePath("/deelnemers");
  redirect(`/deelnemers?ok=${encodeURIComponent(`${imported} deelnemers geïmporteerd.`)}`);
}

export async function importHistoryAction(form: FormData): Promise<void> {
  const user = await requirePermission("participants.manage");
  const parsed = parseHistoryCsv(value(form, "csv"), TODAY());
  if (parsed.errors.length) {
    fail(
      "/deelnemers/geschiedenis",
      `De import is niet opgeslagen. Herstel eerst ${parsed.errors.length} fout${parsed.errors.length === 1 ? "" : "en"}.`,
    );
  }
  if (parsed.rows.length === 0) fail("/deelnemers/geschiedenis", "Er staan geen geldige bezoeken in het bestand.");

  const participants = all<{
    id: string;
    first_name: string;
    last_name_prefix: string;
    last_name: string;
    phone: string;
    phone_alt: string;
  }>(
    "SELECT id, first_name, last_name_prefix, last_name, phone, phone_alt FROM participants WHERE archived_at IS NULL",
  );

  const byPhone = new Map<string, string[]>();
  const byName = new Map<string, string[]>();
  for (const participant of participants) {
    for (const phone of [participant.phone, participant.phone_alt].filter(Boolean)) {
      const list = byPhone.get(phone) ?? [];
      list.push(participant.id);
      byPhone.set(phone, list);
    }
    const name = normalize(
      `${participant.first_name} ${participant.last_name_prefix} ${participant.last_name}`,
    );
    const list = byName.get(name) ?? [];
    list.push(participant.id);
    byName.set(name, list);
  }

  const existing = new Set(
    all<{ participant_id: string; visit_date: string; description: string }>(
      "SELECT participant_id, visit_date, description FROM historical_visits",
    ).map((row) => `${row.participant_id}|${row.visit_date}|${row.description.toLowerCase()}`),
  );

  const resolved: { participantId: string; date: string; description: string; row: number }[] = [];
  const unknown: string[] = [];
  let skipped = 0;

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const phoneMatches = row.phone ? byPhone.get(row.phone) ?? [] : [];
    const nameMatches = row.name ? byName.get(normalize(row.name)) ?? [] : [];
    const matches = [...new Set([...phoneMatches, ...nameMatches])];

    if (matches.length === 0) {
      unknown.push(`rij ${rowNumber}: ${row.name || row.phone}`);
      return;
    }
    if (matches.length > 1) {
      unknown.push(`rij ${rowNumber}: ${row.name || row.phone} is niet eenduidig`);
      return;
    }

    const key = `${matches[0]}|${row.date}|${row.description.toLowerCase()}`;
    if (existing.has(key)) {
      skipped += 1;
      return;
    }
    existing.add(key);
    resolved.push({
      participantId: matches[0],
      date: row.date,
      description: row.description,
      row: rowNumber,
    });
  });

  if (unknown.length) {
    fail(
      "/deelnemers/geschiedenis",
      `Deze regels konden niet aan één deelnemer worden gekoppeld: ${unknown.slice(0, 6).join("; ")}${unknown.length > 6 ? " en meer" : ""}.`,
    );
  }

  transaction(() => {
    for (const row of resolved) {
      run(
        "INSERT INTO historical_visits (id, participant_id, visit_date, description, created_at) VALUES (?, ?, ?, ?, ?)",
        `h-${randomUUID()}`,
        row.participantId,
        row.date,
        row.description,
        NOW(),
      );
    }
  });

  writeAudit({
    actor: user,
    action: "history.import",
    entityType: "historical_visit",
    summary: `${resolved.length} bezoeken geïmporteerd${skipped ? `, ${skipped} overgeslagen als dubbel` : ""}.`,
    after: { imported: resolved.length, skipped },
  });
  revalidatePath("/deelnemers");
  redirect(
    `/deelnemers?ok=${encodeURIComponent(`${resolved.length} bezoeken geïmporteerd${skipped ? `, ${skipped} dubbel overgeslagen` : ""}.`)}`,
  );
}

export async function importManualAllocationAction(form: FormData): Promise<void> {
  const user = await requirePermission("allocation.manage");
  const periodId = value(form, "period_id");
  const period = get<Period>("SELECT * FROM periods WHERE id = ?", periodId);
  if (!period) fail("/indeling/proef", "Periode niet gevonden.");
  const systemRun = get<Run>(
    "SELECT * FROM allocation_runs WHERE period_id = ? AND kind = 'system' ORDER BY created_at DESC, rowid DESC LIMIT 1",
    periodId,
  );
  if (!systemRun) {
    fail("/indeling/proef", "Bereken eerst het systeemvoorstel voordat je een proefindeling invoert.");
  }

  const csv = value(form, "csv");
  const parsed = parseManualAllocationCsv(csv);
  if (parsed.errors.length) {
    fail(
      "/indeling/proef",
      `De proefindeling is niet opgeslagen. Herstel eerst ${parsed.errors.length} fout${parsed.errors.length === 1 ? "" : "en"}.`,
    );
  }

  const participants = all<{
    id: string;
    first_name: string;
    last_name_prefix: string;
    last_name: string;
    phone: string;
    phone_alt: string;
  }>("SELECT id, first_name, last_name_prefix, last_name, phone, phone_alt FROM participants");

  const outings = all<Outing>(
    "SELECT * FROM outings WHERE period_id = ? AND status <> 'cancelled' ORDER BY date, start_time",
    periodId,
  );

  const byPhone = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const participant of participants) {
    for (const phone of [participant.phone, participant.phone_alt].filter(Boolean)) {
      byPhone.set(phone, participant.id);
    }
    byName.set(
      normalize(`${participant.first_name} ${participant.last_name_prefix} ${participant.last_name}`),
      participant.id,
    );
  }

  const resolved: { outingId: string; participantId: string; status: "assigned" | "waitlist"; rank: number }[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (row.status === "skip") {
      skipped += 1;
      return;
    }
    const participantId =
      (row.phone ? byPhone.get(row.phone) : undefined) ??
      (row.name ? byName.get(normalize(row.name)) : undefined);
    if (!participantId) {
      unknown.push(`rij ${rowNumber}: deelnemer ${row.name || row.phone}`);
      return;
    }

    const sameDate = outings.filter((outing) => outing.date === row.date);
    const description = normalize(row.description);
    const matches = description
      ? sameDate.filter((outing) => normalize(outing.description) === description)
      : sameDate;
    if (matches.length !== 1) {
      unknown.push(
        `rij ${rowNumber}: uitje ${row.date} ${row.description || "(zonder omschrijving)"}`,
      );
      return;
    }
    const outing = matches[0];
    const key = `${outing.id}|${participantId}`;
    if (seen.has(key)) {
      unknown.push(`rij ${rowNumber}: dezelfde persoon staat dubbel bij hetzelfde uitje`);
      return;
    }
    seen.add(key);
    resolved.push({
      outingId: outing.id,
      participantId,
      status: row.status,
      rank: row.rank,
    });
  });

  if (unknown.length) {
    fail(
      "/indeling/proef",
      `Deze regels konden niet worden gekoppeld: ${unknown.slice(0, 6).join("; ")}${unknown.length > 6 ? " en meer" : ""}.`,
    );
  }
  if (resolved.length === 0) {
    fail("/indeling/proef", "Er staan geen ingedeelde of gereserveerde personen in het bestand.");
  }

  const runId = `run-manual-${randomUUID()}`;
  const hash = createHash("sha256").update(csv).digest("hex").slice(0, 24);
  transaction(() => {
    run(
      `INSERT INTO allocation_runs
        (id, period_id, kind, phase, algorithm_version, input_hash, created_at, created_by)
       VALUES (?, ?, 'manual', 'proposal', 'manual-proef', ?, ?, ?)`,
      runId,
      periodId,
      hash,
      NOW(),
      user.id,
    );
    for (const row of resolved) {
      run(
        `INSERT INTO allocations
          (id, run_id, outing_id, participant_id, group_id, status, source, reason_code, reason_text, rank, created_at)
         VALUES (?, ?, ?, ?, NULL, ?, 'manual', 'manual_import', ?, ?, ?)`,
        `a-${randomUUID()}`,
        runId,
        row.outingId,
        row.participantId,
        row.status,
        "Handmatige indeling uit de proefmodus.",
        row.rank,
        NOW(),
      );
    }
  });

  writeAudit({
    actor: user,
    action: "allocation.manual_import",
    entityType: "allocation_run",
    entityId: runId,
    summary: `Proefindeling geïmporteerd: ${resolved.length} plaatsen${skipped ? `, ${skipped} bewust niet ingedeeld` : ""}.`,
    after: { runId, imported: resolved.length, skipped },
  });
  revalidatePath("/indeling");
  revalidatePath("/indeling/vergelijken");
  redirect(`/indeling/vergelijken?period=${periodId}&ok=1`);
}

export async function previewExcelProgramAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const periodId = value(form, "period_id");
  const period = get<Period>("SELECT * FROM periods WHERE id = ?", periodId);
  if (!period) fail("/uitjes/import/excel", "Periode niet gevonden.");

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    fail("/uitjes/import/excel", "Kies een Excel-bestand.");
  }
  if (!/\.xlsx$/i.test(file.name)) {
    fail("/uitjes/import/excel", "Gebruik een .xlsx-bestand.");
  }
  if (file.size > 10 * 1024 * 1024) {
    fail("/uitjes/import/excel", "Het bestand is groter dan 10 MB.");
  }

  const parsed = await readExcelProgram(Buffer.from(await file.arrayBuffer()), period);
  if (parsed.errors.length) {
    fail(
      "/uitjes/import/excel",
      `Het bestand bevat ${parsed.errors.length} fout${parsed.errors.length === 1 ? "" : "en"}. Herstel die eerst in Excel.`,
    );
  }
  if (parsed.rows.length === 0) {
    fail("/uitjes/import/excel", "Er staan geen geldige uitjes in het bestand.");
  }

  const id = `preview-${randomUUID()}`;
  run(
    "INSERT INTO import_previews (id, period_id, created_at, created_by, file_name, payload) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    period.id,
    NOW(),
    user.id,
    file.name,
    JSON.stringify(parsed),
  );
  redirect(`/uitjes/import/excel?preview=${id}`);
}

export async function commitExcelProgramAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const previewId = value(form, "preview_id");
  const preview = get<{ id: string; period_id: string; payload: string; file_name: string }>(
    "SELECT id, period_id, payload, file_name FROM import_previews WHERE id = ?",
    previewId,
  );
  if (!preview) fail("/uitjes/import/excel", "Controle niet gevonden. Upload het bestand opnieuw.");
  const parsed = JSON.parse(preview.payload) as {
    rows: {
      date: string;
      start_time: string;
      end_time: string;
      description: string;
      price_cents: number;
      capacity: number;
      labels: string;
      extra_costs: string;
      series_name: string;
      less_suitable: boolean;
    }[];
  };
  if (!parsed.rows?.length) fail("/uitjes/import/excel", "Er staan geen uitjes in deze controle.");

  const batchId = `imp-${randomUUID()}`;
  const created: string[] = [];
  transaction(() => {
    for (const row of parsed.rows) {
      const id = `o-${randomUUID()}`;
      const seriesKey = row.series_name
        ? `series-${row.series_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
        : "";
      run(
        `INSERT INTO outings
          (id, period_id, series_key, series_name, date, start_time, end_time,
           description, price_cents, extra_costs, labels, capacity,
           less_suitable_walkers, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?)`,
        id,
        preview.period_id,
        seriesKey,
        row.series_name,
        row.date,
        row.start_time,
        row.end_time,
        row.description,
        row.price_cents,
        row.extra_costs,
        row.labels,
        row.capacity,
        row.less_suitable ? 1 : 0,
        NOW(),
      );
      created.push(id);
    }
    run(
      "INSERT INTO import_batches (id, period_id, created_at, created_by, status, outing_ids) VALUES (?, ?, ?, ?, 'committed', ?)",
      batchId,
      preview.period_id,
      NOW(),
      user.id,
      JSON.stringify(created),
    );
    run("DELETE FROM import_previews WHERE id = ?", previewId);
  });

  writeAudit({
    actor: user,
    action: "program.import",
    entityType: "period",
    entityId: preview.period_id,
    summary: `${created.length} uitjes uit ${preview.file_name} geïmporteerd.`,
    after: { count: created.length, file: preview.file_name },
  });
  revalidatePath("/uitjes");
  redirect(`/uitjes/import?batch=${batchId}&ok=1`);
}

export async function importProgramAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const periodId = value(form, "period_id");
  const period = get<Period>("SELECT * FROM periods WHERE id = ?", periodId);
  if (!period) fail("/uitjes/import", "Periode niet gevonden.");

  const parsed = parseProgramCsv(value(form, "csv"), period.default_capacity);
  if (parsed.errors.length) {
    fail(
      "/uitjes/import",
      `De import is niet opgeslagen. Herstel eerst ${parsed.errors.length} fout${parsed.errors.length === 1 ? "" : "en"}.`,
    );
  }
  if (parsed.rows.length === 0) {
    fail("/uitjes/import", "Er staan geen geldige uitjes in het bestand.");
  }
  const outside = parsed.rows.filter(
    (row) => row.date < period.start_date || row.date > period.end_date,
  );
  if (outside.length) {
    fail(
      "/uitjes/import",
      `Er ${outside.length === 1 ? "staat" : "staan"} ${outside.length} datum${outside.length === 1 ? "" : "s"} buiten de periode ${period.name}.`,
    );
  }

  const created: string[] = [];
  const batchId = `imp-${randomUUID()}`;
  transaction(() => {
    for (const row of parsed.rows) {
      const id = `o-${randomUUID()}`;
      const seriesKey = row.series_name
        ? `series-${row.series_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`
        : "";
      run(
        `INSERT INTO outings
          (id, period_id, series_key, series_name, date, start_time, end_time,
           description, price_cents, extra_costs, labels, capacity,
           less_suitable_walkers, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?)`,
        id,
        period.id,
        seriesKey,
        row.series_name,
        row.date,
        row.start_time,
        row.end_time,
        row.description,
        row.price_cents,
        row.extra_costs,
        row.labels,
        row.capacity,
        row.less_suitable ? 1 : 0,
        NOW(),
      );
      created.push(id);
    }
    run(
      "INSERT INTO import_batches (id, period_id, created_at, created_by, status, outing_ids) VALUES (?, ?, ?, ?, 'committed', ?)",
      batchId,
      period.id,
      NOW(),
      user.id,
      JSON.stringify(created),
    );
  });

  writeAudit({
    actor: user,
    action: "program.import",
    entityType: "period",
    entityId: period.id,
    summary: `${created.length} uitjes geïmporteerd voor ${period.name}.`,
    after: { count: created.length },
  });

  revalidatePath("/uitjes");
  redirect(`/uitjes/import?batch=${batchId}&ok=1`);
}

export async function undoImportAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const batchId = value(form, "batch_id");
  const batch = get<{ id: string; period_id: string; status: string; outing_ids: string }>(
    "SELECT id, period_id, status, outing_ids FROM import_batches WHERE id = ?",
    batchId,
  );
  if (!batch) fail("/uitjes/import", "Import niet gevonden.");
  if (batch.status === "undone") fail("/uitjes/import", "Deze import is al ongedaan gemaakt.");
  const ids = JSON.parse(batch.outing_ids) as string[];
  if (ids.length === 0) fail("/uitjes/import", "Deze import bevat geen uitjes.");

  const placeholders = ids.map(() => "?").join(",");
  const dependent = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM signups WHERE outing_id IN (${placeholders}) AND status = 'active'`,
    ...ids,
  )?.n ?? 0;
  const allocated = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM allocations WHERE outing_id IN (${placeholders})`,
    ...ids,
  )?.n ?? 0;
  if (dependent > 0 || allocated > 0) {
    fail(
      "/uitjes/import",
      "Deze uitjes hebben al opgaven of een indeling. Je kunt de import niet meer in één keer terugdraaien. Zet de uitjes op geannuleerd in plaats van ze te verwijderen.",
    );
  }

  transaction(() => {
    run(`DELETE FROM outing_vehicles WHERE outing_id IN (${placeholders})`, ...ids);
    run(`DELETE FROM outings WHERE id IN (${placeholders})`, ...ids);
    run("UPDATE import_batches SET status = 'undone' WHERE id = ?", batchId);
  });

  writeAudit({
    actor: user,
    action: "program.import_undo",
    entityType: "import_batch",
    entityId: batchId,
    summary: `Import van ${ids.length} uitjes ongedaan gemaakt.`,
  });
  revalidatePath("/uitjes");
  redirect(`/uitjes/import?undone=1`);
}

export async function assignVehiclesAutoAction(form: FormData): Promise<void> {
  const user = await requirePermission("vehicles.manage");
  const outingId = value(form, "outing_id");
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", outingId);
  if (!outing) fail("/uitjes", "Uitje niet gevonden.");

  const available = all<{ id: string; name: string; seats: number; license_plate: string }>(
    `SELECT v.id, v.name, v.seats, v.license_plate
       FROM vehicles v
      WHERE v.active = 1 AND v.archived_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM outing_vehicles ov
           WHERE ov.vehicle_id = v.id AND ov.service_date = ? AND ov.outing_id <> ?
        )
      ORDER BY v.name`,
    outing.date,
    outingId,
  );

  let best: typeof available = [];
  let bestSurplus = Number.POSITIVE_INFINITY;
  let bestCount = Number.POSITIVE_INFINITY;
  const total = 1 << available.length;
  for (let mask = 1; mask < total; mask += 1) {
    const combination = available.filter((_, index) => (mask & (1 << index)) !== 0);
    const seats = combination.reduce((sum, vehicle) => sum + vehicle.seats, 0);
    if (seats < outing.capacity) continue;
    const surplus = seats - outing.capacity;
    if (
      surplus < bestSurplus ||
      (surplus === bestSurplus && combination.length < bestCount)
    ) {
      best = combination;
      bestSurplus = surplus;
      bestCount = combination.length;
    }
  }

  if (best.length === 0) {
    fail(`/uitjes/${outingId}`, "Er is geen combinatie van vrije voertuigen die bij de capaciteit past.");
  }

  transaction(() => {
    run("DELETE FROM outing_vehicles WHERE outing_id = ?", outingId);
    for (const vehicle of best) {
      run(
        `INSERT INTO outing_vehicles
          (id, outing_id, vehicle_id, service_date, driver_id, seats_snapshot, plate_snapshot, created_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
        `ov-${randomUUID()}`,
        outingId,
        vehicle.id,
        outing.date,
        vehicle.seats,
        vehicle.license_plate,
        NOW(),
      );
    }
  });

  writeAudit({
    actor: user,
    action: "outing.vehicles_auto",
    entityType: "outing",
    entityId: outingId,
    summary: `Voertuigen automatisch gekoppeld aan ${outing.description}: ${best.map((vehicle) => vehicle.name).join(", ")}.`,
    after: best.map((vehicle) => vehicle.id),
  });
  revalidatePath(`/uitjes/${outingId}`);
  redirect(`/uitjes/${outingId}?ok=1`);
}

export async function addVehicleToOutingAction(form: FormData): Promise<void> {
  const user = await requirePermission("vehicles.manage");
  const outingId = value(form, "outing_id");
  const vehicleId = value(form, "vehicle_id");
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", outingId);
  const vehicle = get<{ id: string; name: string; seats: number; license_plate: string }>(
    "SELECT id, name, seats, license_plate FROM vehicles WHERE id = ? AND active = 1 AND archived_at IS NULL",
    vehicleId,
  );
  if (!outing || !vehicle) fail(`/uitjes/${outingId}`, "Uitje of voertuig niet gevonden.");

  const booked = get<{ id: string }>(
    "SELECT id FROM outing_vehicles WHERE vehicle_id = ? AND service_date = ? AND outing_id <> ?",
    vehicleId,
    outing.date,
    outingId,
  );
  if (booked) fail(`/uitjes/${outingId}`, "Dit voertuig is op deze dag al voor een ander uitje geboekt.");

  try {
    run(
      `INSERT INTO outing_vehicles
        (id, outing_id, vehicle_id, service_date, driver_id, seats_snapshot, plate_snapshot, created_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
      `ov-${randomUUID()}`,
      outingId,
      vehicleId,
      outing.date,
      vehicle.seats,
      vehicle.license_plate,
      NOW(),
    );
  } catch {
    fail(`/uitjes/${outingId}`, "Dit voertuig is al aan dit uitje gekoppeld.");
  }

  writeAudit({
    actor: user,
    action: "outing.vehicle_add",
    entityType: "outing",
    entityId: outingId,
    summary: `Voertuig ${vehicle.name} is aan ${outing.description} toegevoegd.`,
    after: { vehicleId },
  });
  revalidatePath(`/uitjes/${outingId}`);
  redirect(`/uitjes/${outingId}?ok=1`);
}

export async function assignDriverAction(form: FormData): Promise<void> {
  const user = await requirePermission("vehicles.manage");
  const outingVehicleId = value(form, "outing_vehicle_id");
  const driverId = value(form, "driver_id") || null;
  const row = get<{ id: string; outing_id: string }>(
    "SELECT id, outing_id FROM outing_vehicles WHERE id = ?",
    outingVehicleId,
  );
  if (!row) fail("/uitjes", "Voertuigkoppeling niet gevonden.");

  if (driverId) {
    const driver = get<{ id: string; name: string }>(
      "SELECT id, name FROM users WHERE id = ? AND role = 'driver' AND active = 1",
      driverId,
    );
    if (!driver) fail(`/uitjes/${row.outing_id}`, "Chauffeur niet gevonden.");
  }

  run("UPDATE outing_vehicles SET driver_id = ? WHERE id = ?", driverId, outingVehicleId);
  writeAudit({
    actor: user,
    action: "outing.driver",
    entityType: "outing",
    entityId: row.outing_id,
    summary: driverId ? "Chauffeur aan een voertuig gekoppeld." : "Chauffeur verwijderd.",
    after: { outingVehicleId, driverId },
  });
  revalidatePath(`/uitjes/${row.outing_id}`);
  redirect(`/uitjes/${row.outing_id}?ok=1`);
}

export async function removeVehicleFromOutingAction(form: FormData): Promise<void> {
  const user = await requirePermission("vehicles.manage");
  const outingVehicleId = value(form, "outing_vehicle_id");
  const row = get<{ id: string; outing_id: string; vehicle_id: string }>(
    "SELECT id, outing_id, vehicle_id FROM outing_vehicles WHERE id = ?",
    outingVehicleId,
  );
  if (!row) fail("/uitjes", "Koppeling niet gevonden.");
  run("DELETE FROM outing_vehicles WHERE id = ?", outingVehicleId);
  writeAudit({
    actor: user,
    action: "outing.vehicle_remove",
    entityType: "outing",
    entityId: row.outing_id,
    summary: "Voertuigkoppeling verwijderd.",
    before: { vehicleId: row.vehicle_id },
  });
  revalidatePath(`/uitjes/${row.outing_id}`);
  redirect(`/uitjes/${row.outing_id}?ok=1`);
}

export async function saveAttendanceAction(form: FormData): Promise<void> {
  const user = await requirePermission("program.manage");
  const outingId = value(form, "outing_id");
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", outingId);
  if (!outing) fail("/uitjes", "Uitje niet gevonden.");
  const allocationRun = get<Run>(
    "SELECT * FROM allocation_runs WHERE period_id = ? AND phase = 'confirmed' ORDER BY confirmed_at DESC LIMIT 1",
    outing.period_id,
  );
  if (!allocationRun) fail(`/uitjes/${outingId}`, "Bevestig eerst de indeling.");

  const assigned = all<{ participant_id: string }>(
    "SELECT participant_id FROM allocations WHERE run_id = ? AND outing_id = ? AND status = 'assigned'",
    allocationRun.id,
    outingId,
  );
  const allowed = new Set(assigned.map((row) => row.participant_id));
  const present = [...new Set(form.getAll("present").map(String))].filter((id) => allowed.has(id));

  transaction(() => {
    run("DELETE FROM attendance WHERE outing_id = ?", outingId);
    for (const participantId of present) {
      run(
        "INSERT INTO attendance (id, participant_id, outing_id, present, recorded_at) VALUES (?, ?, ?, 1, ?)",
        `att-${randomUUID()}`,
        participantId,
        outingId,
        NOW(),
      );
    }
    run("UPDATE outings SET status = 'completed' WHERE id = ?", outingId);
  });

  writeAudit({
    actor: user,
    action: "outing.attendance",
    entityType: "outing",
    entityId: outingId,
    summary: `Aanwezigheid van ${outing.description} vastgelegd: ${present.length} van ${assigned.length} deelnemers aanwezig.`,
    after: { present: present.length, assigned: assigned.length },
  });
  revalidatePath(`/uitjes/${outingId}`);
  revalidatePath(`/uitjes/${outingId}/afronden`);
  redirect(`/uitjes/${outingId}?ok=${encodeURIComponent("Aanwezigheid opgeslagen en uitje afgerond.")}`);
}

export async function anonymizeParticipantAction(form: FormData): Promise<void> {
  const user = await requirePermission("participants.manage");
  const participantId = value(form, "participant_id");
  const participant = get<Participant>("SELECT * FROM participants WHERE id = ?", participantId);
  if (!participant) fail("/deelnemers", "Deelnemer niet gevonden.");
  if (participant.anonymized_at) {
    fail(`/deelnemers/${participantId}`, "Deze deelnemer is al geanonimiseerd.");
  }

  transaction(() => {
    run(
      `UPDATE participants
          SET first_name = 'Deelnemer', last_name_prefix = '', last_name = 'Geanonimiseerd',
              phone = '', phone_alt = '', email = '', street = '', house_number = '',
              postal_code = '', city = '', notes = '', emergency_name = '', emergency_phone = '',
              cards = '', mobility_walker = 0, mobility_wheelchair = 0, mobility_help_boarding = 0,
              contact_preference = 'phone', status = 'paused',
              anonymized_at = ?, archived_at = ?, updated_at = ?
        WHERE id = ?`,
      NOW(),
      NOW(),
      NOW(),
      participantId,
    );
    run("UPDATE group_members SET active = 0 WHERE participant_id = ?", participantId);
  });

  writeAudit({
    actor: user,
    action: "participant.anonymize",
    entityType: "participant",
    entityId: participantId,
    summary: "Een deelnemer is op verzoek geanonimiseerd.",
  });
  revalidatePath("/deelnemers");
  redirect("/deelnemers?ok=Deelnemer+geanonimiseerd.");
}

export async function logoutAction(): Promise<void> {
  await requireUser();
  redirect("/api/logout");
}
