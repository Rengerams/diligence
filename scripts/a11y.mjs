import { launchBrowser } from "./browser.mjs";
import AxeBuilder from "@axe-core/playwright";

const base = "http://127.0.0.1:3100";
const browser = await launchBrowser({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();

await page.goto(`${base}/login`);
await page.fill("#email", "admin@diligence.local");
await page.fill("#password", "demo1234");
await page.getByRole("button", { name: "Inloggen" }).click();
await page.waitForURL(`${base}/`);

const pages = [
  ["dashboard", "/"],
  ["deelnemers", "/deelnemers"],
  ["deelnemer-detail", "/deelnemers/p-01"],
  ["groepjes", "/groepjes"],
  ["feedback", "/feedback"],
  ["deelnemers-import", "/deelnemers/import"],
  ["geschiedenis-import", "/deelnemers/geschiedenis"],
  ["opschonen", "/deelnemers/opschonen"],
  ["opgave", "/opgave"],
  ["indeling", "/indeling"],
  ["proefmodus", "/indeling/proef"],
  ["vergelijken", "/indeling/vergelijken"],
  ["locaties", "/locaties"],
  ["voertuigen", "/voertuigen"],
  ["daglijst", "/uitjes/o-01/daglijst"],
  ["afronden", "/uitjes/o-01/afronden"],
  ["programma-print", "/uitjes/print"],
  ["excel-import", "/uitjes/import/excel"],
  ["beveiliging", "/account/beveiliging"],
  ["gebruikers", "/gebruikers"],
  ["rollen", "/rollen"],
  ["meldingen", "/meldingen"],
  ["bellen", "/bellen"],
  ["berichten", "/berichten"],
  ["uitschrijven", "/uitschrijven"],
  ["hulp", "/hulp"],
];

let total = 0;
for (const [name, path] of pages) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page }).analyze();
  total += results.violations.length;
  console.log(`\n${name}: ${results.violations.length} overtredingen`);
  for (const violation of results.violations) {
    console.log(`- [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`);
  }
}

console.log(`\nTotaal: ${total}`);
await browser.close();
