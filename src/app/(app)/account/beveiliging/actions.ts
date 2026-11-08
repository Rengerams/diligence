"use server";

import { redirect } from "next/navigation";
import { get, run } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { generateRecoveryCodes, generateTotpSecret, verifyTotp } from "@/lib/totp";

export async function startTwoFactorAction(): Promise<void> {
  const user = await requireUser();
  const secret = generateTotpSecret();
  const recovery = generateRecoveryCodes();
  run(
    `UPDATE users
        SET two_factor_secret = ?, two_factor_enabled = 0,
            recovery_codes = ?, recovery_codes_display = ?
      WHERE id = ?`,
    secret,
    JSON.stringify(recovery.hashed),
    JSON.stringify(recovery.plain),
    user.id,
  );
  writeAudit({
    actor: user,
    action: "auth.2fa_start",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} is begonnen met het instellen van tweestapsverificatie.`,
  });
  redirect("/account/beveiliging?setup=1");
}

export async function enableTwoFactorAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  const record = get<{ two_factor_secret: string | null }>(
    "SELECT two_factor_secret FROM users WHERE id = ?",
    user.id,
  );
  if (!record?.two_factor_secret) {
    redirect("/account/beveiliging?error=Start+eerste+de+installatie.");
  }
  if (!verifyTotp(record.two_factor_secret, code)) {
    redirect("/account/beveiliging?setup=1&error=De+code+klopt+niet.");
  }
  run(
    "UPDATE users SET two_factor_enabled = 1, recovery_codes_display = NULL WHERE id = ?",
    user.id,
  );
  writeAudit({
    actor: user,
    action: "auth.2fa_enable",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} heeft tweestapsverificatie aangezet.`,
  });
  redirect("/account/beveiliging?enabled=1");
}

export async function disableTwoFactorAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  const record = get<{ two_factor_secret: string | null; two_factor_enabled: number }>(
    "SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?",
    user.id,
  );
  if (!record?.two_factor_secret || record.two_factor_enabled !== 1) {
    redirect("/account/beveiliging?error=Tweestapsverificatie+staat+niet+aan.");
  }
  if (!verifyTotp(record.two_factor_secret, code)) {
    redirect("/account/beveiliging?error=De+code+klopt+niet.");
  }
  run(
    "UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, recovery_codes = NULL, recovery_codes_display = NULL WHERE id = ?",
    user.id,
  );
  writeAudit({
    actor: user,
    action: "auth.2fa_disable",
    entityType: "user",
    entityId: user.id,
    summary: `${user.name} heeft tweestapsverificatie uitgezet.`,
  });
  redirect("/account/beveiliging?disabled=1");
}
