"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { get, run } from "@/lib/db";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { verifyRecoveryCode, verifyTotp } from "@/lib/totp";
import { clearRateLimit, consumeRateLimit, rateLimitKey } from "@/lib/rate-limit";

const MFA_LIMIT = 5;
const MFA_WINDOW_SECONDS = 15 * 60;

async function mfaLimitKey(token: string): Promise<string> {
  const hashed = createHash("sha256").update(token).digest("hex").slice(0, 32);
  return `mfa:${hashed}`;
}

export async function verifyTwoFactorAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mfaVerified) redirect("/");

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  // Tweede stap heeft een eigen, atomaire teller per sessie. Zonder deze teller
  // is het beperkte aantal TOTP-codes online onbeperkt te raden.
  const limitKey = await mfaLimitKey(token);
  const limit = consumeRateLimit(limitKey, MFA_LIMIT, MFA_WINDOW_SECONDS);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    writeAudit({
      actor: user,
      action: "auth.2fa_rate_limited",
      entityType: "user",
      entityId: user.id,
      summary: "Tweede stap geblokkeerd door rate limiting.",
    });
    redirect(
      `/login/2fa?error=${encodeURIComponent(`Te veel pogingen. Probeer het over ${minutes} ${minutes === 1 ? "minuut" : "minuten"} opnieuw.`)}`,
    );
  }

  const code = String(formData.get("code") ?? "").trim();
  const record = get<{
    two_factor_secret: string | null;
    two_factor_enabled: number;
    recovery_codes: string | null;
  }>(
    "SELECT two_factor_secret, two_factor_enabled, recovery_codes FROM users WHERE id = ?",
    user.id,
  );

  if (!record || record.two_factor_enabled !== 1 || !record.two_factor_secret) {
    redirect("/login/2fa?error=2FA+is+niet+ingesteld.");
  }

  let valid = verifyTotp(record.two_factor_secret, code);
  if (!valid && record.recovery_codes) {
    const stored = JSON.parse(record.recovery_codes) as string[];
    const index = verifyRecoveryCode(stored, code);
    if (index >= 0) {
      stored.splice(index, 1);
      run("UPDATE users SET recovery_codes = ? WHERE id = ?", JSON.stringify(stored), user.id);
      valid = true;
    }
  }

  if (!valid) {
    redirect("/login/2fa?error=De+code+klopt+niet.+Probeer+opnieuw.");
  }

  run("UPDATE sessions SET mfa_verified = 1 WHERE token = ?", token);

  // Pas nu de tellers wissen: de tweede stap is gelukt.
  clearRateLimit(limitKey);
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded ?? headerStore.get("x-real-ip") ?? "local";
  clearRateLimit(rateLimitKey(user.email, ip));

  writeAudit({
    actor: user,
    action: "auth.2fa",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} heeft de tweede stap voltooid.`,
  });

  redirect("/");
}
