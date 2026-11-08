import { NextRequest, NextResponse } from "next/server";
import { get } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { clearRateLimit, consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded ?? request.headers.get("x-real-ip") ?? "local";
  const limitKey = rateLimitKey(email, ip);
  const limit = consumeRateLimit(limitKey);
  if (!limit.allowed) {
    writeAudit({
      actor: { id: "anonymous", name: "Onbekend" },
      action: "auth.login_rate_limited",
      entityType: "user",
      summary: "Inlogpoging geblokkeerd door rate limiting.",
    });
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(`Te veel inlogpogingen. Probeer het over ${minutes} ${minutes === 1 ? "minuut" : "minuten"} opnieuw.`)}`,
        request.url,
      ),
    );
  }

  const user = get<{
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role_key: string;
    role_name: string;
    active: number;
    two_factor_enabled: number;
  }>(
    `SELECT u.id, u.name, u.email, u.password_hash,
            COALESCE(u.role_key, u.role) AS role_key,
            COALESCE(r.name, u.role) AS role_name,
            u.active, u.two_factor_enabled
       FROM users u
       LEFT JOIN roles r ON r.key = COALESCE(u.role_key, u.role)
      WHERE lower(u.email) = ?`,
    email,
  );

  if (!user || user.active !== 1 || !verifyPassword(password, user.password_hash)) {
    writeAudit({
      actor: { id: "anonymous", name: "Onbekend" },
      action: "auth.login_failed",
      entityType: "user",
      summary: "Mislukte inlogpoging.",
    });
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("E-mailadres of wachtwoord klopt niet.")}`, request.url),
    );
  }

  clearRateLimit(limitKey);
  const { token, expiresAt } = createSession(user.id, user.two_factor_enabled !== 1);
  writeAudit({
    actor: { id: user.id, name: user.name, roleName: user.role_name },
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    summary:
      user.two_factor_enabled === 1
        ? `${user.name} heeft het wachtwoord ingevoerd; de tweede stap volgt.`
        : `${user.name} is ingelogd.`,
  });

  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const origin = host ? `${protocol}://${host}` : request.nextUrl.origin;
  const response = NextResponse.redirect(
    new URL(user.two_factor_enabled === 1 ? "/login/2fa" : "/", origin),
  );
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    expires: expiresAt,
    path: "/",
  });
  return response;
}
