import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
fs.mkdirSync(dist, { recursive: true });

const stamp = new Date().toISOString().slice(0, 10);
const excludes = [
  "--exclude=./node_modules",
  "--exclude=./.next",
  "--exclude=./data",
  "--exclude=./dist",
  "--exclude=./backups",
  "--exclude=./logs",
  "--exclude=./.git",
  "--exclude=./.env",
  "--exclude=./.env.production",
  "--exclude=./.env.local",
  "--exclude=./next-env.d.ts",
  "--exclude=./tsconfig.tsbuildinfo",
  "--exclude=./diligence.zip",
  "--exclude=*.zip",
  "--exclude=*.tar.gz",
  "--exclude=*.log",
  ".",
];

function createArchive(args, label) {
  const result = spawnSync("tar", args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`Bronarchief gemaakt: ${label}`);
}

const tarGz = path.join(dist, `diligence-source-${stamp}.tar.gz`);
createArchive(["-czf", tarGz, ...excludes], tarGz);

if (process.platform === "win32") {
  const zip = path.join(dist, `diligence-source-${stamp}.zip`);
  createArchive(["-a", "-cf", zip, ...excludes], zip);
}

console.log("Bevat geen .next, data, back-ups, .env, node_modules, sessies of cookies.");
