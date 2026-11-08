import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { createCategoryAction, createLocationAction, updateLocationAction } from "./actions";
import { Alert, BackLink, PageHeader } from "@/components/ui";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requirePermission("program.manage");
  const { ok, error } = await searchParams;
  const categories = all<{ id: string; name: string }>(
    "SELECT id, name FROM categories WHERE archived_at IS NULL ORDER BY name",
  );
  const locations = all<{
    id: string;
    name: string;
    address: string;
    postal_code: string;
    city: string;
    category_id: string | null;
    category_name: string | null;
  }>(
    `SELECT l.id, l.name, l.address, l.postal_code, l.city, l.category_id, c.name AS category_name
       FROM locations l
       LEFT JOIN categories c ON c.id = l.category_id
      WHERE l.archived_at IS NULL
      ORDER BY l.name`,
  );

  return (
    <>
      <PageHeader
        title="Locaties en categorieën"
        intro="Leg vaste locaties met adres vast en deel ze in bij een categorie, zoals museum of uit eten. Bij een uitje kies je daarna de locatie."
        nextStep="Maak eerst de categorieën die je gebruikt. Voeg daarna de locaties toe."
        actions={<BackLink href="/uitjes">Terug naar uitjes</BackLink>}
      />

      {ok ? <Alert kind="success">Opgeslagen.</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      <div className="grid two">
        <div className="card">
          <h2>Categorieën</h2>
          {categories.length === 0 ? (
            <p className="muted">Nog geen categorieën.</p>
          ) : (
            <div className="meta">
              {categories.map((category) => (
                <span key={category.id} className="badge badge-muted">{category.name}</span>
              ))}
            </div>
          )}
          <form action={createCategoryAction} className="actions" style={{ marginTop: 14 }}>
            <div className="field" style={{ flex: "1 1 200px" }}>
              <label htmlFor="category-name">Nieuwe categorie</label>
              <input id="category-name" name="name" required placeholder="Bijv. Museum" />
            </div>
            <button className="btn btn-secondary" type="submit">Toevoegen</button>
          </form>
        </div>

        <div className="card">
          <h2>Locaties</h2>
          {locations.length === 0 ? (
            <p className="muted">Nog geen locaties.</p>
          ) : (
            <div className="list">
              {locations.map((location) => (
                <div key={location.id}>
                  <div className="person-line">
                    <span className="who">
                      <strong>{location.name}</strong>
                      <span className="small muted">
                        {[location.address, location.postal_code, location.city].filter(Boolean).join(", ") || "Geen adres"}
                      </span>
                    </span>
                    <span className="why small muted">{location.category_name ?? "Geen categorie"}</span>
                  </div>
                  <details style={{ margin: "6px 0 14px" }}>
                    <summary className="small">Locatie en adres wijzigen</summary>
                    <form action={updateLocationAction} className="form-grid" style={{ marginTop: 8 }}>
                      <input type="hidden" name="id" value={location.id} />
                      <div className="field">
                        <label htmlFor={`name-${location.id}`}>Naam</label>
                        <input id={`name-${location.id}`} name="name" defaultValue={location.name} required />
                      </div>
                      <div className="field">
                        <label htmlFor={`category-${location.id}`}>Categorie</label>
                        <select id={`category-${location.id}`} name="category_id" defaultValue={location.category_id ?? ""}>
                          <option value="">Geen categorie</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`address-${location.id}`}>Adres</label>
                        <input id={`address-${location.id}`} name="address" defaultValue={location.address} />
                      </div>
                      <div className="field">
                        <label htmlFor={`postal-${location.id}`}>Postcode</label>
                        <input id={`postal-${location.id}`} name="postal_code" defaultValue={location.postal_code} />
                      </div>
                      <div className="field">
                        <label htmlFor={`city-${location.id}`}>Plaats</label>
                        <input id={`city-${location.id}`} name="city" defaultValue={location.city} />
                      </div>
                      <div className="field" style={{ alignSelf: "end" }}>
                        <button className="btn btn-secondary" type="submit">Opslaan</button>
                      </div>
                    </form>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Nieuwe locatie</h2>
        <form action={createLocationAction}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="location-name">Naam</label>
              <input id="location-name" name="name" required placeholder="Bijv. Museum Flehite" />
            </div>
            <div className="field">
              <label htmlFor="location-category">Categorie</label>
              <select id="location-category" name="category_id" defaultValue="">
                <option value="">Geen categorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="location-address">Adres</label>
              <input id="location-address" name="address" placeholder="Straat en huisnummer" />
            </div>
            <div className="field">
              <label htmlFor="location-postal">Postcode</label>
              <input id="location-postal" name="postal_code" placeholder="1234 AB" />
            </div>
            <div className="field">
              <label htmlFor="location-city">Plaats</label>
              <input id="location-city" name="city" placeholder="Almere" />
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Locatie opslaan</button>
          </div>
        </form>
      </div>
    </>
  );
}
