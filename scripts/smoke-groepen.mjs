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

  await page.goto(`${base}/groepjes`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Groepjes" }).waitFor();
  await page.fill("#new-group", "Testgroep");
  await page.getByRole("button", { name: "Groepje aanmaken" }).click();
  await page.waitForURL(/\/groepjes\?ok=1/);
  await page.getByRole("heading", { name: "Testgroep" }).waitFor();

  const card = page.locator(".card").filter({ hasText: "Testgroep" }).first();
  await card.locator('select[name="participant_id"]').selectOption({ index: 1 });
  await card.getByRole("button", { name: "Toevoegen" }).click();
  await page.waitForURL(/\/groepjes\?ok=1/);
  await page.getByRole("heading", { name: "Testgroep" }).waitFor();
  await page.getByText("1 lid").waitFor();
  console.log("Groepje aanmaken en lid toevoegen: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
