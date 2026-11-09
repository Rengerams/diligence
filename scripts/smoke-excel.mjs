import { launchBrowser } from "./browser.mjs";

const base = "http://127.0.0.1:3100";
const browser = await launchBrowser({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
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

  await page.goto(`${base}/uitjes/import/excel`, { waitUntil: "networkidle" });
  await page.setInputFiles("#excel-file", "public/templates/programma-import.xlsx");
  await page.getByRole("button", { name: "Bestand controleren" }).click();
  await page.waitForURL(/\/uitjes\/import\/excel\?preview=/);
  await page.getByText("3 evenementen gevonden").waitFor();
  await page.getByRole("button", { name: "3 evenementen opslaan" }).click();
  await page.waitForURL(/\/uitjes\/import\?batch=.*ok=1/);
  await page.getByText("3 evenementen geïmporteerd").waitFor();
  console.log("Excel-import: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
