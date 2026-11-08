import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

function candidates() {
  const platform = os.platform();
  const fromEnv = [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  ].filter(Boolean);

  if (platform === "win32") {
    const programFiles = [
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
      process.env.LOCALAPPDATA,
    ].filter(Boolean);
    return [
      ...fromEnv,
      ...programFiles.flatMap((base) => [
        path.join(base, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
      ]),
    ];
  }

  if (platform === "darwin") {
    return [
      ...fromEnv,
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }

  return [
    ...fromEnv,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];
}

export async function launchBrowser(options = {}) {
  const executablePath = candidates().find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });

  if (executablePath) {
    return chromium.launch({ ...options, executablePath });
  }

  try {
    return await chromium.launch(options);
  } catch (error) {
    throw new Error(
      [
        "Geen Chrome/Chromium-browser gevonden voor de browsercontrole.",
        "Zet CHROME_PATH naar een bestaande browser of installeer een Playwright-browser.",
        `Oorspronkelijke fout: ${error instanceof Error ? error.message : String(error)}`,
      ].join("\n"),
    );
  }
}
