import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { otpauthUrl } from "@/lib/totp";
import {
  disableTwoFactorAction,
  enableTwoFactorAction,
  startTwoFactorAction,
} from "./actions";
import { Alert, PageHeader } from "@/components/ui";

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{
    setup?: string;
    enabled?: string;
    disabled?: string;
    error?: string;
    verplicht?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { setup, enabled, disabled, error, verplicht } = await searchParams;
  const record = get<{
    two_factor_secret: string | null;
    two_factor_enabled: number;
    recovery_codes_display: string | null;
  }>(
    "SELECT two_factor_secret, two_factor_enabled, recovery_codes_display FROM users WHERE id = ?",
    user.id,
  );
  const recoveryCodes: string[] = record?.recovery_codes_display
    ? (JSON.parse(record.recovery_codes_display) as string[])
    : [];

  return (
    <>
      <PageHeader
        title="Beveiliging"
        intro="Beveilig je account met een tweede stap. Na je wachtwoord vraagt het systeem dan om een code uit je authenticator-app."
        nextStep={
          record?.two_factor_enabled
            ? "Tweestapsverificatie staat aan. Bewaar je herstelcodes op een veilige plek."
            : "Zet tweestapsverificatie aan voor extra bescherming."
        }
      />

      {verplicht ? (
        <Alert kind="warning">
          Voor een Admin-account is tweestapsverificatie verplicht. Stel het hieronder in om
          verder te kunnen werken.
        </Alert>
      ) : null}
      {enabled ? <Alert kind="success">Tweestapsverificatie staat nu aan.</Alert> : null}
      {disabled ? <Alert kind="success">Tweestapsverificatie staat uit.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Tweestapsverificatie</h2>
          <span className={`badge badge-${record?.two_factor_enabled ? "success" : "muted"}`}>
            {record?.two_factor_enabled ? "Aan" : "Uit"}
          </span>
        </div>

        {record?.two_factor_enabled ? (
          <>
            <p>
              Bij het inloggen vraagt het systeem na je wachtwoord om een code van zes cijfers.
              Gebruik hiervoor de app waarin je de sleutel hebt opgeslagen.
            </p>
            <form action={disableTwoFactorAction} className="actions">
              <div className="field" style={{ flex: "1 1 220px" }}>
                <label htmlFor="disable-code">Code om uit te zetten</label>
                <input id="disable-code" name="code" inputMode="numeric" required placeholder="123456" />
              </div>
              <button className="btn btn-danger" type="submit">
                Tweestapsverificatie uitzetten
              </button>
            </form>
          </>
        ) : (
          <>
            <p>
              Je hebt een authenticator-app nodig, bijvoorbeeld Google Authenticator, Microsoft
              Authenticator of 1Password.
            </p>

            {!record?.two_factor_secret ? (
              <form action={startTwoFactorAction}>
                <button className="btn btn-primary" type="submit">
                  Installatie starten
                </button>
              </form>
            ) : (
              <>
                <div className="alert alert-info">
                  <strong>Stap 1.</strong> Voeg deze sleutel toe aan je authenticator-app:
                  <div style={{ marginTop: 8 }}>
                    <code style={{ fontSize: "1rem", wordBreak: "break-all" }}>
                      {record.two_factor_secret}
                    </code>
                  </div>
                  <div className="small" style={{ marginTop: 8, wordBreak: "break-all" }}>
                    Of gebruik de link: {otpauthUrl(record.two_factor_secret, user.email)}
                  </div>
                </div>

                {recoveryCodes.length ? (
                  <div className="alert alert-warning">
                    <strong>Bewaar deze herstelcodes op een veilige plek.</strong> Elke code werkt
                    één keer. Ze zijn hierna niet meer zichtbaar.
                    <div className="grid two" style={{ marginTop: 10 }}>
                      {recoveryCodes.map((code) => (
                        <code key={code} style={{ fontSize: "1rem" }}>{code}</code>
                      ))}
                    </div>
                  </div>
                ) : null}

                <form action={enableTwoFactorAction}>
                  <div className="field">
                    <label htmlFor="enable-code">Stap 2: vul de code uit de app in</label>
                    <input id="enable-code" name="code" inputMode="numeric" required placeholder="123456" />
                  </div>
                  <div className="actions">
                    <button className="btn btn-primary" type="submit">
                      Tweestapsverificatie aanzetten
                    </button>
                  </div>
                </form>
              </>
            )}

            {setup ? (
              <p className="small muted" style={{ marginTop: 12 }}>
                De sleutel blijft staan tot je hem bevestigt. Annuleren? Vraag de beheerder om je
                account opnieuw in te richten.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="card">
        <h2>Herstelcodes</h2>
        <p className="muted">
          Bij het instellen krijgt elk account acht eenmalige herstelcodes. Bewaar ze buiten deze
          applicatie. Een gebruikte code werkt daarna niet meer.
        </p>
      </div>
    </>
  );
}
