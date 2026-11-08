import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (user) {
    writeAudit({
      actor: user,
      action: "auth.logout",
      entityType: "user",
      entityId: user.id,
      summary: `${user.name} is uitgelogd.`,
    });
  }
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);

  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const origin = host ? `${protocol}://${host}` : request.nextUrl.origin;
  const response = NextResponse.redirect(new URL("/login", origin));
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
