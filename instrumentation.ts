export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const warnings: string[] = [];
  if (process.env.NODE_ENV === "production") {
    if (process.env.COOKIE_SECURE !== "true") {
      warnings.push("COOKIE_SECURE staat niet op 'true'; gebruik HTTPS in productie.");
    }
    if (!process.env.APP_URL) {
      warnings.push("APP_URL ontbreekt; afmeldlinks kunnen naar de verkeerde host wijzen.");
    }
    if (process.env.ENFORCE_2FA !== "true") {
      warnings.push("ENFORCE_2FA staat niet op 'true'; 2FA is niet verplicht voor Admin.");
    }
  }

  try {
    const { getDb } = await import("./src/lib/db");
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );
    db.prepare("PRAGMA wal_checkpoint(TRUNCATE);").get();
  } catch (error) {
    // Een lege productiedatabase zonder goede inrichtingsgegevens mag nooit
    // stilzwijgend doorgaan: dan zou er een account met een bekend wachtwoord
    // kunnen ontstaan. Stop het opstarten en laat de melding zien.
    if (error instanceof Error && error.name === "SeedConfigurationError") {
      throw error;
    }
    warnings.push(
      `Databasecontrole bij start mislukt: ${error instanceof Error ? error.message : "onbekende fout"}`,
    );
  }

  if (warnings.length) {
    for (const warning of warnings) {
      console.warn(`[productie] ${warning}`);
    }
  } else {
    console.info("[productie] omgevingscontrole en databasecheck geslaagd.");
  }
}
