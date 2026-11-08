import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { verifyTwoFactorAction } from "./actions";

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mfaVerified) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="login-page">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-trim.png" alt="Logo Stichting Diligence Almere" />
        <h1>Tweede stap</h1>
        <p className="tagline">Voer de code uit je authenticator-app in.</p>

        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}

        <form action={verifyTwoFactorAction}>
          <div className="field">
            <label htmlFor="code">Code of herstelcode</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              placeholder="123456"
            />
            <span className="help">De code bestaat uit 6 cijfers en vernieuwt elke 30 seconden.</span>
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 20 }}>
            Doorgaan
          </button>
        </form>

        <p className="footer-note">
          Lukt het niet? Neem contact op met de beheerder of gebruik een herstelcode.
        </p>
      </div>
    </main>
  );
}
