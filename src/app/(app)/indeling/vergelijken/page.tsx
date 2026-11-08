import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import {
  getActivePeriod,
  getLatestManualRun,
  getLatestRun,
  getOutings,
  getPeriodById,
  type Outing,
  type Run,
} from "@/lib/queries";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui";

type AllocationRow = {
  outing_id: string;
  participant_id: string;
  status: "assigned" | "waitlist" | "tie";
  reason_text: string;
  first_name: string;
  last_name: string;
  group_name: string | null;
};

function allocationRows(run: Run | undefined): AllocationRow[] {
  if (!run) return [];
  return all<AllocationRow>(
    `SELECT a.outing_id, a.participant_id, a.status, a.reason_text,
            p.first_name, p.last_name, g.name AS group_name
       FROM allocations a
       JOIN participants p ON p.id = a.participant_id
       LEFT JOIN "groups" g ON g.id = a.group_id
      WHERE a.run_id = ?
      ORDER BY p.last_name, p.first_name`,
    run.id,
  );
}

function statusText(status: AllocationRow["status"] | undefined): string {
  if (status === "assigned") return "Ingedeeld";
  if (status === "waitlist") return "Reserve";
  if (status === "tie") return "Gelijke stand";
  return "Niet ingedeeld";
}

function difference(
  systemStatus: AllocationRow["status"] | undefined,
  manualStatus: AllocationRow["status"] | undefined,
): { label: string; tone: "success" | "warning" | "accent" | "muted" } {
  if (systemStatus === "assigned" && manualStatus === "assigned") {
    return { label: "Gelijk", tone: "success" };
  }
  if (systemStatus === "assigned" && manualStatus !== "assigned") {
    return { label: "Alleen systeem", tone: "warning" };
  }
  if (systemStatus !== "assigned" && manualStatus === "assigned") {
    return { label: "Alleen handmatig", tone: "accent" };
  }
  if (systemStatus === "waitlist" && manualStatus === "waitlist") {
    return { label: "Beide reserve", tone: "muted" };
  }
  if (systemStatus === "waitlist" || manualStatus === "waitlist") {
    return { label: "Reserveverschil", tone: "warning" };
  }
  return { label: "Beide niet", tone: "muted" };
}

