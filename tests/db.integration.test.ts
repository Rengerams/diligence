import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "diligence-test-"));
process.env.DILIGENCE_DB_PATH = path.join(tempDir, "test.db");

const dbModule = await import("../src/lib/db");
const { getDb, transaction } = dbModule;
const { can } = await import("../src/lib/permissions");
const { clearRateLimit, consumeRateLimit } = await import("../src/lib/rate-limit");

const db = getDb();

afterAll(() => {
  try {
    db.close();
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("SQLite-integratie", () => {
  it("laadt de demo-seed en de systeemrollen", () => {
    const participants = db.prepare("SELECT COUNT(*) AS n FROM participants").get() as { n: number };
    const outings = db.prepare("SELECT COUNT(*) AS n FROM outings").get() as { n: number };
    const roles = db.prepare("SELECT COUNT(*) AS n FROM roles").get() as { n: number };
    expect(participants.n).toBe(14);
    expect(outings.n).toBe(9);
    expect(roles.n).toBe(4);
  });

  it("beschermt het wijzigingsoverzicht tegen wijzigen en verwijderen", () => {
    expect(() =>
      db.prepare("UPDATE audit_log SET summary = 'aangepast' WHERE id = 1").run(),
    ).toThrow();
    expect(() => db.prepare("DELETE FROM audit_log WHERE id = 1").run()).toThrow();
  });

  it("staat maar één actief groepje per deelnemer toe", () => {
    db.prepare('INSERT INTO "groups" (id, name, created_at) VALUES (?, ?, ?)').run(
      "g-test",
      "Testgroep",
      new Date().toISOString(),
    );
    expect(() =>
      db
        .prepare("INSERT INTO group_members (group_id, participant_id, active, created_at) VALUES (?, ?, 1, ?)")
        .run("g-test", "p-01", new Date().toISOString()),
    ).toThrow();
  });

  it("voorkomt een dubbele voertuigboeking op dezelfde dag", () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO outing_vehicles
            (id, outing_id, vehicle_id, service_date, driver_id, seats_snapshot, plate_snapshot, created_at)
           VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
        )
        .run("ov-test", "o-02", "v-01", "2026-11-12", 7, "12-ABC-3", new Date().toISOString()),
    ).toThrow();
  });

  it("draait een mislukte transactie volledig terug", () => {
    const before = (db.prepare("SELECT COUNT(*) AS n FROM participants").get() as { n: number }).n;
    expect(() =>
      transaction(() => {
        db.prepare(
          `INSERT INTO participants (id, first_name, last_name, created_at, updated_at)
           VALUES ('p-rollback', 'Test', 'Rollback', ?, ?)`,
        ).run(new Date().toISOString(), new Date().toISOString());
        throw new Error("rollback");
      }),
    ).toThrow("rollback");
    const after = (db.prepare("SELECT COUNT(*) AS n FROM participants").get() as { n: number }).n;
    expect(after).toBe(before);
  });

  it("begrenst herhaalde inlogpogingen", () => {
    const key = "test-rate-limit";
    expect(consumeRateLimit(key, 2, 60).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 60).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 60).allowed).toBe(false);
    clearRateLimit(key);
    expect(consumeRateLimit(key, 2, 60).allowed).toBe(true);
  });

  it("past rechten alleen toe via de rolpermissies", () => {
    expect(can({ permissions: ["*"] }, "roles.manage")).toBe(true);
    expect(can({ permissions: ["participants.view"] }, "participants.view")).toBe(true);
    expect(can({ permissions: ["participants.view"] }, "participants.manage")).toBe(false);
    expect(can({ permissions: [] }, "participants.view")).toBe(false);
  });
});
