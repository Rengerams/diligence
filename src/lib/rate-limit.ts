import { createHash } from "node:crypto";
import { get, run } from "./db";

export function rateLimitKey(email: string, ip: string): string {
  return createHash("sha256")
    .update(`${email.toLowerCase()}|${ip}|${process.env.RATE_LIMIT_SECRET ?? "diligence"}`)
    .digest("hex");
}

export function consumeRateLimit(
  key: string,
  limit = 10,
  windowSeconds = 15 * 60,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = new Date(now - windowSeconds * 1000).toISOString();
  const row = get<{ window_start: string; count: number }>(
    "SELECT window_start, count FROM rate_limits WHERE key = ?",
    key,
  );

  if (!row || row.window_start < cutoff) {
    run(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1`,
      key,
      new Date(now).toISOString(),
    );
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (row.count >= limit) {
    const retry = Math.max(
      1,
      Math.ceil((new Date(row.window_start).getTime() + windowSeconds * 1000 - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds: retry };
  }

  run("UPDATE rate_limits SET count = count + 1 WHERE key = ?", key);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearRateLimit(key: string): void {
  run("DELETE FROM rate_limits WHERE key = ?", key);
}
