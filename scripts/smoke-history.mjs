import { launchBrowser } from "./browser.mjs";

const base = "http://127.0.0.1:3100";
const browser = await launchBrowser({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
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

  await page.goto(`${base}/deelnemers/geschiedenis`, { waitUntil: "networkidle" });
  await page.setInputFiles("#history-file", "public/templates/geschiedenis-import.csv");
  await page.getByText("Dit worden 3 bezoeken").waitFor();
  await page.getByRole("button", { name: "Bezoeken opslaan" }).click();
  await page.waitForURL(/\/deelnemers\?ok=/);
  await page.getByText("3 bezoeken geïmporteerd").waitFor();
  console.log("- geschiedenis importeren: ok");

  await page.goto(`${base}/deelnemers/opschonen`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Opschonen" }).waitFor();
  await page.getByText("Maria").first().waitFor();
  console.log("- opschoonlijst: ok");
  await page.screenshot({ path: "data/screenshots/opschonen.png", fullPage: true });

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
