import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedDatabase } from "./seed";
import { BUILTIN_ROLES } from "./permissions";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coordinator', 'driver')),
  role_key TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  two_factor_secret TEXT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  recovery_codes TEXT,
  recovery_codes_display TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  permissions TEXT NOT NULL DEFAULT '[]',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT,
  mfa_verified INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name_prefix TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  phone_alt TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  house_number TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  contact_preference TEXT NOT NULL DEFAULT 'phone'
    CHECK (contact_preference IN ('phone', 'email', 'both')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'stopped')),
  stopped_on TEXT,
  stop_reason TEXT,
  mobility_walker INTEGER NOT NULL DEFAULT 0,
  mobility_wheelchair INTEGER NOT NULL DEFAULT 0,
  mobility_help_boarding INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  emergency_name TEXT NOT NULL DEFAULT '',
  emergency_phone TEXT NOT NULL DEFAULT '',
  cards TEXT NOT NULL DEFAULT '',
  email_unsubscribed_at TEXT,
  anonymized_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "groups" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL REFERENCES "groups"(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  PRIMARY KEY (group_id, participant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_group_per_participant
  ON group_members(participant_id) WHERE active = 1;

CREATE TABLE IF NOT EXISTS periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  default_capacity INTEGER NOT NULL DEFAULT 14,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  archived_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES categories(id),
  archived_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outings (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES periods(id),
  series_key TEXT NOT NULL DEFAULT '',
  series_name TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  description TEXT NOT NULL,
  location_id TEXT REFERENCES locations(id),
  category_id TEXT REFERENCES categories(id),
  price_cents INTEGER NOT NULL DEFAULT 0,
  extra_costs TEXT NOT NULL DEFAULT '',
  labels TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 14,
  less_suitable_walkers INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'cancelled', 'completed')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license_plate TEXT NOT NULL DEFAULT '',
  license_plate_normalized TEXT NOT NULL DEFAULT '',
  seats INTEGER NOT NULL CHECK (seats BETWEEN 1 AND 100),
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_license_plate
  ON vehicles(license_plate_normalized)
  WHERE archived_at IS NULL AND license_plate_normalized <> '';

CREATE TABLE IF NOT EXISTS outing_vehicles (
  id TEXT PRIMARY KEY,
  outing_id TEXT NOT NULL REFERENCES outings(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  service_date TEXT NOT NULL,
  driver_id TEXT REFERENCES users(id),
  seats_snapshot INTEGER NOT NULL,
  plate_snapshot TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (outing_id, vehicle_id),
  UNIQUE (vehicle_id, service_date)
);

CREATE TABLE IF NOT EXISTS historical_visits (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  visit_date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  outing_id TEXT NOT NULL REFERENCES outings(id),
  present INTEGER NOT NULL DEFAULT 1,
  recorded_at TEXT NOT NULL,
  UNIQUE (participant_id, outing_id)
);

CREATE TABLE IF NOT EXISTS signups (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES periods(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('outing', 'series', 'period')),
  outing_id TEXT REFERENCES outings(id),
  series_key TEXT NOT NULL DEFAULT '',
  group_mode TEXT NOT NULL DEFAULT 'alone'
    CHECK (group_mode IN ('with_group', 'alone')),
  group_id TEXT REFERENCES "groups"(id),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS signups_period ON signups(period_id, status);
CREATE INDEX IF NOT EXISTS signups_outing ON signups(outing_id, status);

CREATE TABLE IF NOT EXISTS allocation_runs (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES periods(id),
  kind TEXT NOT NULL DEFAULT 'system' CHECK (kind IN ('system', 'manual')),
  phase TEXT NOT NULL DEFAULT 'proposal' CHECK (phase IN ('proposal', 'confirmed')),
  algorithm_version TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  confirmed_at TEXT,
  confirmed_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS allocations (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES allocation_runs(id),
  outing_id TEXT NOT NULL REFERENCES outings(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  group_id TEXT REFERENCES "groups"(id),
  status TEXT NOT NULL CHECK (status IN ('assigned', 'waitlist', 'tie')),
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'manual')),
  reason_code TEXT NOT NULL,
  reason_text TEXT NOT NULL DEFAULT '',
  rank INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (run_id, outing_id, participant_id)
);

CREATE INDEX IF NOT EXISTS allocations_run ON allocations(run_id, outing_id, status);

CREATE TABLE IF NOT EXISTS call_tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES allocation_runs(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  outing_id TEXT NOT NULL REFERENCES outings(id),
  kind TEXT NOT NULL CHECK (kind IN ('assigned', 'waitlist')),
  status TEXT NOT NULL DEFAULT 'to_call'
    CHECK (status IN ('to_call', 'called', 'not_reached', 'declined')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES allocation_runs(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  outing_id TEXT NOT NULL REFERENCES outings(id),
  kind TEXT NOT NULL CHECK (kind IN ('assigned', 'waitlist')),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'demo', 'sent', 'failed')),
  provider_message_id TEXT,
  error TEXT,
  unsubscribe_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  delivery_attempt_at TEXT
);

CREATE INDEX IF NOT EXISTS notifications_run ON notifications(run_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unsubscribe ON notifications(unsubscribe_token);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  route TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'done')),
  created_at TEXT NOT NULL,
  handled_by TEXT REFERENCES users(id),
  handled_at TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'free_spot'
    CHECK (type IN ('free_spot')),
  outing_id TEXT NOT NULL REFERENCES outings(id),
  participant_id TEXT REFERENCES participants(id),
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'done')),
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  handled_at TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS import_previews (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES periods(id),
  created_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  file_name TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES periods(id),
  created_at TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('committed', 'undone')),
  outing_ids TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);

