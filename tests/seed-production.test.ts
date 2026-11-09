import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { SeedConfigurationError, seedDatabase } from "../src/lib/seed";

function emptyDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      role_key TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const originalEnv = {
  email: process.env.SEED_ADMIN_EMAIL,
  password: process.env.SEED_ADMIN_PASSWORD,
  demo: process.env.SEED_DEMO_DATA,
};

beforeEach(() => {
  env.NODE_ENV = "production";
  delete process.env.SEED_ADMIN_EMAIL;
  delete process.env.SEED_ADMIN_PASSWORD;
  delete process.env.SEED_DEMO_DATA;
});

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
  for (const [key, value] of Object.entries({
    SEED_ADMIN_EMAIL: originalEnv.email,
    SEED_ADMIN_PASSWORD: originalEnv.password,
    SEED_DEMO_DATA: originalEnv.demo,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("eenmalige inrichting van een productiedatabase", () => {
  it("weigert te starten zonder beheerdersgegevens", () => {
    const db = emptyDatabase();
    expect(() => seedDatabase(db)).toThrow(SeedConfigurationError);
    const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    expect(count.n).toBe(0);
    db.close();
  });

  it("weigert het demowachtwoord als productiewachtwoord", () => {
    process.env.SEED_ADMIN_EMAIL = "beheer@example.nl";
    process.env.SEED_ADMIN_PASSWORD = "demo1234";
    const db = emptyDatabase();
    expect(() => seedDatabase(db)).toThrow(SeedConfigurationError);
    db.close();
  });

  it("maakt alleen de beheerder en nooit demogegevens", () => {
    process.env.SEED_ADMIN_EMAIL = "Beheer@Example.nl";
    process.env.SEED_ADMIN_PASSWORD = "een-lang-genoeg-wachtwoord";
    process.env.SEED_DEMO_DATA = "true";
    const db = emptyDatabase();
    seedDatabase(db);
    const users = db.prepare("SELECT email, role_key FROM users").all() as {
      email: string;
      role_key: string;
    }[];
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe("beheer@example.nl");
    expect(users[0]?.role_key).toBe("admin");
    db.close();
  });
});
