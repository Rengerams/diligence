import { launchBrowser } from "./browser.mjs";
import { createHmac } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const base = "http://127.0.0.1:3100";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(input) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function codeFor(secret) {
  const counter = Math.floor(Date.now() / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const value =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(value % 1_000_000).padStart(6, "0");
}

const browser = await launchBrowser({ headless: true });
const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto(`${base}/login`);
  await page.fill("#email", "coordinator@diligence.local");
  await page.fill("#password", "demo1234");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.waitForURL(`${base}/`);

  await page.goto(`${base}/account/beveiliging`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Installatie starten" }).click();
  await page.waitForURL(/\/account\/beveiliging\?setup=1/);

  const db = new DatabaseSync("C:/diligence/data/diligence.db");
  const row = db.prepare("SELECT two_factor_secret FROM users WHERE email = ?").get(
    "coordinator@diligence.local",
  );
  const secret = row.two_factor_secret;
  await page.fill("#enable-code", codeFor(secret));
  await page.getByRole("button", { name: "Tweestapsverificatie aanzetten" }).click();
  await page.waitForURL(/\/account\/beveiliging\?enabled=1/);
  await page.getByText("Tweestapsverificatie staat nu aan").waitFor();
  console.log("- 2FA instellen: ok");

  await page.getByRole("button", { name: "Uitloggen" }).click();
  await page.waitForURL(/\/login/);

  await page.fill("#email", "coordinator@diligence.local");
  await page.fill("#password", "demo1234");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.waitForURL(/\/login\/2fa/);
  await page.getByRole("heading", { name: "Tweede stap" }).waitFor();
  await page.fill("#code", codeFor(secret));
  await page.getByRole("button", { name: "Doorgaan" }).click();
  await page.waitForURL(`${base}/`);
  await page.getByRole("heading", { name: /Goedendag/ }).waitFor();
  console.log("- 2FA login: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
