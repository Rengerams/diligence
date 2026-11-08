import ExcelJS from "exceljs";
import type { ParsedProgram, ProgramIssue, ProgramRow } from "./program-import";

const MONTHS: Record<string, number> = {
  januari: 1,
  january: 1,
  februari: 2,
  february: 2,
  maart: 3,
  march: 3,
  april: 4,
  mei: 5,
  may: 5,
  juni: 6,
  june: 6,
  juli: 7,
  july: 7,
  augustus: 8,
  august: 8,
  september: 9,
  oktober: 10,
  october: 10,
  november: 11,
  december: 12,
};

const WEEKDAYS: Record<string, number> = {
  zo: 0,
  zondag: 0,
  ma: 1,
  maandag: 1,
  di: 2,
  dinsdag: 2,
  wo: 3,
  woensdag: 3,
  do: 4,
  donderdag: 4,
  vr: 5,
  vrijdag: 5,
  za: 6,
  zaterdag: 6,
};

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const object = value as {
      text?: string;
      result?: unknown;
      richText?: { text?: string }[];
    };
    if (typeof object.text === "string") return object.text.trim();
    if (object.result !== undefined) return cellText(object.result);
    if (Array.isArray(object.richText)) {
      return object.richText.map((part) => part.text ?? "").join("").trim();
    }
  }
  return String(value).trim();
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = cellText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return Number.isNaN(new Date(`${iso}T12:00:00Z`).getTime()) ? null : iso;
}

function parseTime(value: string): [string, string] | null {
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

function monthName(value: string): { month: number; year: number | null } | null {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [name, month] of Object.entries(MONTHS)) {
    if (normalized === name || normalized.startsWith(`${name} `)) {
      const yearMatch = normalized.match(/\b(20\d{2})\b/);
      return { month, year: yearMatch ? Number(yearMatch[1]) : null };
    }
  }
  return null;
}

function dayInfo(value: string): { day: number; weekday: number | null; month: number | null } | null {
  const normalized = value.toLowerCase().trim();
  const withWeekday = normalized.match(/^([a-z]+)\s+(\d{1,2})$/);
  if (withWeekday) {
    const weekday = WEEKDAYS[withWeekday[1]];
    if (weekday === undefined) return null;
    return { day: Number(withWeekday[2]), weekday, month: null };
  }
  const numeric = normalized.match(/^(\d{1,2})(?:[-/.](\d{1,2}))?$/);
  if (!numeric) return null;
  return {
    day: Number(numeric[1]),
    weekday: null,
    month: numeric[2] ? Number(numeric[2]) : null,
  };
}

function dateInPeriod(day: number, month: number, year: number, period: { start_date: string; end_date: string }): string | null {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  if (iso < period.start_date || iso > period.end_date) return null;
  return iso;
}

function chooseYear(month: number, period: { start_date: string; end_date: string }): number {
  const startYear = Number(period.start_date.slice(0, 4));
  const endYear = Number(period.end_date.slice(0, 4));
  for (const year of [startYear, endYear, startYear + 1]) {
    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDate = new Date(Date.UTC(year, month, 0));
    const last = lastDate.toISOString().slice(0, 10);
    if (last >= period.start_date && first <= period.end_date) return year;
  }
  return startYear;
}

