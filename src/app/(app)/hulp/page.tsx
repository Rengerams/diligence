import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";

export default async function HelpPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Hulp"
        intro="Korte uitleg voor de taken die elke dag terugkomen. Lukt iets niet? Gebruik de feedbackknop of bel de coördinator."
        nextStep="Kies hieronder de taak waarbij je hulp nodig hebt."
      />

      <div className="grid two">
        <section className="card">
          <h2>1. Een deelnemer zoeken</h2>
          <p>
            Ga naar <Link href="/deelnemers">Deelnemers</Link> en typ een deel van de naam of het
            telefoonnummer. Kleine typefouten mogen. Klik op de persoon voor alle gegevens.
          </p>
        </section>

        <section className="card">
          <h2>2. Een opgave invoeren</h2>
          <p>
            Ga naar <Link href="/opgave">Opgave</Link>, zoek de deelnemer en kies de uitjes. Staat
            de persoon in een groepje, laat dan “Met groepje” staan. Lees de bevestigingsregel voor
            en klik op opslaan.
          </p>
        </section>

        <section className="card">
          <h2>3. Het programma bekijken</h2>
          <p>
            Ga naar <Link href="/uitjes">Uitjes</Link>. Elk uitje toont datum, tijd, prijs en
            capaciteit. Klik op een uitje voor de deelnemers en het vervoer.
          </p>
        </section>

        <section className="card">
          <h2>4. De indeling beoordelen</h2>
          <p>
            Ga naar <Link href="/indeling">Indeling</Link>. Na de deadline kun je het voorstel
            berekenen. Lees de uitleg bij elke plaatsing. Je kunt iemand handmatig toevoegen en
            daarna de indeling bevestigen.
          </p>
        </section>

        <section className="card">
          <h2>5. De bellijst afwerken</h2>
          <p>
            Ga naar <Link href="/bellen">Bellijst</Link>. Bel de persoon, klik op “Gebeld” of “Kan
            niet” en ga door naar de volgende. Bij “Kan niet” komt de volgende reservist aan de
            beurt.
          </p>
        </section>

        <section className="card">
          <h2>6. Voertuigen en daglijst</h2>
          <p>
            Ga naar <Link href="/uitjes">Uitjes</Link> en open het uitje. Koppel daar een voertuig
            en een chauffeur. Print de pagina met Ctrl+P voor de chauffeur.
          </p>
        </section>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Iets onduidelijk of werkt het niet goed?</h2>
        <p>
          Bel de coördinator via 036-2022044 of mail naar info@diligence-almere.nl. Vertel bij
          welke stap het misgaat en wat je op het scherm ziet.
        </p>
        <p className="small muted">
          Deze demo-omgeving gebruikt verzonnen gegevens. Gebruik hier geen echte namen of
          telefoonnummers.
        </p>
      </div>
    </>
  );
}
