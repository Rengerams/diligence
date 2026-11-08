import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { getVehicles } from "@/lib/queries";
import { createVehicleAction, updateVehicleAction } from "@/app/actions";
import { Alert, Badge, PageHeader } from "@/components/ui";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requirePermission("vehicles.manage");
  const { ok, error } = await searchParams;
  const vehicles = getVehicles();
  const today = new Date().toISOString().slice(0, 10);
  const usage = new Map(
    all<{ vehicle_id: string; n: number }>(
      `SELECT ov.vehicle_id, COUNT(*) AS n
         FROM outing_vehicles ov
         JOIN outings o ON o.id = ov.outing_id
        WHERE o.date >= ?
        GROUP BY ov.vehicle_id`,
      today,
    ).map((row) => [row.vehicle_id, row.n]),
  );

  return (
    <>
      <PageHeader
        title="Voertuigen"
        intro="Voeg voertuigen toe of wijzig ze. Naam, kenteken en aantal plekken mogen altijd veranderen; oude daglijsten houden de gegevens van toen."
        nextStep="Controleer of de busjes en de touringcar met het juiste aantal plekken en kenteken staan. Daarna kun je ze aan een uitje koppelen."
      />

      {ok ? <Alert kind="success">Voertuig opgeslagen.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="card">
        <h2>Nieuw voertuig toevoegen</h2>
        <form action={createVehicleAction}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="new-name">Naam</label>
              <input id="new-name" name="name" required placeholder="Bijv. Busje 3" />
            </div>
            <div className="field">
              <label htmlFor="new-plate">Kenteken</label>
              <input id="new-plate" name="license_plate" placeholder="12-ABC-3" />
            </div>
            <div className="field">
              <label htmlFor="new-seats">Aantal plekken</label>
              <input id="new-seats" name="seats" type="number" min={1} max={100} required defaultValue={7} />
              <span className="help">Aantal gasten dat meekan, exclusief chauffeur.</span>
            </div>
            <div className="field">
              <label htmlFor="new-notes">Opmerkingen</label>
              <input id="new-notes" name="notes" placeholder="Bijv. mindervalidenlift" />
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Voertuig toevoegen</button>
          </div>
        </form>
      </div>

      <div className="section-title">
        <h2>Voertuigen</h2>
        <span className="small muted">{vehicles.length} voertuigen</span>
      </div>

      {vehicles.length === 0 ? (
        <div className="empty">
          <h3>Nog geen voertuigen</h3>
          <p>Voeg hierboven het eerste busje toe. Zonder voertuigen kun je geen vervoer koppelen.</p>
        </div>
      ) : (
        <div className="list">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="card">
              <div className="section-title" style={{ marginTop: 0 }}>
                <h3 style={{ margin: 0 }}>{vehicle.name}</h3>
                <Badge tone={vehicle.active ? "success" : "muted"}>
                  {vehicle.active ? "Actief" : "Niet actief"}
                </Badge>
              </div>
              <form action={updateVehicleAction}>
                <input type="hidden" name="id" value={vehicle.id} />
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor={`name-${vehicle.id}`}>Naam</label>
                    <input id={`name-${vehicle.id}`} name="name" defaultValue={vehicle.name} required />
                  </div>
                  <div className="field">
                    <label htmlFor={`plate-${vehicle.id}`}>Kenteken</label>
                    <input id={`plate-${vehicle.id}`} name="license_plate" defaultValue={vehicle.license_plate} />
                  </div>
                  <div className="field">
                    <label htmlFor={`seats-${vehicle.id}`}>Aantal plekken</label>
                    <input
                      id={`seats-${vehicle.id}`}
                      name="seats"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={vehicle.seats}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`notes-${vehicle.id}`}>Opmerkingen</label>
                    <input id={`notes-${vehicle.id}`} name="notes" defaultValue={vehicle.notes} />
                  </div>
                  <div className="field full">
                    <label className="check">
                      <input type="checkbox" name="active" defaultChecked={Boolean(vehicle.active)} /> Inzetbaar
                    </label>
                  </div>
                </div>
                <div className="actions">
                  <button className="btn btn-secondary" type="submit">Wijzigingen opslaan</button>
                  <span className="small muted">
                    {usage.get(vehicle.id) ?? 0} toekomstige uitjes gebruiken dit voertuig.
                  </span>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
