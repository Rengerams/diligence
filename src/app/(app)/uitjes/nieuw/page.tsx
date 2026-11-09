import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { getActivePeriod } from "@/lib/queries";
import { createOutingAction } from "@/app/actions";
import { Alert, BackLink, EmptyState, PageHeader } from "@/components/ui";

export default async function NewOutingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("program.manage");
  const { error } = await searchParams;
  const period = getActivePeriod();
  const locations = all<{ id: string; name: string; city: string; category_id: string | null }>(
    "SELECT id, name, city, category_id FROM locations WHERE archived_at IS NULL ORDER BY name",
  );
  const categories = all<{ id: string; name: string }>(
    "SELECT id, name FROM categories WHERE archived_at IS NULL ORDER BY name",
  );

  if (!period) {
    return (
      <EmptyState title="Nog geen periode" action={<BackLink href="/uitjes">Terug</BackLink>}>
        Er is nog geen actieve periode. Maak eerst een periode aan.
      </EmptyState>
    );
  }

  return (
    <>
      <PageHeader
        title="Nieuw evenement"
        intro={`Dit evenement komt in de periode ${period.name}.`}
        nextStep="Vul de datum, tijden, omschrijving en capaciteit in. Daarna kun je het evenement openen en het vervoer koppelen."
        actions={<BackLink href="/uitjes">Terug naar evenementen</BackLink>}
      />

      {error ? <Alert kind="error">{error}</Alert> : null}

      <form action={createOutingAction} className="card">
        <input type="hidden" name="period_id" value={period.id} />
        <div className="form-grid">
          <div className="field">
            <label htmlFor="date">Datum</label>
            <input id="date" name="date" type="date" required />
          </div>
          <div className="field">
            <label htmlFor="capacity">Capaciteit</label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              max={100}
              defaultValue={period.default_capacity}
              required
            />
            <span className="help">Aantal gasten dat mee kan.</span>
          </div>
          <div className="field">
            <label htmlFor="start_time">Begintijd</label>
            <input id="start_time" name="start_time" type="time" required />
          </div>
          <div className="field">
            <label htmlFor="end_time">Eindtijd</label>
            <input id="end_time" name="end_time" type="time" required />
          </div>
          <div className="field full">
            <label htmlFor="description">Omschrijving</label>
            <input id="description" name="description" required placeholder="Bijvoorbeeld: Museum Beeld & Geluid" />
          </div>
          <div className="field">
            <label htmlFor="location_id">Locatie</label>
            <select id="location_id" name="location_id" defaultValue="">
              <option value="">Nog niet bekend</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}{location.city ? ` · ${location.city}` : ""}
                </option>
              ))}
            </select>
            <span className="help">
              <Link href="/locaties">Locaties beheren</Link>
            </span>
          </div>
          <div className="field">
            <label htmlFor="category_id">Categorie</label>
            <select id="category_id" name="category_id" defaultValue="">
              <option value="">Geen categorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="price">Prijs per persoon</label>
            <input id="price" name="price" placeholder="bijv. 12,50" inputMode="decimal" />
            <span className="help">Laat leeg of vul 0 in als het gratis is.</span>
          </div>
          <div className="field">
            <label htmlFor="extra_costs">Extra kosten</label>
            <input id="extra_costs" name="extra_costs" placeholder="bijv. lunch / consumptie" />
          </div>
          <div className="field">
            <label htmlFor="labels">Labels</label>
            <input id="labels" name="labels" placeholder="bijv. Nieuw, Uitgelicht" />
          </div>
          <div className="field">
            <label htmlFor="series_name">Reeks (optioneel)</label>
            <input id="series_name" name="series_name" placeholder="bijv. Pannenkoekhuis" />
            <span className="help">Gebruik dezelfde naam voor hetzelfde evenement op meerdere data.</span>
          </div>
          <div className="field full">
            <label className="check">
              <input type="checkbox" name="less_suitable" />
              Minder geschikt voor rollators
            </label>
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" type="submit">Evenement opslaan</button>
          <a className="btn btn-secondary" href="/uitjes">Annuleren</a>
        </div>
      </form>
    </>
  );
}
