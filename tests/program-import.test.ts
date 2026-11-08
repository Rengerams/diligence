import { describe, expect, it } from "vitest";
import { parseProgramCsv } from "../src/lib/program-import";

describe("programma-import", () => {
  it("leest een geldig CSV-bestand", () => {
    const csv = [
      "Datum;Tijd;Omschrijving;Prijs;Capaciteit;Labels;Extra kosten;Reeks;Geschikt voor rollators",
      "2026-11-20;10:30-14:30;Museum;12,50;14;Nieuw;Koffie;Museum;ja",
      "20-11-2026;10:30-14:30;Restaurant;25,00;7;Op herhaling;;;nee",
    ].join("\n");

    const parsed = parseProgramCsv(csv);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].price_cents).toBe(1250);
    expect(parsed.rows[0].start_time).toBe("10:30");
    expect(parsed.rows[1].less_suitable).toBe(true);
  });

  it("gebruikt de standaardcapaciteit als die leeg is", () => {
    const csv = [
      "Datum;Tijd;Omschrijving;Prijs;Capaciteit",
      "2026-11-20;10:30-14:30;Museum;12,50;",
    ].join("\n");

    const parsed = parseProgramCsv(csv, 9);
    expect(parsed.rows[0].capacity).toBe(9);
    expect(parsed.warnings.some((warning) => warning.message.includes("9"))).toBe(true);
  });

  it("meldt een ongeldige tijd", () => {
    const csv = [
      "Datum;Tijd;Omschrijving;Prijs;Capaciteit",
      "2026-11-20;14:30-10:30;Museum;12,50;14",
    ].join("\n");

    const parsed = parseProgramCsv(csv);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0].message).toContain("tijd");
  });

  it("meldt een ongeldige datum", () => {
    const csv = [
      "Datum;Tijd;Omschrijving;Prijs;Capaciteit",
      "31-02-2026;10:30-14:30;Museum;12,50;14",
    ].join("\n");

    const parsed = parseProgramCsv(csv);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors[0].message).toContain("datum");
  });
});
