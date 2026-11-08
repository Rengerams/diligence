import { launchBrowser } from "./browser.mjs";

const base = "http://127.0.0.1:3100";
const browser = await launchBrowser({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
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

  await page.goto(`${base}/feedback?from=%2Fdeelnemers`, { waitUntil: "networkidle" });
  await page.fill("#message", "De knop voor opslaan was even zoeken.");
  await page.getByRole("button", { name: "Feedback versturen" }).click();
  await page.waitForURL(/\/feedback\?ok=1/);
  await page.getByText("Bedankt, je feedback is opgeslagen").waitFor();
  await page.getByText("De knop voor opslaan was even zoeken").waitFor();
  await page.getByRole("button", { name: "Afgehandeld" }).first().click();
  await page.waitForURL(/\/feedback\?ok=1/);
  await page.getByText("Afgehandeld").first().waitFor();
  console.log("Feedback sturen en afhandelen: ok");

  if (errors.length) {
    console.log("Browserfouten:", errors);
    process.exitCode = 1;
  } else {
    console.log("Geen browserfouten.");
  }
} finally {
  await browser.close();
}
