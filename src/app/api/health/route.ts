import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const result = db.prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
    if (!result || result.ok !== 1) {
      return NextResponse.json({ status: "error", database: "error" }, { status: 503 });
    }

    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());

    return NextResponse.json(
      {
        status: "ok",
        database: "ok",
        timestamp: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
