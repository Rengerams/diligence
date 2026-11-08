import { requirePermission } from "@/lib/auth";
import { HistoryImportForm } from "@/components/history-import-form";
import { Alert, BackLink, PageHeader } from "@/components/ui";

export default async function ImportHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("participants.manage");
  const { error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Bezoekgeschiedenis importeren"
        intro="Neem eerdere bezoeken over, zodat de indeling weet wie nieuw is en wie vaak meegaat."
        nextStep="Kies het bestand, controleer de regels en sla daarna op."
        actions={<BackLink href="/deelnemers">Terug naar deelnemers</BackLink>}
      />

      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="alert alert-info">
        De geschiedenis telt mee voor de laatste 12 maanden. Oudere bezoeken blijven zichtbaar,
        maar tellen niet mee voor “vaak geweest”.
      </div>

      <HistoryImportForm today={today} />
    </>
  );
}
