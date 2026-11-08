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

  await page.goto(`${base}/indeling`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Voorstel berekenen" }).click();
  await page.waitForURL(/\/indeling\?period=.*ok=1/);
  await page.getByText("Uitkomst").waitFor();
  console.log("- systeemvoorstel: ok");

  await page.goto(`${base}/indeling/proef`, { waitUntil: "networkidle" });
  await page.setInputFiles("#manual-file", "public/templates/indeling-proef.csv");
  await page.getByText("Dit worden 4 regels").waitFor();
  await page.getByRole("button", { name: "Proefindeling opslaan" }).click();
  await page.waitForURL(/\/indeling\/vergelijken\?period=.*ok=1/);
  await page.getByRole("heading", { name: "Verschillenoverzicht" }).waitFor();
  await page.getByText("Alleen handmatig").first().waitFor();
  await page.screenshot({ path: "data/screenshots/vergelijken.png", fullPage: true });
  console.log("- proefindeling en verschillen: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
