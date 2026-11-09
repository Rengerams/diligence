import { chromium } from "playwright-core";
import { launchBrowser } from "./browser.mjs";

const base = "http://127.0.0.1:3100";
const suffix = String(Date.now()).slice(-5);
const categoryName = `Testcategorie ${suffix}`;
const locationName = `Testlocatie ${suffix}`;
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

  await page.goto(`${base}/locaties`, { waitUntil: "networkidle" });
  await page.fill("#category-name", categoryName);
  await page.getByRole("button", { name: "Toevoegen" }).click();
  await page.waitForURL(/\/locaties\?ok=1/);

  await page.goto(`${base}/locaties`, { waitUntil: "networkidle" });
  await page.fill("#location-name", locationName);
  await page.fill("#location-address", "Teststraat 1");
  await page.fill("#location-postal", "1234 AB");
  await page.fill("#location-city", "Almere");
  await page.selectOption("#location-category", { label: categoryName });
  await page.getByRole("button", { name: "Locatie opslaan" }).click();
  await page.waitForURL(/\/locaties\?ok=1/);
  await page.getByText(locationName).first().waitFor();
  console.log("Categorie en locatie aanmaken: ok");

  await page.goto(`${base}/uitjes/nieuw`, { waitUntil: "networkidle" });
  await page.fill("#date", "2026-12-20");
  await page.fill("#start_time", "10:00");
  await page.fill("#end_time", "14:00");
  await page.fill("#description", `Testuitje ${suffix}`);
  await page.selectOption("#location_id", { label: `${locationName} · Almere` });
  await page.selectOption("#category_id", { label: categoryName });
  await page.getByRole("button", { name: "Evenement opslaan" }).click();
  await page.waitForURL(/\/uitjes\/o-/);
  await page.getByText(locationName).first().waitFor();
  await page.getByText("Teststraat 1").first().waitFor();
  console.log("Evenement koppelen aan locatie: ok");

  await page.goto(`${base}/uitjes?category=`, { waitUntil: "networkidle" });
  await page.locator(".badge", { hasText: categoryName }).first().waitFor();
  console.log("Categorie zichtbaar in programma: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
