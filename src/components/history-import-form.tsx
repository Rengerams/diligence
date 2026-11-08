"use client";

import { useMemo, useState } from "react";
import { parseHistoryCsv, type ParsedHistory } from "@/lib/history-import";
import { importHistoryAction } from "@/app/actions";

export function HistoryImportForm({ today }: { today: string }) {
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<ParsedHistory | null>(null);

  const canSubmit = useMemo(
    () => Boolean(parsed && parsed.rows.length > 0 && parsed.errors.length === 0),
    [parsed],
  );

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    setParsed(parseHistoryCsv(text, today));
  }

  return (
    <div>
      <div className="card">
        <h2>Stap 1: kies het bestand</h2>
        <p className="muted">
          Gebruik een CSV-bestand met Naam of Telefoon, Datum en Omschrijving. De deelnemer moet
          al in het systeem staan.
        </p>
        <div className="actions">
          <label className="btn btn-secondary" htmlFor="history-file">
            Bestand kiezen
          </label>
          <input
            id="history-file"
            type="file"
            accept=".csv,text/csv"
            style={{ position: "absolute", left: -9999 }}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          <a className="btn btn-secondary" href="/templates/geschiedenis-import.csv" download>
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
              {parsed.rows.length} bezoeken · {parsed.errors.length} fouten · {parsed.warnings.length} waarschuwingen
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
              Dit worden {parsed.rows.length} bezoeken. De koppeling aan deelnemers gebeurt bij het
              opslaan; onbekende namen leveren dan een melding op.
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
              <div key={`${row.date}-${index}`} className="row-card" style={{ gridTemplateColumns: "1fr auto" }}>
                <div>
                  <strong>{row.name || row.phone}</strong>
                  <div className="small muted">
                    {row.date} · {row.description || "geen omschrijving"}
                  </div>
                </div>
                <span className="small muted">Rij {index + 2}</span>
              </div>
            ))}
          </div>

          <form action={importHistoryAction} className="actions" style={{ marginTop: 20 }}>
            <input type="hidden" name="csv" value={csv} />
            <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
              Bezoeken opslaan
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
