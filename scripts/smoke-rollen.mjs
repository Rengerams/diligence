import { launchBrowser } from "./browser.mjs";
import { DatabaseSync } from "node:sqlite";

const base = "http://127.0.0.1:3100";
const browser = await launchBrowser({ headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

async function login(email) {
  await page.goto(`${base}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "demo1234");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.waitForURL(`${base}/`);
}

try {
  await login("admin@diligence.local");
  await page.goto(`${base}/rollen`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Rollen en rechten" }).waitFor();
  await page.fill("#role-name", "Balie");
  await page.fill("#role-key", "balie");
  await page.getByLabel("Deelnemers bekijken").check();
  await page.getByRole("button", { name: "Rol aanmaken" }).click();
  await page.waitForURL(/\/rollen\?ok=1/);
  await page.getByRole("heading", { name: "Balie" }).waitFor();
  console.log("- eigen rol aanmaken: ok");

  await page.goto(`${base}/gebruikers`, { waitUntil: "networkidle" });
  await page.fill("#new-name", "Balie Medewerker");
  await page.fill("#new-email", "balie@diligence.local");
  await page.fill("#new-password", "demo1234");
  await page.selectOption("#new-role", { label: "Balie" });
  await page.getByRole("button", { name: "Gebruiker aanmaken" }).click();
  await page.waitForURL(/\/gebruikers\?ok=1/);
  await page.getByText("Balie Medewerker").first().waitFor();
  console.log("- gebruiker met eigen rol: ok");

  await page.getByRole("button", { name: "Uitloggen" }).click();
  await page.waitForURL(/\/login/);
  await login("balie@diligence.local");
  const nav = await page.locator(".nav a").allTextContents();
  if (!nav.includes("Deelnemers")) throw new Error(`Deelnemers ontbreekt in nav: ${nav.join(", ")}`);
  if (nav.includes("Evenementen")) throw new Error(`Evenementen had verborgen moeten zijn: ${nav.join(", ")}`);
  await page.goto(`${base}/deelnemers`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Deelnemers", exact: true }).waitFor();
  await page.goto(`${base}/uitjes`, { waitUntil: "networkidle" });
  if (!page.url().includes("melding")) throw new Error("Evenementen had geblokkeerd moeten zijn");
  console.log("- rechten van eigen rol: ok");

  await page.getByRole("button", { name: "Uitloggen" }).click();
  await page.waitForURL(/\/login/);
  await login("admin@diligence.local");
  await page.goto(`${base}/wijzigingen`, { waitUntil: "networkidle" });
  await page.getByText("Gebruiker Balie Medewerker is aangemaakt").first().waitFor();
  await page.getByText("Rol Balie is aangemaakt").first().waitFor();
  await page.screenshot({ path: "data/screenshots/wijzigingen.png", fullPage: true });
  console.log("- logboek toont rol en gebruiker: ok");

  const db = new DatabaseSync("C:/diligence/data/diligence.db");
  let blocked = false;
  try {
    db.exec("UPDATE audit_log SET summary = 'gewijzigd' WHERE id = 1");
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("audit_log kon worden gewijzigd");
  console.log("- wijzigingsoverzicht is onveranderlijk: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
