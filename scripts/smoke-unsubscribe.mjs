import { launchBrowser } from "./browser.mjs";

const base = "http://127.0.0.1:3100";
const token = process.env.UNSUBSCRIBE_TOKEN;
if (!token) throw new Error("UNSUBSCRIBE_TOKEN ontbreekt");

const browser = await launchBrowser({ headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
try {
  await page.goto(`${base}/uitschrijven?token=${token}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "E-mail afmelden" }).waitFor();
  await page.getByRole("button", { name: "Ja, meld mij af voor e-mail" }).click();
  await page.waitForURL(/\/uitschrijven\?done=1/);
  await page.getByText("U ontvangt geen e-mails meer").waitFor();
  console.log("Afmelden: ok");
} finally {
  await browser.close();
}
