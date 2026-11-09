import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { get } from "@/lib/db";
import { getActivePeriod } from "@/lib/queries";
import { commitExcelProgramAction, previewExcelProgramAction } from "@/app/actions";
import { Alert, BackLink, EmptyState, PageHeader } from "@/components/ui";

type PreviewRow = {
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  price_cents: number;
  capacity: number;
  labels: string;
  extra_costs: string;
  series_name: string;
  less_suitable: boolean;
};

export default async function ExcelImportPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; error?: string }>;
}) {
  await requirePermission("program.manage");
  const { preview: previewId, error } = await searchParams;
  const period = getActivePeriod();

  if (!period) {
    return (
      <EmptyState title="Nog geen periode" action={<BackLink href="/uitjes">Terug</BackLink>}>
        Maak eerst een periode aan.
      </EmptyState>
    );
  }

  const preview = previewId
    ? get<{ id: string; payload: string; file_name: string }>(
        "SELECT id, payload, file_name FROM import_previews WHERE id = ?",
        previewId,
      )
    : undefined;
  const parsed = preview
    ? (JSON.parse(preview.payload) as {
        rows: PreviewRow[];
        errors: { row: number; message: string }[];
        warnings: { row: number; message: string }[];
      })
    : undefined;

  return (
    <>
      <PageHeader
        title="Excel-import"
        intro="Laad het programma uit een .xlsx-bestand met maandkoppen en dagregels, of met een datumkolom."
        nextStep={
          preview
            ? "Controleer het aantal evenementen en sla daarna op."
            : "Kies het Excel-bestand. Je ziet eerst een controle voordat er iets wordt opgeslagen."
        }
        actions={<BackLink href="/uitjes/import">Terug naar importeren</BackLink>}
      />

      {error ? <Alert kind="error">{error}</Alert> : null}

      {!preview || !parsed ? (
        <div className="card">
          <h2>Bestand kiezen</h2>
          <p className="muted">
            Ondersteund: <code>.xlsx</code> met een maandkop (bijv. NOVEMBER), dagregels
            (bijv. <code>ma 02</code>) en kolommen voor tijd, omschrijving, prijs, extra kosten,
            labels, capaciteit en geschiktheid. Een platte tabel met Datum/Tijd/Omschrijving werkt
            ook.
          </p>
          <form action={previewExcelProgramAction} encType="multipart/form-data">
            <input type="hidden" name="period_id" value={period.id} />
            <div className="field">
              <label htmlFor="excel-file">Excel-bestand</label>
              <input id="excel-file" name="file" type="file" accept=".xlsx" required />
            </div>
            <div className="actions">
              <button className="btn btn-primary" type="submit">Bestand controleren</button>
              <a className="btn btn-secondary" href="/templates/programma-import.xlsx" download>
                Voorbeeldbestand downloaden
              </a>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="alert alert-success">
            <strong>{parsed.rows.length} evenementen gevonden in {preview.file_name}.</strong> Klopt dat?
          </div>
          {parsed.errors.length ? (
            <Alert kind="error">
              <ul>
                {parsed.errors.map((issue) => (
                  <li key={`${issue.row}-${issue.message}`}>Rij {issue.row}: {issue.message}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {parsed.warnings.length ? (
            <Alert kind="warning">
              <ul>
                {parsed.warnings.map((issue) => (
                  <li key={`${issue.row}-${issue.message}`}>Rij {issue.row}: {issue.message}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <div className="list">
            {parsed.rows.map((row, index) => (
              <div key={`${row.date}-${index}`} className="row-card" style={{ gridTemplateColumns: "140px 1fr auto" }}>
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
                  € {(row.price_cents / 100).toFixed(2).replace(".", ",")}
                  <div className="muted">{row.capacity} plekken</div>
                </div>
              </div>
            ))}
          </div>

          <form action={commitExcelProgramAction} className="actions" style={{ marginTop: 20 }}>
            <input type="hidden" name="preview_id" value={preview.id} />
            <button className="btn btn-primary" type="submit" disabled={parsed.errors.length > 0}>
              {parsed.rows.length} evenementen opslaan
            </button>
            <Link className="btn btn-secondary" href="/uitjes/import/excel">Ander bestand</Link>
          </form>
        </>
      )}

      <p className="small muted" style={{ marginTop: 20 }}>
        Liever CSV? <Link href="/uitjes/import">Gebruik de CSV-import</Link>.
      </p>
    </>
  );
}
