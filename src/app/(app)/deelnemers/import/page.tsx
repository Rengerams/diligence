import { requirePermission } from "@/lib/auth";
import { ParticipantImportForm } from "@/components/participant-import-form";
import { Alert, BackLink, PageHeader } from "@/components/ui";

export default async function ImportParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("participants.manage");
  const { error } = await searchParams;

  return (
    <>
      <PageHeader
        title="Deelnemers importeren"
        intro="Laad een bestaande deelnemerslijst uit CSV. Je ziet eerst een controle; pas daarna wordt er iets opgeslagen."
        nextStep="Kies het bestand, controleer de namen en telefoonnummers, en sla daarna op."
        actions={<BackLink href="/deelnemers">Terug naar deelnemers</BackLink>}
      />

      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="alert alert-info">
        Gebruik de kolomnamen uit het voorbeeldbestand. Bezoekgeschiedenis importeer je apart op{" "}
        <a href="/deelnemers/geschiedenis">Bezoekgeschiedenis</a>. Werk met echte deelnemers alleen
        op de productieserver, niet in de demo.
      </div>

      <ParticipantImportForm />

      <p className="small muted" style={{ marginTop: 20 }}>
        Liever één persoon? <a href="/deelnemers/nieuw">Voeg een deelnemer toe</a>.
      </p>
    </>
  );
}
