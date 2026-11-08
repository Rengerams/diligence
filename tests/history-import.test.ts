import { describe, expect, it } from "vitest";
import { parseHistoryCsv } from "../src/lib/history-import";

const today = "2026-11-03";

describe("bezoekgeschiedenis-import", () => {
  it("leest een geldig bestand", () => {
    const csv = [
      "Naam;Telefoon;Datum;Omschrijving",
      "Jan de Vries;0612345678;2025-10-01;Museum",
      "Anna Smit;;2025-08-14;Uit eten",
    ].join("\n");

    const parsed = parseHistoryCsv(csv, today);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].date).toBe("2025-10-01");
    expect(parsed.rows[0].phone).toBe("0612345678");
  });

  it("weigert een datum in de toekomst", () => {
    const csv = [
      "Naam;Datum;Omschrijving",
      "Jan de Vries;2027-01-01;Museum",
    ].join("\n");

    const parsed = parseHistoryCsv(csv, today);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0].message).toContain("toekomst");
  });

  it("eist een datum", () => {
    const csv = [
      "Naam;Datum;Omschrijving",
      "Jan de Vries;;Museum",
    ].join("\n");

    const parsed = parseHistoryCsv(csv, today);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors).toHaveLength(1);
  });
});
