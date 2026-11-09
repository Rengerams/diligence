import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { get } from "@/lib/db";
import { getActivePeriod } from "@/lib/queries";
import { ProgramImportForm } from "@/components/program-import-form";
import { undoImportAction } from "@/app/actions";
import { Alert, BackLink, EmptyState, PageHeader } from "@/components/ui";

export default async function ImportProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; batch?: string; ok?: string; undone?: string }>;
}) {
  await requirePermission("program.manage");
  const { error, batch: batchId, ok, undone } = await searchParams;
  const period = getActivePeriod();
  const batch = batchId
    ? get<{ id: string; status: string; outing_ids: string }>(
        "SELECT id, status, outing_ids FROM import_batches WHERE id = ?",
        batchId,
      )
    : undefined;

  if (!period) {
    return (
      <EmptyState title="Nog geen periode" action={<BackLink href="/uitjes">Terug</BackLink>}>
        Maak eerst een periode aan voordat je een programma importeert.
      </EmptyState>
    );
  }

  return (
    <>
      <PageHeader
        title="Programma importeren"
        intro={`Laad het programma voor ${period.name} uit een CSV-bestand. Je ziet eerst een controle; pas daarna wordt er iets opgeslagen.`}
        nextStep="Kies het bestand, controleer het aantal evenementen en de fouten, en sla daarna pas op."
        actions={<BackLink href="/uitjes">Terug naar evenementen</BackLink>}
      />

      {error ? <Alert kind="error">{error}</Alert> : null}
      {undone ? <Alert kind="success">De import is ongedaan gemaakt.</Alert> : null}
      {ok && batch ? (
        <Alert kind="success">
          <strong>
            {JSON.parse(batch.outing_ids).length} evenementen geïmporteerd.
          </strong>{" "}
          Je kunt deze import nog in één keer ongedaan maken zolang er geen opgaven of indeling
          aan hangen.
          <form action={undoImportAction} style={{ marginTop: 10 }}>
            <input type="hidden" name="batch_id" value={batch.id} />
            <button className="btn btn-secondary" type="submit">
              Import ongedaan maken
            </button>
          </form>
        </Alert>
      ) : null}

      <div className="alert alert-info">
        Deze pagina ondersteunt CSV. Gebruik de{" "}
        <Link href="/uitjes/import/excel">Excel-import</Link> voor een .xlsx-bestand met
        maandkoppen en dagregels.
      </div>

      <ProgramImportForm periodId={period.id} defaultCapacity={period.default_capacity} />

      <p className="small muted" style={{ marginTop: 20 }}>
        Liever handmatig? <Link href="/uitjes/nieuw">Voeg één evenement toe</Link>.
      </p>
    </>
  );
}
