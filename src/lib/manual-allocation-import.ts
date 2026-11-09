export type ManualAllocationRow = {
  name: string;
  phone: string;
  date: string;
  description: string;
  status: "assigned" | "waitlist" | "skip";
  rank: number;
};

export type ManualAllocationIssue = { row: number; message: string };

export type ParsedManualAllocation = {
  rows: ManualAllocationRow[];
  errors: ManualAllocationIssue[];
  warnings: ManualAllocationIssue[];
};

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : trimmed;
  }
  const match = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === iso ? iso : null;
}

function parseStatus(value: string): ManualAllocationRow["status"] | null {
  const status = value.trim().toLowerCase();
  if (["ingedeeld", "geplaatst", "ja", "meedoen", "assigned"].includes(status)) return "assigned";
  if (["reserve", "reservelijst", "wachtlijst", "waitlist"].includes(status)) return "waitlist";
  if (["niet", "nee", "niet ingedeeld", "afgewezen", "skip"].includes(status)) return "skip";
  return null;
}

export function parseManualAllocationCsv(text: string): ParsedManualAllocation {
  const rows: ManualAllocationRow[] = [];
  const errors: ManualAllocationIssue[] = [];
  const warnings: ManualAllocationIssue[] = [];
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!clean) {
    return { rows, errors: [{ row: 0, message: "Het bestand is leeg." }], warnings };
  }

  const lines = clean.split("\n").filter((line) => line.trim().length > 0);
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader);
  const at = (...names: string[]) => headers.findIndex((header) => names.includes(header));

  const nameIndex = at("naam", "deelnemer", "name");
  const phoneIndex = at("telefoon", "telefoonnummer", "phone");
  const dateIndex = at("datum", "date");
  const descriptionIndex = at("omschrijving", "evenement", "description");
  const statusIndex = at("status", "indeling");
  const rankIndex = at("rang", "rank", "positie");

  if (dateIndex < 0 || statusIndex < 0 || (nameIndex < 0 && phoneIndex < 0)) {
    return {
      rows,
      errors: [
        {
          row: 1,
          message:
            "De kopregel mist Datum, Status en een Naam- of Telefoonkolom. Gebruik het voorbeeldbestand.",
        },
      ],
      warnings,
    };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const cells = splitLine(lines[i], delimiter);
    const name = nameIndex >= 0 ? (cells[nameIndex] ?? "").trim() : "";
    const phone = phoneIndex >= 0 ? (cells[phoneIndex] ?? "").replace(/\D/g, "") : "";
    const date = parseDate(cells[dateIndex] ?? "");
    const description = descriptionIndex >= 0 ? (cells[descriptionIndex] ?? "").trim() : "";
    const status = parseStatus(cells[statusIndex] ?? "");
    const rankRaw = rankIndex >= 0 ? Number.parseInt(cells[rankIndex] ?? "", 10) : 0;

    if (!name && !phone) {
      errors.push({ row: rowNumber, message: "Vul een naam of telefoonnummer in." });
      continue;
    }
    if (!date) {
      errors.push({ row: rowNumber, message: `De datum “${cells[dateIndex] ?? ""}” klopt niet.` });
      continue;
    }
    if (!status) {
      errors.push({
        row: rowNumber,
        message: "De status moet ingedeeld, reserve of niet zijn.",
      });
      continue;
    }
    if (status !== "skip" && (!Number.isFinite(rankRaw) || rankRaw < 0)) {
      warnings.push({ row: rowNumber, message: "De rang is ongeldig; 0 gebruikt." });
    }

    rows.push({
      name,
      phone,
      date,
      description,
      status,
      rank: Number.isFinite(rankRaw) && rankRaw > 0 ? rankRaw : 0,
    });
  }

  return { rows, errors, warnings };
}
