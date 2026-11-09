"use client";

import { useMemo, useState } from "react";
import { parseProgramCsv, type ParsedProgram } from "@/lib/program-import";
import { importProgramAction } from "@/app/actions";

function money(cents: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function ProgramImportForm({
  periodId,
  defaultCapacity,
}: {
  periodId: string;
  defaultCapacity: number;
}) {
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<ParsedProgram | null>(null);
  const [reading, setReading] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(parsed && parsed.rows.length > 0 && parsed.errors.length === 0),
    [parsed],
  );

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    setParsed(parseProgramCsv(text, defaultCapacity));
    setReading(false);
  }

  return (
    <div>
      <div className="card">
        <h2>Stap 1: kies het bestand</h2>
        <p className="muted">
          Gebruik een CSV-bestand met de kolommen Datum, Tijd, Omschrijving, Prijs, Capaciteit,
          Labels, Extra kosten en Reeks. Een voorbeeld staat in de download.
        </p>
        <div className="actions">
          <label className="btn btn-secondary" htmlFor="program-file">
            Bestand kiezen
          </label>
          <input
            id="program-file"
            type="file"
            accept=".csv,text/csv"
            style={{ position: "absolute", left: -9999 }}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <a className="btn btn-secondary" href="/templates/programma-import.csv" download>
            Voorbeeldbestand downloaden
          </a>
        </div>
        {fileName ? <p className="small muted">Gekozen bestand: {fileName}</p> : null}
        {reading ? <p className="small muted">Bestand wordt gelezen…</p> : null}
      </div>

      {parsed ? (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>Stap 2: controleer</h2>
            <span className="badge badge-muted">
              {parsed.rows.length} evenementen · {parsed.errors.length} fouten · {parsed.warnings.length} waarschuwingen
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
              Dit worden {parsed.rows.length} evenementen. Klopt dat? Controleer de lijst en klik op
              “Definitief opslaan”.
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
              <div key={`${row.date}-${index}`} className="row-card" style={{ gridTemplateColumns: "130px 1fr auto" }}>
                <div>
                  <strong>{row.date}</strong>
                  <div className="small muted">{row.start_time}–{row.end_time}</div>
                </div>
                <div>
                  <strong>{row.description}</strong>
                  <div className="small muted">
                    {row.series_name ? `Reeks: ${row.series_name} · ` : ""}
                    {row.labels || "geen labels"}
                    {row.less_suitable ? " · minder geschikt voor rollators" : ""}
                  </div>
                </div>
                <div className="small" style={{ textAlign: "right" }}>
                  {money(row.price_cents)}
                  <div className="muted">{row.capacity} plekken</div>
                </div>
              </div>
            ))}
          </div>

          <form action={importProgramAction} className="actions" style={{ marginTop: 20 }}>
            <input type="hidden" name="period_id" value={periodId} />
            <input type="hidden" name="csv" value={csv} />
            <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
              Definitief opslaan
            </button>
            <span className="small muted">
              Na opslaan kun je de import niet automatisch terugdraaien; controleer daarom eerst.
            </span>
          </form>
        </div>
      ) : null}
    </div>
  );
}
