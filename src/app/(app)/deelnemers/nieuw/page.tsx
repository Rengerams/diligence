import { requirePermission } from "@/lib/auth";
import { createParticipant } from "@/app/actions";
import { Alert, BackLink, PageHeader } from "@/components/ui";

export default async function NewParticipantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission("participants.manage");
  const { error } = await searchParams;

  return (
    <>
      <PageHeader
        title="Nieuwe deelnemer"
        intro="Leg de basisgegevens vast. Telefoon en e-mail zijn allebei handig, maar minimaal één van de twee is nodig om iemand te kunnen bereiken."
        nextStep="Vul de gegevens in en klik op 'Deelnemer opslaan'. Daarna kun je direct een opgave invoeren."
        actions={<BackLink href="/deelnemers">Terug naar deelnemers</BackLink>}
      />

      {error ? <Alert kind="error">{error}</Alert> : null}

      <form action={createParticipant} className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Naam en contact</h2>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="first_name">Voornaam</label>
            <input id="first_name" name="first_name" required autoComplete="given-name" />
          </div>
          <div className="field">
            <label htmlFor="last_name_prefix">Tussenvoegsel</label>
            <input id="last_name_prefix" name="last_name_prefix" placeholder="bijv. de" />
          </div>
          <div className="field">
            <label htmlFor="last_name">Achternaam</label>
            <input id="last_name" name="last_name" required autoComplete="family-name" />
          </div>
          <div className="field">
            <label htmlFor="phone">Telefoonnummer</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="06 12 34 56 78" />
          </div>
          <div className="field">
            <label htmlFor="phone_alt">Tweede telefoonnummer</label>
            <input id="phone_alt" name="phone_alt" type="tel" />
          </div>
          <div className="field">
            <label htmlFor="email">E-mailadres</label>
            <input id="email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="contact_preference">Waarmee bereiken we deze persoon?</label>
            <select id="contact_preference" name="contact_preference" defaultValue="phone">
              <option value="phone">Telefoon</option>
              <option value="email">E-mail</option>
              <option value="both">Allebei</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue="active">
              <option value="active">Actief</option>
              <option value="paused">Tijdelijk gepauzeerd</option>
            </select>
          </div>
        </div>

        <div className="section-title">
          <h2>Adres</h2>
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="street">Straat</label>
            <input id="street" name="street" autoComplete="address-line1" />
          </div>
          <div className="field">
            <label htmlFor="house_number">Huisnummer</label>
            <input id="house_number" name="house_number" autoComplete="address-line2" />
          </div>
          <div className="field">
            <label htmlFor="postal_code">Postcode</label>
            <input id="postal_code" name="postal_code" autoComplete="postal-code" placeholder="1332 AX" />
          </div>
          <div className="field">
            <label htmlFor="city">Plaats</label>
            <input id="city" name="city" defaultValue="Almere" autoComplete="address-level2" />
          </div>
        </div>

        <div className="section-title">
          <h2>Meedoen en bereikbaarheid</h2>
        </div>
        <div className="form-grid">
          <div className="field full">
            <span className="label">Mobiliteit</span>
            <label className="check">
              <input type="checkbox" name="mobility_walker" /> Gebruikt een rollator
            </label>
            <label className="check">
              <input type="checkbox" name="mobility_wheelchair" /> Gebruikt een rolstoel
            </label>
            <label className="check">
              <input type="checkbox" name="mobility_help_boarding" /> Heeft hulp nodig bij instappen
            </label>
          </div>
          <div className="field">
            <label htmlFor="cards">Kaarten</label>
            <input id="cards" name="cards" placeholder="bijv. Museumkaart, VriendenLoterij" />
            <span className="help">Vrije tekst; later worden dit losse kaarttypes.</span>
          </div>
          <div className="field">
            <label htmlFor="emergency_name">Noodcontact (naam)</label>
            <input id="emergency_name" name="emergency_name" />
          </div>
          <div className="field">
            <label htmlFor="emergency_phone">Noodcontact (telefoon)</label>
            <input id="emergency_phone" name="emergency_phone" type="tel" />
          </div>
          <div className="field full">
            <label htmlFor="notes">Notities</label>
            <textarea id="notes" name="notes" placeholder="Bijvoorbeeld: wil graag voorin zitten." />
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" type="submit">
            Deelnemer opslaan
          </button>
          <a className="btn btn-secondary" href="/deelnemers">
            Annuleren
          </a>
        </div>
      </form>
    </>
  );
}