export default async function ComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; ok?: string }>;
}) {
  await requirePermission("allocation.manage");
  const { period: periodId, ok } = await searchParams;
  const period = periodId ? getPeriodById(periodId) : getActivePeriod();

  if (!period) {
    return (
      <EmptyState title="Nog geen periode" action={<Link className="btn btn-primary" href="/uitjes">Naar uitjes</Link>}>
        Er is nog geen actieve periode.
      </EmptyState>
    );
  }

  const system = getLatestRun(period.id);
  const manual = getLatestManualRun(period.id);
  const outings = getOutings(period.id);
  const systemRows = allocationRows(system);
  const manualRows = allocationRows(manual);

  const participants = new Map(
    all<{
      id: string;
      first_name: string;
      last_name_prefix: string;
      last_name: string;
    }>("SELECT id, first_name, last_name_prefix, last_name FROM participants").map((row) => [
      row.id,
      row,
    ]),
  );

  const signups = all<{
    participant_id: string;
    target_type: string;
    outing_id: string | null;
    series_key: string;
  }>(
    "SELECT participant_id, target_type, outing_id, series_key FROM signups WHERE period_id = ? AND status = 'active'",
    period.id,
  );

  const systemByOuting = new Map<string, Map<string, AllocationRow>>();
  for (const row of systemRows) {
    const map = systemByOuting.get(row.outing_id) ?? new Map();
    map.set(row.participant_id, row);
    systemByOuting.set(row.outing_id, map);
  }
  const manualByOuting = new Map<string, Map<string, AllocationRow>>();
  for (const row of manualRows) {
    const map = manualByOuting.get(row.outing_id) ?? new Map();
    map.set(row.participant_id, row);
    manualByOuting.set(row.outing_id, map);
  }

  const counts = {
    bothAssigned: 0,
    onlySystem: 0,
    onlyManual: 0,
    reserveDifferences: 0,
  };

  const perOuting = outings.map((outing: Outing) => {
    const systemMap = systemByOuting.get(outing.id) ?? new Map<string, AllocationRow>();
    const manualMap = manualByOuting.get(outing.id) ?? new Map<string, AllocationRow>();
    const ids = new Set<string>([...systemMap.keys(), ...manualMap.keys()]);
    for (const signup of signups) {
      if (
        signup.outing_id === outing.id ||
        signup.target_type === "period" ||
        (signup.target_type === "series" && signup.series_key === outing.series_key)
      ) {
        ids.add(signup.participant_id);
      }
    }

    const rows = [...ids].map((participantId) => {
      const systemRow = systemMap.get(participantId);
      const manualRow = manualMap.get(participantId);
      const diff = difference(systemRow?.status, manualRow?.status);
      if (diff.label === "Gelijk") counts.bothAssigned += 1;
      else if (diff.label === "Alleen systeem") counts.onlySystem += 1;
      else if (diff.label === "Alleen handmatig") counts.onlyManual += 1;
      else if (diff.label === "Reserveverschil") counts.reserveDifferences += 1;

      return {
        participantId,
        systemRow,
        manualRow,
        diff,
        name: participants.get(participantId),
      };
    });

    rows.sort((a, b) => {
      const lastNameA = a.name?.last_name ?? "";
      const lastNameB = b.name?.last_name ?? "";
      return lastNameA.localeCompare(lastNameB) || a.participantId.localeCompare(b.participantId);
    });

    return { outing, rows };
  });

  const personCounts = new Map<string, { system: number; manual: number }>();
  for (const row of systemRows) {
    if (row.status !== "assigned") continue;
    const value = personCounts.get(row.participant_id) ?? { system: 0, manual: 0 };
    value.system += 1;
    personCounts.set(row.participant_id, value);
  }
  for (const row of manualRows) {
    if (row.status !== "assigned") continue;
    const value = personCounts.get(row.participant_id) ?? { system: 0, manual: 0 };
    value.manual += 1;
    personCounts.set(row.participant_id, value);
  }

  return (
    <>
      <PageHeader
        title="Verschillenoverzicht"
        intro={`Systeemvoorstel en handmatige indeling naast elkaar voor ${period.name}.`}
        nextStep="Bekijk waar het systeem anders kiest. Het systeem verandert niets; de coördinator beoordeelt."
        actions={
          <>
            <Link className="btn btn-secondary" href={`/indeling/proef?period=${period.id}`}>
              Nieuwe proefindeling
            </Link>
            <Link className="btn btn-secondary" href="/indeling">
              Naar de indeling
            </Link>
          </>
        }
      />

      {ok ? <Alert kind="success">De proefindeling is opgeslagen. Er is niets bevestigd of verstuurd.</Alert> : null}

      {!system ? (
        <Alert kind="warning">
          Er is nog geen systeemvoorstel. Bereken dat eerst op de{" "}
          <Link href="/indeling">indelingspagina</Link>.
        </Alert>
      ) : !manual ? (
        <EmptyState
          title="Nog geen handmatige indeling"
          action={
            <Link className="btn btn-primary" href={`/indeling/proef?period=${period.id}`}>
              Proefindeling invoeren
            </Link>
          }
        >
          Importeer de indeling die in werkelijkheid met de hand is gemaakt. Daarna zie je hier de
          verschillen.
        </EmptyState>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <strong>{counts.bothAssigned}</strong>
              <span>op beide lijsten ingedeeld</span>
            </div>
            <div className="stat">
              <strong>{counts.onlySystem}</strong>
              <span>alleen in het systeemvoorstel</span>
            </div>
            <div className="stat">
              <strong>{counts.onlyManual}</strong>
              <span>alleen handmatig ingedeeld</span>
            </div>
            <div className="stat">
              <strong>{counts.reserveDifferences}</strong>
              <span>verschil op de reservelijst</span>
            </div>
          </div>

          <div className="list">
            {perOuting.map(({ outing, rows }) => {
              const differences = rows.filter((row) => row.diff.label !== "Gelijk" && row.diff.label !== "Beide niet");
              return (
                <div key={outing.id} className="card">
                  <div className="section-title" style={{ marginTop: 0 }}>
                    <div>
                      <h2 style={{ margin: 0 }}>
                        <Link href={`/uitjes/${outing.id}`}>{outing.description}</Link>
                      </h2>
                      <span className="small muted">
                        {formatDate(outing.date)} · {formatMoney(outing.price_cents)} ·{" "}
                        {rows.length} opgaven
                      </span>
                    </div>
                    <Badge tone={differences.length ? "warning" : "success"}>
                      {differences.length} verschil{differences.length === 1 ? "" : "len"}
                    </Badge>
                  </div>

                  {rows.length === 0 ? (
                    <p className="muted">Geen opgaven voor dit uitje.</p>
                  ) : (
                    <div className="assigned-list">
                      {rows.map(({ participantId, systemRow, manualRow, diff, name }) => (
                        <div key={participantId} className="person-line">
                          <span className="who">
                            {name ? `${name.first_name} ${name.last_name}` : participantId}
                            <span className="small muted">
                              {" "}· systeem: {statusText(systemRow?.status)} · handmatig:{" "}
                              {statusText(manualRow?.status)}
                            </span>
                          </span>
                          <span className="why">
                            <Badge tone={diff.tone}>{diff.label}</Badge>
                            {systemRow?.reason_text ? (
                              <span className="small muted"> {systemRow.reason_text}</span>
                            ) : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="section-title">
            <h2>Aantal uitjes per persoon</h2>
            <span className="small muted">Controle op eerlijkheid</span>
          </div>
          <div className="card">
            <div className="list">
              {[...personCounts.entries()]
                .sort((a, b) => {
                  const nameA = participants.get(a[0]);
                  const nameB = participants.get(b[0]);
                  return (nameA?.last_name ?? "").localeCompare(nameB?.last_name ?? "");
                })
                .map(([participantId, count]) => {
                  const participant = participants.get(participantId);
                  const differs = count.system !== count.manual;
                  return (
                    <div key={participantId} className="person-line">
                      <span className="who">
                        {participant
                          ? `${participant.first_name} ${participant.last_name_prefix} ${participant.last_name}`
                          : participantId}
                      </span>
                      <span className="why">
                        systeem {count.system} · handmatig {count.manual}{" "}
                        {differs ? <Badge tone="warning">verschil</Badge> : null}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          <p className="small muted" style={{ marginTop: 16 }}>
            De handmatige indeling is alleen bedoeld om te vergelijken. Bevestigen en e-mailen
            gebeuren op de <Link href="/indeling">indelingspagina</Link>.
          </p>
        </>
      )}
    </>
  );
}
