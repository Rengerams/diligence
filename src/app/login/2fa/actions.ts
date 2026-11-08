"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, run } from "@/lib/db";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { verifyRecoveryCode, verifyTotp } from "@/lib/totp";

export async function verifyTwoFactorAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mfaVerified) redirect("/");

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

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    run("UPDATE sessions SET mfa_verified = 1 WHERE token = ?", token);
  }

  writeAudit({
    actor: user,
    action: "auth.2fa",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} heeft de tweede stap voltooid.`,
  });

  redirect("/");
}
