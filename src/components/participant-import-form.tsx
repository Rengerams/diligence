"use client";

import { useMemo, useState } from "react";
import { parseParticipantCsv, type ParsedParticipants } from "@/lib/participant-import";
import { importParticipantsAction } from "@/app/actions";

export function ParticipantImportForm() {
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<ParsedParticipants | null>(null);

  const canSubmit = useMemo(
    () => Boolean(parsed && parsed.rows.length > 0 && parsed.errors.length === 0),
    [parsed],
  );

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    setParsed(parseParticipantCsv(text));
  }

  return (
    <div>
      <div className="card">
        <h2>Stap 1: kies het bestand</h2>
        <p className="muted">
          Gebruik een CSV-bestand met de kolommen Voornaam, Tussenvoegsel, Achternaam, Telefoon,
          E-mail, adres, kaarten, mobiliteit en notitie.
        </p>
        <div className="actions">
          <label className="btn btn-secondary" htmlFor="participant-file">
            Bestand kiezen
          </label>
          <input
            id="participant-file"
            type="file"
            accept=".csv,text/csv"
            style={{ position: "absolute", left: -9999 }}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <a className="btn btn-secondary" href="/templates/deelnemers-import.csv" download>
            Voorbeeldbestand downloaden
          </a>
        </div>
        {fileName ? <p className="small muted">Gekozen bestand: {fileName}</p> : null}
      </div>

      {parsed ? (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Stap 2: controleer</h2>
            <span className="badge badge-muted">
              {parsed.rows.length} deelnemers · {parsed.errors.length} fouten · {parsed.warnings.length} waarschuwingen
            </span>
          </div>

          {parsed.errors.length ? (
            <div className="alert alert-error">
              <strong>Er zijn fouten. Er wordt niets opgeslagen.</strong>
              <ul>
                {parsed.errors.map((error) => (
                  <li key={`${error.row}-${error.message}`}>Rij {error.row}: {error.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="alert alert-success">
              Dit worden {parsed.rows.length} deelnemers. Controleer de lijst en sla daarna op.
            </div>
          )}

          {parsed.warnings.length ? (
            <div className="alert alert-warning">
              <strong>Let op:</strong>
              <ul>
                {parsed.warnings.map((warning) => (
                  <li key={`${warning.row}-${warning.message}`}>Rij {warning.row}: {warning.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="list">
            {parsed.rows.map((row, index) => (
              <div key={`${row.last_name}-${index}`} className="row-card" style={{ gridTemplateColumns: "1fr auto" }}>
                <div>
                  <strong>
                    {row.first_name} {row.last_name_prefix} {row.last_name}
                  </strong>
                  <div className="small muted">
                    {row.phone || "geen telefoon"} · {row.email || "geen e-mail"} · {row.city}
                  </div>
                  <div className="meta">
                    {row.cards ? <span className="badge badge-accent">{row.cards}</span> : null}
                    {row.mobility_walker ? <span className="badge badge-warning">Rollator</span> : null}
                    {row.mobility_wheelchair ? <span className="badge badge-warning">Rolstoel</span> : null}
                  </div>
                </div>
                <span className="small muted">Rij {index + 2}</span>
              </div>
            ))}
          </div>

          <form action={importParticipantsAction} className="actions" style={{ marginTop: 20 }}>
            <input type="hidden" name="csv" value={csv} />
            <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
              Deelnemers opslaan
            </button>
            <span className="small muted">
              De bezoekgeschiedenis wordt in deze werkversie nog niet mee geïmporteerd.
            </span>
          </form>
        </div>
      ) : null}
    </div>
  );
}
