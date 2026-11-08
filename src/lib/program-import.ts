export type ProgramRow = {
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

export type ProgramIssue = {
  row: number;
  message: string;
};

export type ParsedProgram = {
  rows: ProgramRow[];
  errors: ProgramIssue[];
  warnings: ProgramIssue[];
};

function splitCsvLine(line: string, delimiter: string): string[] {
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
  const check = date.toISOString().slice(0, 10);
  return check === iso ? iso : null;
}

function parseTimeRange(value: string): [string, string] | null {
  const match = value.match(/^\s*(\d{1,2})[:.](\d{2})\s*(?:-|–|tot)\s*(\d{1,2})[:.](\d{2})\s*$/i);
  if (!match) return null;
  const [, h1, m1, h2, m2] = match;
  const start = `${h1.padStart(2, "0")}:${m1}`;
  const end = `${h2.padStart(2, "0")}:${m2}`;
  if (Number(h1) > 23 || Number(h2) > 23 || Number(m1) > 59 || Number(m2) > 59) return null;
  if (end <= start) return null;
  return [start, end];
}

function parseMoney(value: string): number | null {
  if (!value.trim()) return 0;
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function parseProgramCsv(text: string, defaultCapacity = 14): ParsedProgram {
  const errors: ProgramIssue[] = [];
  const warnings: ProgramIssue[] = [];
  const rows: ProgramRow[] = [];

  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!clean) {
    return { rows, errors: [{ row: 0, message: "Het bestand is leeg." }], warnings };
  }

  const lines = clean.split("\n").filter((line) => line.trim().length > 0);
  const headerLine = lines[0];
  const delimiter = (headerLine.match(/;/g)?.length ?? 0) >= (headerLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(headerLine, delimiter).map(normalizeHeader);
  const index = (names: string[]) =>
    headers.findIndex((header) => names.includes(header));

  const dateIndex = index(["datum", "date"]);
  const timeIndex = index(["tijd", "tijdstip", "time"]);
  const descriptionIndex = index(["omschrijving", "wat", "description"]);
  const priceIndex = index(["totaal", "prijs", "price"]);
  const capacityIndex = index(["capaciteit", "plekken", "capacity"]);
  const labelsIndex = index(["labels", "label"]);
  const extraIndex = index(["extra kosten", "extrakosten"]);
  const seriesIndex = index(["reeks", "serie", "series"]);
  const suitableIndex = index(["geschikt voor rollators", "rollator", "geschikt"]);

  if (dateIndex < 0 || timeIndex < 0 || descriptionIndex < 0) {
    return {
      rows,
      errors: [
        {
          row: 1,
          message:
            "De kopregel mist minimaal Datum, Tijd of Omschrijving. Download het voorbeeldbestand en gebruik die kolommen.",
        },
      ],
      warnings,
    };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const cells = splitCsvLine(lines[i], delimiter);
    const date = parseDate(cells[dateIndex] ?? "");
    const times = parseTimeRange(cells[timeIndex] ?? "");
    const description = (cells[descriptionIndex] ?? "").trim();
    const price = priceIndex >= 0 ? parseMoney(cells[priceIndex] ?? "") : 0;
    const capacityRaw = capacityIndex >= 0 ? (cells[capacityIndex] ?? "").trim() : "";
    const capacity = capacityRaw ? Number.parseInt(capacityRaw, 10) : defaultCapacity;
    const suitableRaw = suitableIndex >= 0 ? (cells[suitableIndex] ?? "").toLowerCase() : "";

    if (!date) {
      errors.push({ row: rowNumber, message: `De datum “${cells[dateIndex] ?? ""}” klopt niet. Gebruik 2026-11-20 of 20-11-2026.` });
      continue;
    }
    if (!times) {
      errors.push({ row: rowNumber, message: `De tijd “${cells[timeIndex] ?? ""}” klopt niet. Gebruik bijvoorbeeld 10:30-14:30.` });
      continue;
    }
    if (!description) {
      errors.push({ row: rowNumber, message: "De omschrijving is leeg." });
      continue;
    }
    if (price === null) {
      errors.push({ row: rowNumber, message: `Het bedrag “${cells[priceIndex] ?? ""}” kan niet worden gelezen.` });
      continue;
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      errors.push({ row: rowNumber, message: "De capaciteit moet een getal tussen 1 en 100 zijn." });
      continue;
    }
    if (!capacityRaw) {
      warnings.push({ row: rowNumber, message: `Geen capaciteit ingevuld; ${defaultCapacity} gebruikt.` });
    }
    if (!(cells[priceIndex] ?? "").trim()) {
      warnings.push({ row: rowNumber, message: "Geen prijs ingevuld; € 0,00 gebruikt." });
    }

    rows.push({
      date,
      start_time: times[0],
      end_time: times[1],
      description,
      price_cents: price,
      capacity,
      labels: labelsIndex >= 0 ? (cells[labelsIndex] ?? "").trim() : "",
      extra_costs: extraIndex >= 0 ? (cells[extraIndex] ?? "").trim() : "",
      series_name: seriesIndex >= 0 ? (cells[seriesIndex] ?? "").trim() : "",
      less_suitable: ["nee", "minder geschikt", "onvoldoende"].includes(suitableRaw),
    });
  }

  return { rows, errors, warnings };
}