CREATE INDEX IF NOT EXISTS audit_at ON audit_log(at DESC);
CREATE INDEX IF NOT EXISTS audit_actor ON audit_log(actor_id, at DESC);

CREATE TRIGGER IF NOT EXISTS audit_log_no_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'Het wijzigingsoverzicht is onveranderlijk.');
END;

CREATE TRIGGER IF NOT EXISTS audit_log_no_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'Het wijzigingsoverzicht is onveranderlijk.');
END;
`;

type GlobalWithDb = typeof globalThis & {
  __diligenceDb?: DatabaseSync;
  __diligenceDbPath?: string;
};

const globalWithDb = globalThis as GlobalWithDb;

export function getDb(): DatabaseSync {
  const dbPath = process.env.DILIGENCE_DB_PATH
    ? path.resolve(process.env.DILIGENCE_DB_PATH)
    : path.join(process.cwd(), "data", "diligence.db");

  if (globalWithDb.__diligenceDb && globalWithDb.__diligenceDbPath !== dbPath) {
    globalWithDb.__diligenceDb.close();
    globalWithDb.__diligenceDb = undefined;
  }

  if (!globalWithDb.__diligenceDb) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA);
    ensureSchemaUpdates(db);
    const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as
      | { n: number }
      | undefined;
    if ((!count || Number(count.n) === 0) && process.env.NEXT_PHASE !== "phase-production-build") {
      seedDatabase(db);
    }
    globalWithDb.__diligenceDb = db;
    globalWithDb.__diligenceDbPath = dbPath;
  }
  return globalWithDb.__diligenceDb;
}

function ensureSchemaUpdates(db: DatabaseSync): void {
  const outingColumns = db.prepare("PRAGMA table_info(outings)").all() as { name: string }[];
  if (!outingColumns.some((column) => column.name === "location_id")) {
    db.exec("ALTER TABLE outings ADD COLUMN location_id TEXT REFERENCES locations(id);");
  }
  if (!outingColumns.some((column) => column.name === "category_id")) {
    db.exec("ALTER TABLE outings ADD COLUMN category_id TEXT REFERENCES categories(id);");
  }

  const groupColumns = db.prepare('PRAGMA table_info("groups")').all() as { name: string }[];
  if (!groupColumns.some((column) => column.name === "archived_at")) {
    db.exec('ALTER TABLE "groups" ADD COLUMN archived_at TEXT;');
  }

  const participantColumns = db.prepare("PRAGMA table_info(participants)").all() as {
    name: string;
  }[];
  if (!participantColumns.some((column) => column.name === "email_unsubscribed_at")) {
    db.exec("ALTER TABLE participants ADD COLUMN email_unsubscribed_at TEXT;");
  }
  if (!participantColumns.some((column) => column.name === "anonymized_at")) {
    db.exec("ALTER TABLE participants ADD COLUMN anonymized_at TEXT;");
  }

  const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userColumns.some((column) => column.name === "role_key")) {
    db.exec("ALTER TABLE users ADD COLUMN role_key TEXT;");
    db.exec("UPDATE users SET role_key = role WHERE role_key IS NULL;");
  }
  if (!userColumns.some((column) => column.name === "two_factor_secret")) {
    db.exec("ALTER TABLE users ADD COLUMN two_factor_secret TEXT;");
  }
  if (!userColumns.some((column) => column.name === "two_factor_enabled")) {
    db.exec("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0;");
  }
  if (!userColumns.some((column) => column.name === "recovery_codes")) {
    db.exec("ALTER TABLE users ADD COLUMN recovery_codes TEXT;");
  }
  if (!userColumns.some((column) => column.name === "recovery_codes_display")) {
    db.exec("ALTER TABLE users ADD COLUMN recovery_codes_display TEXT;");
  }

  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
  if (!sessionColumns.some((column) => column.name === "mfa_verified")) {
    db.exec("ALTER TABLE sessions ADD COLUMN mfa_verified INTEGER NOT NULL DEFAULT 1;");
  }
  if (!sessionColumns.some((column) => column.name === "last_seen_at")) {
    db.exec("ALTER TABLE sessions ADD COLUMN last_seen_at TEXT;");
    db.exec("UPDATE sessions SET last_seen_at = created_at WHERE last_seen_at IS NULL;");
  }

  const auditColumns = db.prepare("PRAGMA table_info(audit_log)").all() as { name: string }[];
  if (!auditColumns.some((column) => column.name === "actor_role")) {
    db.exec("ALTER TABLE audit_log ADD COLUMN actor_role TEXT NOT NULL DEFAULT '';");
  }

  const previewColumns = db.prepare("PRAGMA table_info(import_previews)").all() as {
    name: string;
  }[];
  if (!previewColumns.some((column) => column.name === "expires_at")) {
    db.exec("ALTER TABLE import_previews ADD COLUMN expires_at TEXT;");
  }

  const notificationColumns = db.prepare("PRAGMA table_info(notifications)").all() as {
    name: string;
  }[];
  if (!notificationColumns.some((column) => column.name === "delivery_attempt_at")) {
    db.exec("ALTER TABLE notifications ADD COLUMN delivery_attempt_at TEXT;");
  }

  // Eén bevestigde indeling per periode. De index wordt alleen aangemaakt als de
  // bestaande gegevens er al aan voldoen, zodat een oude database blijft werken.
  const confirmedDuplicates = db
    .prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT period_id FROM allocation_runs WHERE phase = 'confirmed'
          GROUP BY period_id HAVING COUNT(*) > 1
       )`,
    )
    .get() as { n: number } | undefined;
  if (!confirmedDuplicates || Number(confirmedDuplicates.n) === 0) {
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS one_confirmed_run_per_period
         ON allocation_runs(period_id) WHERE phase = 'confirmed';`,
    );
  }

  const insertRole = db.prepare(
    `INSERT INTO roles (key, name, description, permissions, is_system, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       permissions = excluded.permissions
     WHERE roles.is_system = 1`,
  );
  for (const role of BUILTIN_ROLES) {
    insertRole.run(
      role.key,
      role.name,
      role.description,
      JSON.stringify(role.permissions),
      role.isSystem ? 1 : 0,
      new Date().toISOString(),
    );
  }
}

export function all<T>(sql: string, ...params: unknown[]): T[] {
  return getDb()
    .prepare(sql)
    .all(...(params as never[])) as T[];
}

export function get<T>(sql: string, ...params: unknown[]): T | undefined {
  return getDb()
    .prepare(sql)
    .get(...(params as never[])) as T | undefined;
}

export function run(
  sql: string,
  ...params: unknown[]
): { changes: number; lastInsertRowid: number | bigint } {
  return getDb()
    .prepare(sql)
    .run(...(params as never[])) as {
    changes: number;
    lastInsertRowid: number | bigint;
  };
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    return result;
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}