export async function readExcelProgram(
  buffer: Buffer,
  period: { start_date: string; end_date: string },
): Promise<ParsedProgram> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], errors: [{ row: 0, message: "Het werkboek heeft geen werkblad." }], warnings: [] };
  }

  const matrix: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      cells.push(cellText(row.getCell(column).value));
    }
    matrix.push(cells);
  });

  const errors: ProgramIssue[] = [];
  const warnings: ProgramIssue[] = [];
  const rows: ProgramRow[] = [];

  let headerRow = -1;
  let monthHeader: { month: number; year: number | null } | null = null;
  let headerMap: Record<string, number> = {
    maand: -1,
    dag: 0,
    datum: -1,
    tijd: 1,
    omschrijving: 2,
    prijs: 3,
    extra: 4,
    labels: 5,
    capaciteit: 6,
    geschikt: 7,
    reeks: 8,
  };
  let currentMonth: { month: number; year: number | null } | null = null;

  for (let index = 0; index < matrix.length; index += 1) {
    const cells = matrix[index];
    const nonEmpty = cells.map((cell) => cell.trim()).filter(Boolean);
    if (nonEmpty.length === 0) continue;
    const joined = nonEmpty.join(" ").toLowerCase();

    const parsedMonth = monthName(nonEmpty[0] ?? "");
    if (nonEmpty.length === 1 && parsedMonth) {
      monthHeader = parsedMonth;
      currentMonth = parsedMonth;
      continue;
    }
    if (joined.includes("datum") || joined.includes("tijd") || joined.includes("omschrijving")) {
      headerRow = index;
      const normalized = cells.map((cell) =>
        cell.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(),
      );
      const at = (...names: string[]) => normalized.findIndex((cell) => names.includes(cell));
      headerMap = {
        maand: at("maand", "month"),
        dag: at("dag", "day"),
        datum: at("datum", "date"),
        tijd: at("tijd", "tijdstip", "time"),
        omschrijving: at("omschrijving", "wat", "description"),
        prijs: at("totaal", "prijs", "price"),
        extra: at("extra kosten", "extrakosten"),
        labels: at("labels", "label"),
        capaciteit: at("capaciteit", "plekken", "capacity"),
        geschikt: at("geschikt voor rollators", "rollator", "geschikt"),
        reeks: at("reeks", "serie", "series"),
      };
      continue;
    }

    if (headerRow >= 0 && index <= headerRow) continue;

    const get = (key: string): string => {
      const column = headerMap[key];
      return column >= 0 ? cells[column] ?? "" : "";
    };

    const rowNumber = index + 1;
    let date: string | null = null;

    if (headerMap.datum >= 0) {
      date = parseDate(cells[headerMap.datum]);
    } else {
      const monthValue = headerMap.maand >= 0 ? cellText(cells[headerMap.maand]) : "";
      const month = monthValue ? monthName(monthValue) : currentMonth;
      const dayValue = headerMap.dag >= 0 ? cellText(cells[headerMap.dag]) : cells[0] ?? "";
      const info = dayInfo(dayValue);
      if (month && info) {
        const chosenMonth = info.month ?? month.month;
        const year = month.year ?? chooseYear(chosenMonth, period);
        date = dateInPeriod(info.day, chosenMonth, year, period);
        if (date && info.weekday !== null) {
          const actual = new Date(`${date}T12:00:00Z`).getUTCDay();
          if (actual !== info.weekday) {
            errors.push({ row: rowNumber, message: `De weekdag klopt niet bij ${date}.` });
            continue;
          }
        }
      }
    }

    if (!date) {
      errors.push({ row: rowNumber, message: "Geen geldige datum; controleer de maand- en dagregel." });
      continue;
    }

    const description = headerMap.omschrijving >= 0 ? cellText(cells[headerMap.omschrijving]) : cells[2] ?? "";
    const timeValue = headerMap.tijd >= 0 ? cellText(cells[headerMap.tijd]) : cells[1] ?? "";
    const times = parseTime(timeValue);
    if (!description) {
      errors.push({ row: rowNumber, message: "De omschrijving is leeg." });
      continue;
    }
    if (!times) {
      errors.push({ row: rowNumber, message: `De tijd “${timeValue}” klopt niet.` });
      continue;
    }

    const priceValue = headerMap.prijs >= 0 ? cellText(cells[headerMap.prijs]) : cells[3] ?? "";
    const price = parseMoney(priceValue);
    if (price === null) {
      errors.push({ row: rowNumber, message: `Het bedrag “${priceValue}” kan niet worden gelezen.` });
      continue;
    }
    const capacityValue = headerMap.capaciteit >= 0 ? cellText(cells[headerMap.capaciteit]) : "";
    const capacity = capacityValue ? Number.parseInt(capacityValue, 10) : 14;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      errors.push({ row: rowNumber, message: "De capaciteit moet tussen 1 en 100 liggen." });
      continue;
    }
    if (!capacityValue) {
      warnings.push({ row: rowNumber, message: "Geen capaciteit ingevuld; 14 gebruikt." });
    }

    rows.push({
      date,
      start_time: times[0],
      end_time: times[1],
      description,
      price_cents: price,
      capacity,
      labels: headerMap.labels >= 0 ? cellText(cells[headerMap.labels]) : "",
      extra_costs: headerMap.extra >= 0 ? cellText(cells[headerMap.extra]) : "",
      series_name: headerMap.reeks >= 0 ? cellText(cells[headerMap.reeks]) : "",
      less_suitable: ["nee", "minder geschikt", "onvoldoende"].includes(
        (headerMap.geschikt >= 0 ? cellText(cells[headerMap.geschikt]) : "").toLowerCase(),
      ),
    });
  }

  return { rows, errors, warnings };
}
