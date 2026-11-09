import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const server = path.join(standalone, "server.js");
if (!fs.existsSync(server)) {
  throw new Error("Geen standalone-build gevonden. Draai eerst `pnpm build`.");
}

const staticSource = path.join(root, ".next", "static");
const staticTarget = path.join(standalone, ".next", "static");
if (fs.existsSync(staticSource)) {
  fs.mkdirSync(staticTarget, { recursive: true });
  fs.cpSync(staticSource, staticTarget, { recursive: true, force: true });
}

const publicSource = path.join(root, "public");
const publicTarget = path.join(standalone, "public");
if (fs.existsSync(publicSource)) {
  fs.cpSync(publicSource, publicTarget, { recursive: true, force: true });
}

const child = spawn(process.execPath, [server], {
  cwd: standalone,
  env: {
    ...process.env,
    PORT: process.env.PORT ?? "3100",
    // Niet process.env.HOSTNAME gebruiken: op hostingpanelen (Passenger) staat
    // daar de servernaam in, en dan kan de app niet aan een poort binden.
    HOSTNAME: process.env.DILIGENCE_BIND_HOST ?? "0.0.0.0",
    DILIGENCE_DB_PATH:
      process.env.DILIGENCE_DB_PATH ?? path.join(root, "data", "diligence.db"),
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 1));
