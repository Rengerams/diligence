import { NextResponse } from "next/server";
import { all, get } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { getParticipant } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  if (!can(user, "participants.view")) {
    return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
  }
  const { id } = await params;
  const participant = getParticipant(id);
  if (!participant) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const signups = all<{
    target_type: string;
    date: string | null;
    description: string | null;
    status: string;
    created_at: string;
  }>(
    `SELECT s.target_type, o.date, o.description, s.status, s.created_at
       FROM signups s LEFT JOIN outings o ON o.id = s.outing_id
      WHERE s.participant_id = ? ORDER BY s.created_at`,
    id,
  );
  const attendance = all<{ date: string; description: string }>(
    `SELECT o.date, o.description
       FROM attendance a JOIN outings o ON o.id = a.outing_id
      WHERE a.participant_id = ? AND a.present = 1 ORDER BY o.date`,
    id,
  );
  const history = all<{ visit_date: string; description: string }>(
    "SELECT visit_date, description FROM historical_visits WHERE participant_id = ? ORDER BY visit_date",
    id,
  );

  writeAudit({
    actor: user,
    action: "participant.export",
    entityType: "participant",
    entityId: id,
    summary: `Gegevens van ${participant.first_name} ${participant.last_name} geëxporteerd.`,
  });

  const payload = {
    geexporteerdOp: new Date().toISOString(),
    deelnemer: participant,
    opgaven: signups,
    aanwezigheid: attendance,
    bezoekgeschiedenis: history,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="deelnemer-${id}.json"`,
    },
  });
}
