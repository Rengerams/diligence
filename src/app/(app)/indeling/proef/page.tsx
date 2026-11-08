import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { get } from "@/lib/db";
import { getActivePeriod, getLatestManualRun, getLatestRun } from "@/lib/queries";
import { ManualAllocationForm } from "@/components/manual-allocation-form";
import { Alert, BackLink, EmptyState, PageHeader } from "@/components/ui";

export default async function PilotPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("allocation.manage");
  const { error } = await searchParams;
  const period = getActivePeriod();

  if (!period) {
    return (
      <EmptyState title="Nog geen periode" action={<Link className="btn btn-primary" href="/uitjes">Naar uitjes</Link>}>
        Er is nog geen actieve periode.
      </EmptyState>
    );
  }

  const systemRun = getLatestRun(period.id);
  const manualRun = getLatestManualRun(period.id);
  const manualCount = manualRun
    ? get<{ n: number }>("SELECT COUNT(*) AS n FROM allocations WHERE run_id = ?", manualRun.id)?.n ?? 0
    : 0;

  return (
    <>
      <PageHeader
        title="Proefmodus"
        intro="Zet de indeling die in werkelijkheid met de hand is gemaakt naast het systeemvoorstel. Er wordt niets bevestigd en niets verstuurd."
        nextStep={
          !systemRun
            ? "Bereken eerst het systeemvoorstel."
            : "Voer de handmatige indeling in en bekijk daarna de verschillen."
        }
        actions={<BackLink href="/indeling">Terug naar de indeling</BackLink>}
      />

      {error ? <Alert kind="error">{error}</Alert> : null}

      {!systemRun ? (
        <Alert kind="warning">
          Er is nog geen systeemvoorstel. Ga naar <Link href="/indeling">Indeling</Link> en bereken
          eerst het voorstel.
        </Alert>
      ) : (
        <>
          {manualRun ? (
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>
                <h2>Laatste proefindeling</h2>
                <span className="badge badge-success">{manualCount} plaatsen</span>
              </div>
              <p className="muted">
                Ingevoerd op{" "}
                {new Intl.DateTimeFormat("nl-NL", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(manualRun.created_at))}
                . Een nieuwe import vervangt de vergelijking, niet de geschiedenis.
              </p>
              <div className="actions">
                <Link className="btn btn-primary" href={`/indeling/vergelijken?period=${period.id}`}>
                  Verschillen bekijken
                </Link>
              </div>
            </div>
          ) : null}

          <ManualAllocationForm periodId={period.id} />

          {manualRun ? (
            <div className="alert alert-info">
              Na het opslaan ga je automatisch naar het verschillenoverzicht. Je kunt daarna altijd
              een nieuwe proefindeling importeren.
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
