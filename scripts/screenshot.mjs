import { launchBrowser } from "./browser.mjs";
import path from "node:path";

const base = "http://127.0.0.1:3100";
const browser = await launchBrowser({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
await page.goto(`${base}/login`);
await page.fill("#email", "coordinator@diligence.local");
await page.fill("#password", "demo1234");
await page.getByRole("button", { name: "Inloggen" }).click();
await page.waitForURL(`${base}/`);
await page.screenshot({
  path: path.join(process.cwd(), "data", "screenshots", "dashboard-schoon.png"),
  fullPage: true,
});
await page.goto(`${base}/indeling`);
await page.screenshot({
  path: path.join(process.cwd(), "data", "screenshots", "indeling-schoon.png"),
  fullPage: true,
});
await browser.close();
