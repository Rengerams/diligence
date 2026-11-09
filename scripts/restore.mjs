import { DatabaseSync } from "node:sqlite";
import { createDecipheriv } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  throw new Error("Gebruik: node scripts/restore.mjs <backup.db.enc> [doelbestand]");
}
const source = path.resolve(file);
const target = path.resolve(process.argv[3] ?? `data/restored-${Date.now()}.db`);
const keyRaw = process.env.BACKUP_KEY;
if (!keyRaw) throw new Error("BACKUP_KEY ontbreekt.");
const key = /^[0-9a-f]{64}$/i.test(keyRaw)
  ? Buffer.from(keyRaw, "hex")
  : Buffer.from(keyRaw, "base64");
if (key.length !== 32) throw new Error("BACKUP_KEY moet 32 bytes zijn (base64 of hex).");

const payload = fs.readFileSync(source);
if (payload.subarray(0, 10).toString() !== "DILIGENCE1") {
  throw new Error("Dit is geen Diligence-back-upbestand.");
}
const iv = payload.subarray(10, 22);
const tag = payload.subarray(22, 38);
const ciphertext = payload.subarray(38);
const decipher = createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(tag);
const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

fs.mkdirSync(path.dirname(target), { recursive: true });
// Eerst uitpakken naar een tijdelijk bestand en controleren. Pas als de
// controle slaagt, vervangt de back-up het doelbestand. Zo blijft een goede
// database staan als de back-up beschadigd is.
const temp = `${target}.restore-${process.pid}.tmp`;
fs.writeFileSync(temp, plain, { mode: 0o600 });
fs.chmodSync(temp, 0o600);
try {
  const db = new DatabaseSync(temp);
  try {
    const result = db.prepare("PRAGMA integrity_check").get();
    if (!result || result.integrity_check !== "ok") {
      throw new Error(`Integriteitscontrole mislukt: ${JSON.stringify(result)}`);
    }
  } finally {
    db.close();
  }
  fs.renameSync(temp, target);
} finally {
  if (fs.existsSync(temp)) fs.unlinkSync(temp);
}
console.log(`Back-up uitgepakt naar ${target}. Stop de app en vervang hiermee de actieve database.`);
