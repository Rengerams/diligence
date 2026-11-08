import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { readExcelProgram } from "../src/lib/excel-program";

const period = { start_date: "2026-11-01", end_date: "2026-12-31" };

async function workbookBuffer(rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Programma");
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("Excel-programma-import", () => {
  it("leest een maandkop met dagregels", async () => {
    const buffer = await workbookBuffer([
      ["NOVEMBER"],
      ["ma 02", "10:30-14:30", "Museum", "€ 12,50", "Koffie", "Nieuw", "14", "ja"],
      ["do 05", "10:30-14:30", "Restaurant", "€ 25,00", "Lunch", "Op herhaling", "7", "nee"],
    ]);
    const parsed = await readExcelProgram(buffer, period);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].date).toBe("2026-11-02");
    expect(parsed.rows[0].price_cents).toBe(1250);
    expect(parsed.rows[1].capacity).toBe(7);
  });

  it("leest een platte tabel met Datum", async () => {
    const buffer = await workbookBuffer([
      ["Datum", "Tijd", "Omschrijving", "Prijs", "Capaciteit"],
      ["2026-12-04", "13:00-17:00", "Tuincentrum", "5,00", "14"],
    ]);
    const parsed = await readExcelProgram(buffer, period);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows[0].date).toBe("2026-12-04");
    expect(parsed.rows[0].description).toBe("Tuincentrum");
  });

  it("meldt een ongeldige tijd", async () => {
    const buffer = await workbookBuffer([
      ["NOVEMBER"],
      ["ma 02", "14:30-10:30", "Museum", "12,50", "", "", "14", "ja"],
    ]);
    const parsed = await readExcelProgram(buffer, period);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0].message).toContain("tijd");
  });
});
