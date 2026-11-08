import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { getActivePeriod, getLatestConfirmedRun } from "@/lib/queries";
import { sendAllNotificationsAction, sendNotificationAction } from "@/app/actions";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requirePermission("messages.manage");
  const { ok } = await searchParams;
  const period = getActivePeriod();
  const run = period ? getLatestConfirmedRun(period.id) : undefined;
  const configured = isEmailConfigured();

  const messages = run
    ? all<{
        id: string;
        recipient: string;
        subject: string;
        body: string;
        status: string;
        created_at: string;
        first_name: string;
        last_name: string;
        description: string;
        outing_date: string;
      }>(
        `SELECT n.id, n.recipient, n.subject, n.body, n.status, n.created_at,
                p.first_name, p.last_name, o.description, o.date AS outing_date
           FROM notifications n
           JOIN participants p ON p.id = n.participant_id
           JOIN outings o ON o.id = n.outing_id
          WHERE n.run_id = ?
          ORDER BY o.date, o.start_time, p.last_name`,
        run.id,
      )
    : [];

  const counts = {
    queued: messages.filter((message) => message.status === "queued").length,
    sent: messages.filter((message) => message.status === "sent").length,
    demo: messages.filter((message) => message.status === "demo").length,
    failed: messages.filter((message) => message.status === "failed").length,
  };

  return (
    <>
      <PageHeader
        title="E-mailwachtrij"
        intro="Na het bevestigen van de indeling staan hier de e-mails voor deelnemers met een e-mailadres. De bellijst blijft voor wie gebeld wil worden."
        nextStep={
          !run
            ? "Bevestig eerst de indeling."
            : counts.queued
              ? `Er ${counts.queued === 1 ? "staat" : "staan"} ${counts.queued} bericht${counts.queued === 1 ? "" : "en"} klaar.`
              : "Alle berichten zijn verwerkt."
        }
        actions={
          <>
            {run ? <Link className="btn btn-secondary" href="/bellen">Naar de bellijst</Link> : null}
            {run && counts.queued + counts.failed > 0 ? (
              <form action={sendAllNotificationsAction}>
                <input type="hidden" name="run_id" value={run.id} />
                <button className="btn btn-primary" type="submit">
                  Alles verzenden
                </button>
              </form>
            ) : null}
          </>
        }
      />

      {ok ? <Alert kind="success">De berichten zijn verwerkt.</Alert> : null}

      {!configured ? (
        <Alert kind="warning">
          <strong>Demonstratiemodus.</strong> Er is geen e-mailprovider ingesteld. Berichten worden
          klaargezet en als “demo” gemarkeerd; er gaat niets echt de deur uit.
        </Alert>
      ) : (
        <Alert kind="info">Verzending via Brevo is ingesteld.</Alert>
      )}

      {!run ? (
        <EmptyState
          title="Nog geen e-mails"
          action={<Link className="btn btn-primary" href="/indeling">Naar de indeling</Link>}
        >
          De e-mailwachtrij ontstaat zodra de indeling is bevestigd.
        </EmptyState>
      ) : messages.length === 0 ? (
        <EmptyState title="Geen e-mailadressen">
          Voor deze indeling heeft niemand een e-mailadres. De bellijst is de enige route.
        </EmptyState>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <strong>{counts.queued}</strong>
              <span>in de wachtrij</span>
            </div>
            <div className="stat">
              <strong>{counts.sent}</strong>
              <span>verzonden</span>
            </div>
            <div className="stat">
              <strong>{counts.demo}</strong>
              <span>demo (niet verzonden)</span>
            </div>
            <div className="stat">
              <strong>{counts.failed}</strong>
              <span>mislukt</span>
            </div>
          </div>

          <div className="list">
            {messages.map((message) => (
              <div key={message.id} className="card">
                <div className="section-title" style={{ marginTop: 0 }}>
                  <div>
                    <strong>
                      {message.first_name} {message.last_name}
                    </strong>
                    <div className="small muted">
                      {message.recipient} · {message.description} · {message.outing_date}
                    </div>
                  </div>
                  <Badge
                    tone={
                      message.status === "sent"
                        ? "success"
                        : message.status === "failed"
                          ? "warning"
                          : message.status === "demo"
                            ? "muted"
                            : "accent"
                    }
                  >
                    {message.status === "queued"
                      ? "In wachtrij"
                      : message.status === "sent"
                        ? "Verzonden"
                        : message.status === "demo"
                          ? "Demo"
                          : "Mislukt"}
                  </Badge>
                </div>

                <p className="small">
                  <strong>Onderwerp:</strong> {message.subject}
                </p>

                <details className="small">
                  <summary>Bericht bekijken</summary>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{message.body}</pre>
                </details>

                {message.status !== "sent" ? (
                  <form action={sendNotificationAction} className="actions">
                    <input type="hidden" name="notification_id" value={message.id} />
                    <button className="btn btn-secondary" type="submit">
                      {message.status === "failed" ? "Opnieuw proberen" : "Verzenden"}
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>

          <p className="small muted" style={{ marginTop: 16 }}>
            Elke verzending komt in het <Link href="/wijzigingen">wijzigingsoverzicht</Link>. De
            e-mail bevat geen mobiliteit, notities of andere gevoelige gegevens.
          </p>
        </>
      )}
    </>
  );
}
