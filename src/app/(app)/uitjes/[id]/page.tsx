import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can, canAny } from "@/lib/permissions";
import { all, get } from "@/lib/db";
import { formatDateLong, formatMoney, formatPhone, statusLabel } from "@/lib/format";
import { getPeriodById, getLatestRun, type Outing } from "@/lib/queries";
import {
  addVehicleToOutingAction,
  assignDriverAction,
  assignManuallyAction,
  assignVehiclesAutoAction,
  removeVehicleFromOutingAction,
  updateCapacityAction,
  updateOutingPlaceAction,
} from "@/app/actions";
import { createFreeSpotAlertAction } from "@/app/(app)/meldingen/actions";
import { Alert, Badge, BackLink, EmptyState, PageHeader } from "@/components/ui";

export default async function OutingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  if (!canAny(user, ["program.view", "own.outings"])) {
    redirect("/?melding=Geen+toegang+tot+dit+onderdeel");
  }
  const { id } = await params;
  const { ok, error } = await searchParams;
  const outing = get<Outing>("SELECT * FROM outings WHERE id = ?", id);
  if (!outing) notFound();
  const period = getPeriodById(outing.period_id);
  if (!period) notFound();
  const isStaff = can(user, "program.view");

  const place = get<{
    location_name: string | null;
    address: string;
    postal_code: string;
    city: string;
    category_name: string | null;
  }>(
    `SELECT l.name AS location_name, l.address, l.postal_code, l.city, c.name AS category_name
       FROM outings o
       LEFT JOIN locations l ON l.id = o.location_id
       LEFT JOIN categories c ON c.id = o.category_id
      WHERE o.id = ?`,
    outing.id,
  );
  const locations = isStaff
    ? all<{ id: string; name: string }>(
        "SELECT id, name FROM locations WHERE archived_at IS NULL ORDER BY name",
      )
    : [];
  const categories = isStaff
    ? all<{ id: string; name: string }>(
        "SELECT id, name FROM categories WHERE archived_at IS NULL ORDER BY name",
      )
    : [];

  if (!isStaff) {
    const assigned = get<{ id: string }>(
      "SELECT id FROM outing_vehicles WHERE outing_id = ? AND driver_id = ? LIMIT 1",
      outing.id,
      user.id,
    );
    if (!assigned) {
      return (
        <>
          <PageHeader
            title={outing.description}
            intro={`${formatDateLong(outing.date)} · ${outing.start_time}–${outing.end_time}`}
            nextStep="Deze evenement is niet aan jou toegewezen."
            actions={<BackLink href="/uitjes">Terug naar mijn evenementen</BackLink>}
          />
          <EmptyState title="Niet aan jou toegewezen">
            De coördinator heeft dit evenement niet aan jou gekoppeld. Je ziet alleen de evenementen
            waarvoor je als chauffeur bent ingedeeld.
          </EmptyState>
        </>
      );
    }
  }

  const signups = all<{
    id: string;
    target_type: string;
    note: string;
    created_at: string;
    first_name: string;
    last_name: string;
    group_name: string | null;
  }>(
    `SELECT s.id, s.target_type, s.note, s.created_at,
            p.first_name, p.last_name, g.name AS group_name
       FROM signups s
       JOIN participants p ON p.id = s.participant_id
       LEFT JOIN "groups" g ON g.id = s.group_id
      WHERE s.period_id = ? AND s.status = 'active'
        AND (s.outing_id = ? OR s.target_type = 'period'
             OR (s.target_type = 'series' AND s.series_key = ?))
      ORDER BY p.last_name, p.first_name`,
    period.id,
    outing.id,
    outing.series_key,
  );

  const vehicles = all<{
    id: string;
    vehicle_id: string;
    name: string;
    seats_snapshot: number;
    plate_snapshot: string;
    driver_id: string | null;
    driver_name: string | null;
  }>(
    `SELECT ov.id, ov.vehicle_id, v.name, ov.seats_snapshot, ov.plate_snapshot,
            ov.driver_id, u.name AS driver_name
       FROM outing_vehicles ov
       JOIN vehicles v ON v.id = ov.vehicle_id
       LEFT JOIN users u ON u.id = ov.driver_id
      WHERE ov.outing_id = ?
      ORDER BY v.name`,
    outing.id,
  );
  const drivers = all<{ id: string; name: string }>(
    "SELECT id, name FROM users WHERE role = 'driver' AND active = 1 ORDER BY name",
  );
  const availableVehicles = all<{ id: string; name: string; seats: number; license_plate: string }>(
    `SELECT id, name, seats, license_plate FROM vehicles
      WHERE active = 1 AND archived_at IS NULL
        AND id NOT IN (SELECT vehicle_id FROM outing_vehicles WHERE outing_id = ?)
      ORDER BY name`,
    outing.id,
  );

  const run = getLatestRun(period.id);
  const allocations = run
    ? all<{
        id: string;
        participant_id: string;
        status: "assigned" | "waitlist" | "tie";
        reason_text: string;
        rank: number;
        first_name: string;
        last_name: string;
        phone: string;
        cards: string;
        mobility_walker: number;
        mobility_wheelchair: number;
        group_name: string | null;
      }>(
        `SELECT a.id, a.participant_id, a.status, a.reason_text, a.rank,
                p.first_name, p.last_name, p.phone, p.cards,
                p.mobility_walker, p.mobility_wheelchair, g.name AS group_name
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

  const assigned = allocations.filter((row) => row.status === "assigned");
  const waitlist = allocations.filter((row) => row.status === "waitlist");
  const ties = allocations.filter((row) => row.status === "tie");
  const totalSeats = vehicles.reduce((sum, vehicle) => sum + vehicle.seats_snapshot, 0);

  return (
    <>
      <PageHeader
        title={outing.description}
        intro={`${formatDateLong(outing.date)} · ${outing.start_time}–${outing.end_time} · ${formatMoney(outing.price_cents)}`}
        nextStep={
          isStaff
            ? "Controleer de deelnemers en het vervoer. Print daarna de daglijst voor de chauffeur."
            : "Bekijk wie er mee gaan en met welk busje je rijdt."
        }
        actions={<BackLink href="/uitjes">Terug naar evenementen</BackLink>}
      />

      {ok ? <Alert kind="success">{ok === "1" ? "Opgeslagen." : ok}</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Locatie</h2>
          <span className="small muted">{place?.category_name ?? "Geen categorie"}</span>
        </div>
        <p>
          {place?.location_name ?? "Nog geen locatie gekoppeld"}
          {place?.address || place?.city ? (
            <span className="muted">
              {" "}· {[place.address, place.postal_code, place.city].filter(Boolean).join(", ")}
            </span>
          ) : null}
        </p>
        {isStaff ? (
          <form action={updateOutingPlaceAction} className="actions">
            <input type="hidden" name="outing_id" value={outing.id} />
            <div className="field">
              <label htmlFor="outing-location">Locatie</label>
              <select id="outing-location" name="location_id" defaultValue={outing.location_id ?? ""}>
                <option value="">Geen locatie</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="outing-category">Categorie</label>
              <select id="outing-category" name="category_id" defaultValue={outing.category_id ?? ""}>
                <option value="">Geen categorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-secondary" type="submit">Locatie opslaan</button>
          </form>
        ) : null}
      </div>

      {isStaff && run?.phase === "confirmed" ? (
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Plek vrij melden</h2>
            <span className="small muted">De coördinator handelt dit zelf af</span>
          </div>
          <p className="muted">
            Meld hier een afmelding of een vrijgekomen plek. De app plaatst niet automatisch iemand
            anders; de coördinator bekijkt de reservelijst en belt zelf.
          </p>
          <form action={createFreeSpotAlertAction}>
            <input type="hidden" name="outing_id" value={outing.id} />
            <div className="form-grid">
              <div className="field">
                <label htmlFor="free-spot-participant">Wie meldt zich af?</label>
                <select id="free-spot-participant" name="participant_id" defaultValue="">
                  <option value="">Onbekend / geen deelnemer</option>
                  {assigned.map((row) => (
                    <option key={row.participant_id} value={row.participant_id}>
                      {row.first_name} {row.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field full">
                <label htmlFor="free-spot-message">Toelichting</label>
                <input id="free-spot-message" name="message" placeholder="Bijv. ziek of verhinderd" />
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-secondary" type="submit">Melding opslaan</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="two-col">
        <div>
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Deelnemers</h2>
              <Badge tone={run?.phase === "confirmed" ? "success" : "warning"}>
                {run ? (run.phase === "confirmed" ? "Definitief" : "Voorstel") : "Nog geen indeling"}
              </Badge>
            </div>

            {!run ? (
              <p className="muted">
                Er is nog geen indelingsvoorstel. Ga naar <Link href="/indeling">Indeling</Link> om
                het te berekenen.
              </p>
            ) : (
              <>
                <p className="muted">
                  {assigned.length} van {outing.capacity} plekken bezet
                  {waitlist.length ? ` · ${waitlist.length} op de reservelijst` : ""}
                  {ties.length ? ` · ${ties.length} wacht op besluit` : ""}
                </p>
                <div className="assigned-list">
                  {assigned.map((row) => (
                    <div key={row.id} className="person-line">
                      <span className="who">
                        {row.first_name} {row.last_name}
                        {row.group_name ? <span className="small muted"> · {row.group_name}</span> : null}
                        <span className="small muted">
                          {" "}· {formatPhone(row.phone)}
                          {row.cards ? ` · ${row.cards}` : ""}
                          {row.mobility_walker ? " · rollator" : ""}
                          {row.mobility_wheelchair ? " · rolstoel" : ""}
                        </span>
                      </span>
                      <span className="why">{row.reason_text}</span>
                    </div>
                  ))}
                  {assigned.length === 0 ? <p className="muted">Nog niemand ingedeeld.</p> : null}
                </div>

                {ties.length ? (
                  <>
                    <div className="divider" />
                    <h3>Gelijke stand: de coördinator beslist</h3>
                    <div className="assigned-list">
                      {ties.map((row) => (
                        <div key={row.id} className="person-line">
                          <span className="who">{row.first_name} {row.last_name}</span>
                          <span className="why">{row.reason_text}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                {waitlist.length ? (
                  <>
                    <div className="divider" />
                    <h3>Reservelijst</h3>
                    <div className="assigned-list">
                      {waitlist.map((row) => (
                        <div key={row.id} className="person-line">
                          <span className="who">
                            {row.rank}. {row.first_name} {row.last_name}
                            {row.group_name ? <span className="small muted"> · {row.group_name}</span> : null}
                          </span>
                          {isStaff && run.phase === "proposal" ? (
                            <form action={assignManuallyAction}>
                              <input type="hidden" name="run_id" value={run.id} />
                              <input type="hidden" name="outing_id" value={outing.id} />
                              <input type="hidden" name="participant_id" value={row.participant_id} />
                              <button className="btn btn-secondary" type="submit">
                                Toch plaatsen
                              </button>
                            </form>
                          ) : (
                            <span className="why">{row.reason_text}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>

          {isStaff ? (
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>
                <h2>Opgaven</h2>
                <span className="small muted">{signups.length} personen</span>
              </div>
              {signups.length === 0 ? (
                <p className="muted">Nog geen opgaven voor dit evenement.</p>
              ) : (
                <div className="list">
                  {signups.map((signup) => (
                    <div key={signup.id} className="person-line">
                      <span className="who">
                        {signup.first_name} {signup.last_name}
                        {signup.group_name ? (
                          <span className="small muted"> · {signup.group_name}</span>
                        ) : null}
                      </span>
                      <span className="why">
                        {signup.target_type === "period"
                          ? "Alle evenementen"
                          : signup.target_type === "series"
                            ? "Reeks"
                            : "Dit evenement"}
                        {signup.note ? ` · ${signup.note}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <aside>
          <div className="card">
            <h2>Evenement</h2>
            <dl className="definition">
              <dt>Datum</dt>
              <dd>{formatDateLong(outing.date)}</dd>
              <dt>Tijd</dt>
              <dd>{outing.start_time}–{outing.end_time}</dd>
              <dt>Prijs</dt>
              <dd>{formatMoney(outing.price_cents)}</dd>
              <dt>Extra kosten</dt>
              <dd>{outing.extra_costs || "—"}</dd>
              <dt>Capaciteit</dt>
              <dd>{outing.capacity} personen</dd>
              <dt>Geschikt</dt>
              <dd>{outing.less_suitable_walkers ? "Minder geschikt voor rollators" : "Ook met rollator"}</dd>
              <dt>Status</dt>
              <dd>{statusLabel(outing.status)}</dd>
            </dl>
            {isStaff ? (
              <form action={updateCapacityAction} className="actions">
                <input type="hidden" name="outing_id" value={outing.id} />
                <div className="field" style={{ flex: "1 1 120px" }}>
                  <label htmlFor="capacity">Capaciteit aanpassen</label>
                  <input id="capacity" name="capacity" type="number" min={1} max={100} defaultValue={outing.capacity} />
                </div>
                <button className="btn btn-secondary" type="submit">Opslaan</button>
              </form>
            ) : null}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>
              <h2>Vervoer</h2>
              <Badge tone={vehicles.length && totalSeats >= outing.capacity ? "success" : "warning"}>
                {vehicles.length ? `${totalSeats} plekken` : "Geen voertuig"}
              </Badge>
            </div>

            {vehicles.length === 0 ? (
              <p className="muted">Er is nog geen voertuig gekoppeld.</p>
            ) : (
              <div className="list">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="card" style={{ padding: 14, boxShadow: "none" }}>
                    <strong>{vehicle.name}</strong>
                    <div className="small muted">
                      {vehicle.seats_snapshot} plekken · {vehicle.plate_snapshot || "geen kenteken"}
                    </div>
                    {isStaff ? (
                      <form action={assignDriverAction} className="actions" style={{ marginTop: 8 }}>
                        <input type="hidden" name="outing_vehicle_id" value={vehicle.id} />
                        <select name="driver_id" defaultValue={vehicle.driver_id ?? ""} aria-label={`Chauffeur voor ${vehicle.name}`}>
                          <option value="">Geen chauffeur</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>{driver.name}</option>
                          ))}
                        </select>
                        <button className="btn btn-secondary" type="submit">Koppel</button>
                      </form>
                    ) : (
                      <div className="small">
                        Chauffeur: {vehicle.driver_name ?? "nog niet bekend"}
                      </div>
                    )}
                    {isStaff ? (
                      <form action={removeVehicleFromOutingAction} style={{ marginTop: 6 }}>
                        <input type="hidden" name="outing_vehicle_id" value={vehicle.id} />
                        <button className="btn-link" type="submit">Voertuig verwijderen</button>
                      </form>
                    ) : null}
                    {vehicle.driver_id ? null : <div className="small" style={{ color: "var(--warning)" }}>Let op: nog geen chauffeur.</div>}
                  </div>
                ))}
              </div>
            )}

            {vehicles.length > 0 && totalSeats < outing.capacity ? (
              <p className="small" style={{ color: "var(--warning)" }}>
                Het aantal voertuigplekken is lager dan de capaciteit van het evenement.
              </p>
            ) : null}

            {isStaff ? (
              <>
                <div className="divider" />
                <form action={assignVehiclesAutoAction} className="actions">
                  <input type="hidden" name="outing_id" value={outing.id} />
                  <button className="btn btn-primary" type="submit">
                    Voertuigen voorstellen
                  </button>
                </form>
                {availableVehicles.length ? (
                  <form action={addVehicleToOutingAction} className="actions">
                    <input type="hidden" name="outing_id" value={outing.id} />
                    <select name="vehicle_id" aria-label="Voertuig toevoegen" style={{ flex: "1 1 180px" }}>
                      {availableVehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} ({vehicle.seats} plekken)
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-secondary" type="submit">Toevoegen</button>
                  </form>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="card">
            <h2>Daglijst</h2>
            <p className="muted small">
              Een aparte, printbare daglijst met deelnemers, telefoon, groepje, kaarten,
              mobiliteit, voertuigen en chauffeur.
            </p>
            <div className="actions">
              <Link className="btn btn-primary" href={`/uitjes/${outing.id}/daglijst`}>
                Daglijst openen
              </Link>
              {isStaff && run?.phase === "confirmed" ? (
                <Link className="btn btn-secondary" href={`/uitjes/${outing.id}/afronden`}>
                  Aanwezigheid registreren
                </Link>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
