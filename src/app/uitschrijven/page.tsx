import { get } from "@/lib/db";
import { unsubscribeAction } from "./actions";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>;
}) {
  const { token, done, error } = await searchParams;
  const notification = token
    ? get<{ participant_id: string; first_name: string; last_name: string }>(
        `SELECT n.participant_id, p.first_name, p.last_name
           FROM notifications n
           JOIN participants p ON p.id = n.participant_id
          WHERE n.unsubscribe_token = ?`,
        token,
      )
    : undefined;

  return (
    <main className="login-page">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-trim.png" alt="Logo Stichting Diligence Almere" />
        <h1>E-mail afmelden</h1>

        {done ? (
          <div className="alert alert-success">
            U ontvangt geen e-mails meer van Stichting Diligence Almere. We bellen u voortaan als
            dat nodig is.
          </div>
        ) : error || !notification ? (
          <div className="alert alert-error">
            Deze afmeldlink is niet geldig. Neem contact op via 036-2022044 of
            info@diligence-almere.nl.
          </div>
        ) : (
          <>
            <p className="tagline">
              {notification.first_name} {notification.last_name}
            </p>
            <p>
              Wilt u geen e-mails meer ontvangen over de uitjes? Dan bellen we u voortaan als dat
              nodig is. U kunt zich later altijd weer aanmelden via de coördinator.
            </p>
            <form action={unsubscribeAction}>
              <input type="hidden" name="token" value={token} />
              <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
                Ja, meld mij af voor e-mail
              </button>
            </form>
            <p className="footer-note">
              Liever niet? Sluit deze pagina. Er verandert dan niets.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
