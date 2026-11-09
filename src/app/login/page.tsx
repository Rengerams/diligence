import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.mfaVerified ? "/" : "/login/2fa");

  const { error } = await searchParams;
  // Op een echte installatie (SEED_DEMO_DATA=false) staan er geen demo-accounts
  // in de database, dus laten we ze ook niet op het inlogscherm zien.
  const showDemo = process.env.SEED_DEMO_DATA !== "false";

  return (
    <main className="login-page">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-trim.png" alt="Logo Stichting Diligence Almere" />
        <h1>Diligence Beheer</h1>
        <p className="tagline">De leukste evenementen voor Almeerse 55-plussers</p>

        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}

        <form action="/api/login" method="post">
          <div className="field">
            <label htmlFor="email">E-mailadres</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="password">Wachtwoord</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 20 }}>
            Inloggen
          </button>
        </form>

        {showDemo ? (
          <>
            <p className="footer-note">
              Deze omgeving gebruikt verzonnen demonstratiegegevens. Vul hier nooit echte
              persoonsgegevens in.
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
