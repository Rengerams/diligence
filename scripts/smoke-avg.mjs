import { launchBrowser } from "./browser.mjs";
import { DatabaseSync } from "node:sqlite";

const base = "http://127.0.0.1:3100";
const browser = await launchBrowser({ headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
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

  await page.goto(`${base}/deelnemers/p-14`, { waitUntil: "networkidle" });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Gegevens exporteren" }).first().click();
  const download = await downloadPromise;
  if (!download.suggestedFilename().startsWith("deelnemer-p-14")) {
    throw new Error(`Onverwachte bestandsnaam: ${download.suggestedFilename()}`);
  }
  console.log("AVG-export: ok");

  await page.getByText("Deelnemer anonimiseren").click();
  await page.getByRole("button", { name: "Definitief anonimiseren" }).click();
  await page.waitForURL(/\/deelnemers\?ok=Deelnemer\+geanonimiseerd/);
  await page.getByText("Deelnemer geanonimiseerd").waitFor();

  const db = new DatabaseSync("C:/diligence/data/diligence.db");
  const row = db.prepare("SELECT first_name, last_name, phone, anonymized_at FROM participants WHERE id = 'p-14'").get();
  if (row.first_name !== "Deelnemer" || row.last_name !== "Geanonimiseerd" || row.phone !== "" || !row.anonymized_at) {
    throw new Error(`Anonimisering onvolledig: ${JSON.stringify(row)}`);
  }
  console.log("Anonimiseren: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
