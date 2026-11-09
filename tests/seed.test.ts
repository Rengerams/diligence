import { afterAll, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dbPath = path.join(os.tmpdir(), `seed-check-${Date.now()}.db`);
process.env.DILIGENCE_DB_PATH = dbPath;
process.env.SEED_DEMO_DATA = "false";
process.env.SEED_ADMIN_EMAIL = "Boss@Example.nl";
process.env.SEED_ADMIN_PASSWORD = "geheim123";

const { getDb } = await import("../src/lib/db");

test("first run with SEED_DEMO_DATA=false creates one admin from env", () => {
  const db = getDb();
  const users = db.prepare("SELECT email, name, role_key FROM users").all() as {
    email: string;
    name: string;
    role_key: string;
  }[];
  const participants = db.prepare("SELECT COUNT(*) AS n FROM participants").get() as { n: number };

  expect(users).toHaveLength(1);
  expect(users[0]?.email).toBe("boss@example.nl");
  expect(users[0]?.role_key).toBe("admin");
  expect(participants.n).toBe(0);
});

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
});
