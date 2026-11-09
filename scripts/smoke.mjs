import { launchBrowser } from "./browser.mjs";
import fs from "node:fs";
import path from "node:path";

const base = "http://127.0.0.1:3100";
const shots = path.join(process.cwd(), "data", "screenshots");
fs.mkdirSync(shots, { recursive: true });

const browser = await launchBrowser({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

async function step(name, fn) {
  process.stdout.write(`- ${name} ... `);
  await fn();
  console.log("ok");
}

try {
  await step("inloggen", async () => {
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", "coordinator@diligence.local");
    await page.fill("#password", "demo1234");
    await page.getByRole("button", { name: "Inloggen" }).click();
    await page.waitForURL(`${base}/`);
    await page.getByRole("heading", { name: /Goedendag/ }).waitFor();
    await page.screenshot({ path: path.join(shots, "dashboard.png"), fullPage: true });
  });

  await step("deelnemer zoeken met typefout", async () => {
    await page.goto(`${base}/deelnemers`, { waitUntil: "networkidle" });
    await page.fill("#q", "JAn de vr");
    await page.getByRole("button", { name: "Zoeken" }).click();
    await page.waitForURL(/\/deelnemers\?q=/);
    await page.getByText("Jan de Vries").first().waitFor();
    await page.screenshot({ path: path.join(shots, "deelnemers.png"), fullPage: true });
  });

  await step("deelnemers importeren uit CSV", async () => {
    await page.goto(`${base}/deelnemers/import`, { waitUntil: "networkidle" });
    await page.setInputFiles("#participant-file", "public/templates/deelnemers-import.csv");
    await page.getByText("Dit worden 2 deelnemers").waitFor();
    await page.getByRole("button", { name: "Deelnemers opslaan" }).click();
    await page.waitForURL(/\/deelnemers\?ok=/);
    await page.getByText("2 deelnemers geïmporteerd").waitFor();
  });

  await step("opgave invoeren", async () => {
    await page.goto(`${base}/opgave?participantId=p-01`, { waitUntil: "networkidle" });
    await page.locator('input[name="outing_ids"][value="o-02"]').check();
    await page.fill("#override_reason", "Test: deelnemer belde later door ziekte.");
    await page.getByRole("button", { name: "Opgave opslaan" }).click();
    await page.waitForURL(/\/opgave\?participantId=p-01&ok=1/);
    await page.getByText("De opgave is opgeslagen").waitFor();
    await page.screenshot({ path: path.join(shots, "opgave.png"), fullPage: true });
  });

  await step("programma importeren uit CSV", async () => {
    await page.goto(`${base}/uitjes/import`, { waitUntil: "networkidle" });
    await page.setInputFiles("#program-file", "public/templates/programma-import.csv");
    await page.getByText("Dit worden 3 evenementen").waitFor();
    await page.getByRole("button", { name: "Definitief opslaan" }).click();
    await page.waitForURL(/\/uitjes\/import\?batch=.*ok=1/);
    await page.getByText("3 evenementen geïmporteerd").waitFor();
  });

  await step("indelingsvoorstel berekenen", async () => {
    await page.goto(`${base}/indeling`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Voorstel berekenen" }).click();
    await page.waitForURL(/\/indeling\?period=.*ok=1/);
    await page.getByText("Uitkomst").waitFor();
    await page.getByText("geplaatst").waitFor();
    await page.screenshot({ path: path.join(shots, "indeling.png"), fullPage: true });
  });

  await step("voertuigen automatisch koppelen", async () => {
    await page.goto(`${base}/uitjes/o-01`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Voertuigen voorstellen" }).click();
    await page.waitForURL(/\/uitjes\/o-01\?ok=1/);
    await page.getByText("Opgeslagen.").waitFor();
    await page.getByText("Busje 1").first().waitFor();
    await page.screenshot({ path: path.join(shots, "uitje.png"), fullPage: true });
  });

  await step("indeling bevestigen en bellijst openen", async () => {
    await page.goto(`${base}/indeling`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Indeling bevestigen" }).click();
    await page.waitForURL(/\/indeling\?period=.*confirmed=1/);
    await page
      .locator(".alert-success")
      .filter({ hasText: "De indeling is bevestigd" })
      .waitFor();
    await page.goto(`${base}/bellen`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Bellijst" }).waitFor();
    await page.screenshot({ path: path.join(shots, "bellen.png"), fullPage: false });
  });

  await step("beltaak afhandelen", async () => {
    const firstCall = page.getByRole("button", { name: "Gebeld" }).first();
    await firstCall.click();
    await page.waitForURL(/\/bellen/);
    await page.getByText("Beltaak bijgewerkt").waitFor();
  });

  await step("e-mailwachtrij verwerken", async () => {
    await page.goto(`${base}/berichten`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "E-mailwachtrij" }).waitFor();
    await page.getByText("In wachtrij").first().waitFor();
    await page.getByRole("button", { name: "Verzenden", exact: true }).first().click();
    await page.waitForURL(/\/berichten\?ok=1/);
    await page.getByText("De berichten zijn verwerkt").waitFor();
  });

  await step("daglijst openen", async () => {
    await page.goto(`${base}/uitjes/o-01/daglijst`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Marius van Dokkum Museum" }).first().waitFor();
    await page.getByRole("heading", { name: /Deelnemers/ }).waitFor();
    await page.getByRole("heading", { name: "Vervoer" }).waitFor();
    await page.screenshot({ path: "data/screenshots/daglijst.png", fullPage: true });
  });

  await step("aanwezigheid registreren", async () => {
    await page.goto(`${base}/uitjes/o-01/afronden`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Aanwezigheid registreren" }).waitFor();
    const first = page.locator('input[name="present"]').first();
    await first.uncheck();
    await page.getByRole("button", { name: "Aanwezigheid opslaan en evenement afronden" }).click();
    await page.waitForURL(/\/uitjes\/o-01\?ok=/);
    await page.getByText("Aanwezigheid opgeslagen").waitFor();
  });

  await step("mobiel dashboard", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(shots, "dashboard-mobiel.png"), fullPage: true });
  });

  if (errors.length) {
    console.log("\nBrowserfouten:");
    for (const error of errors) console.log(error);
    process.exitCode = 1;
  } else {
    console.log("\nGeen browserfouten.");
  }
} finally {
  await browser.close();
}
