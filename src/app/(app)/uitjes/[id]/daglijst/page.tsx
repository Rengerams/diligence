import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can, canAny } from "@/lib/permissions";
import { all, get } from "@/lib/db";
import { formatDateLong, formatMoney, formatPhone } from "@/lib/format";
import { getLatestConfirmedRun, getLatestRun, getPeriodById, type Outing } from "@/lib/queries";
import { PrintButton } from "@/components/print-button";
import { Alert, Badge, BackLink } from "@/components/ui";

export default async function DayListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!canAny(user, ["program.view", "own.outings"])) {
    redirect("/?melding=Geen+toegang+tot+dit+onderdeel");
  }
  const { id } = await params;
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", id);
  if (!outing) notFound();
  const period = getPeriodById(outing.period_id);
  if (!period) notFound();

  if (!can(user, "program.view")) {
    const assigned = get<{ id: string }>(
      "SELECT id FROM outing_vehicles WHERE outing_id = ? AND driver_id = ? LIMIT 1",
      outing.id,
      user.id,
    );
    if (!assigned) notFound();
  }

  const confirmed = getLatestConfirmedRun(period.id);
  const proposal = getLatestRun(period.id);
  const run = confirmed ?? proposal;
  const isConfirmed = Boolean(confirmed);

  const rows = run
    ? all<{
        participant_id: string;
        status: "assigned" | "waitlist" | "tie";
        rank: number;
        first_name: string;
        last_name: string;
        phone: string;
        cards: string;
        mobility_walker: number;
        mobility_wheelchair: number;
        mobility_help_boarding: number;
        group_name: string | null;
      }>(
        `SELECT a.participant_id, a.status, a.rank,
                p.first_name, p.last_name, p.phone, p.cards,
                p.mobility_walker, p.mobility_wheelchair, p.mobility_help_boarding,
                g.name AS group_name
           FROM allocations a
           JOIN participants p ON p.id = a.participant_id
           LEFT JOIN "groups" g ON g.id = a.group_id
          WHERE a.run_id = ? AND a.outing_id = ?
          ORDER BY CASE a.status WHEN 'assigned' THEN 0 WHEN 'tie' THEN 1 ELSE 2 END,
                   a.rank, p.last_name, p.first_name`,
        run.id,
        outing.id,
      )
    : [];

  const vehicles = all<{
    name: string;
    seats_snapshot: number;
    plate_snapshot: string;
    driver_name: string | null;
  }>(
    `SELECT v.name, ov.seats_snapshot, ov.plate_snapshot, u.name AS driver_name
       FROM outing_vehicles ov
       JOIN vehicles v ON v.id = ov.vehicle_id
       LEFT JOIN users u ON u.id = ov.driver_id
      WHERE ov.outing_id = ?
      ORDER BY v.name`,
    outing.id,
  );

  const assigned = rows.filter((row) => row.status === "assigned");
  const waitlist = rows.filter((row) => row.status === "waitlist");

  return (
    <>
      <div className="no-print">
        <div className="actions" style={{ marginBottom: 16 }}>
          <BackLink href={`/uitjes/${outing.id}`}>Terug naar het uitje</BackLink>
          <PrintButton label="Daglijst afdrukken" />
        </div>
        {!isConfirmed ? (
          <Alert kind="warning">
            Deze daglijst is nog een voorstel. Bevestig eerst de indeling voordat je gaat rijden.
          </Alert>
        ) : null}
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-trim.png" alt="Logo Stichting Diligence Almere" style={{ height: 64, width: "auto" }} />
          <div>
            <div className="small muted">Stichting Diligence Almere · Daglijst</div>
            <h1 style={{ margin: "2px 0", fontSize: "1.6rem" }}>{outing.description}</h1>
            <div>
              {formatDateLong(outing.date)} · {outing.start_time}–{outing.end_time} ·{" "}
              {formatMoney(outing.price_cents)}
            </div>
          </div>
        </div>

        <div className="grid two">
          <div>
            <h2 style={{ fontSize: "1.1rem" }}>Deelnemers ({assigned.length}/{outing.capacity})</h2>
            {assigned.length === 0 ? (
              <p className="muted">Nog niemand ingedeeld.</p>
            ) : (
              <div className="list">
                {assigned.map((row) => (
                  <div key={row.participant_id} className="person-line">
                    <span className="who">
                      {row.first_name} {row.last_name}
                      {row.group_name ? <span className="small muted"> · {row.group_name}</span> : null}
                      <span className="small muted">
                        {" "}· {formatPhone(row.phone)}
                        {row.cards ? ` · ${row.cards}` : ""}
                        {row.mobility_walker ? " · rollator" : ""}
                        {row.mobility_wheelchair ? " · rolstoel" : ""}
                        {row.mobility_help_boarding ? " · hulp instappen" : ""}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: "1.1rem" }}>Vervoer</h2>
            {vehicles.length === 0 ? (
              <p className="muted">Nog geen voertuig gekoppeld.</p>
            ) : (
              <div className="list">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.name} className="person-line">
                    <span className="who">{vehicle.name}</span>
                    <span className="why">
                      {vehicle.seats_snapshot} plekken · {vehicle.plate_snapshot || "geen kenteken"}
                      <br />
                      Chauffeur: {vehicle.driver_name ?? "nog niet bekend"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {waitlist.length ? (
              <>
                <h2 style={{ fontSize: "1.1rem", marginTop: 18 }}>Reservelijst</h2>
                <div className="list">
                  {waitlist.map((row) => (
                    <div key={row.participant_id} className="person-line">
                      <span className="who">
                        {row.rank}. {row.first_name} {row.last_name}
                      </span>
                      <span className="why">{formatPhone(row.phone)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="divider" />
        <p className="small muted">
          Deze lijst is bedoeld voor de chauffeur en de medewerker die die dag belt. Neem hem mee
          op papier of op de telefoon. Bij annulering: bel de deelnemers en gebruik de bellijst.
        </p>
      </div>

      <div className="no-print" style={{ marginTop: 16 }}>
        <Link className="btn btn-secondary" href={`/uitjes/${outing.id}`}>Terug naar het uitje</Link>
        <PrintButton label="Daglijst afdrukken" />
      </div>
    </>
  );
}
