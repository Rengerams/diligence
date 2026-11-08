import { DatabaseSync } from "node:sqlite";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve(process.env.DILIGENCE_DB_PATH ?? "data/diligence.db");
const backupDir = path.resolve(process.env.BACKUP_DIR ?? "backups");
const keyRaw = process.env.BACKUP_KEY;
if (!keyRaw) {
  throw new Error(
    "BACKUP_KEY ontbreekt. Zet een 32-byte base64- of 64-tekens hex-sleutel in de omgeving.",
  );
}
const key = /^[0-9a-f]{64}$/i.test(keyRaw)
  ? Buffer.from(keyRaw, "hex")
  : Buffer.from(keyRaw, "base64");
if (key.length !== 32) throw new Error("BACKUP_KEY moet 32 bytes zijn (base64 of hex).");
if (!fs.existsSync(dbPath)) throw new Error(`Database niet gevonden: ${dbPath}`);

fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const temp = path.join(backupDir, `.snapshot-${stamp}.db`);
const target = path.join(backupDir, `diligence-${stamp}.db.enc`);

const db = new DatabaseSync(dbPath);
try {
  db.exec(`VACUUM INTO '${temp.replace(/'/g, "''")}'`);
} finally {
  db.close();
}

try {
  const plain = fs.readFileSync(temp);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  fs.writeFileSync(target, Buffer.concat([Buffer.from("DILIGENCE1"), iv, tag, encrypted]), {
    mode: 0o600,
  });

  const retentionDays = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS ?? 30));
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(backupDir)) {
    if (!file.endsWith(".db.enc")) continue;
    const full = path.join(backupDir, file);
    if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
  }

  console.log(
    JSON.stringify({
      backup: target,
      bytes: fs.statSync(target).size,
      sha256: createHash("sha256").update(plain).digest("hex"),
      retentionDays,
    }),
  );
} finally {
  if (fs.existsSync(temp)) fs.unlinkSync(temp);
}
