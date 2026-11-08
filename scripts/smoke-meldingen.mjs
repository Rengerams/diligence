import { chromium } from "playwright-core";
import { launchBrowser } from "./browser.mjs";

const base = "http://127.0.0.1:3100";
const browser = await launchBrowser({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
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

  await page.goto(`${base}/uitjes/o-01`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Plek vrij melden" }).waitFor();
  await page.selectOption("#free-spot-participant", { index: 1 });
  await page.fill("#free-spot-message", "Testafmelding");
  await page.getByRole("button", { name: "Melding opslaan" }).click();
  await page.waitForURL(/\/meldingen\?ok=1/);
  await page.getByText("Testafmelding").waitFor();
  await page.getByRole("button", { name: "Afgehandeld" }).click();
  await page.waitForURL(/\/meldingen\?ok=1/);
  await page.getByText("Geen open meldingen").waitFor();
  console.log("Vrije plek melden en afhandelen: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
