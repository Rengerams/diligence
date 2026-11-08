import { describe, expect, it } from "vitest";
import {
  calculateAllocation,
  type AllocationInput,
  type AllocationParticipant,
} from "../src/domain/allocation";

function person(
  id: string,
  overrides: Partial<AllocationParticipant> = {},
): AllocationParticipant {
  return {
    id,
    name: id,
    count12m: 0,
    plannedCount: 0,
    lastVisitDate: null,
    guaranteeRemaining: 0,
    ...overrides,
  };
}

function input(overrides: Partial<AllocationInput> = {}): AllocationInput {
  return {
    outings: [
      { id: "o1", date: "2026-11-10", capacity: 1, seriesKey: "", description: "Uitje 1", status: "planned" },
      { id: "o2", date: "2026-11-12", capacity: 1, seriesKey: "", description: "Uitje 2", status: "planned" },
    ],
    participants: [person("a"), person("b"), person("c")],
    groups: [],
    signups: [],
    ...overrides,
  };
}

describe("eerlijke indeling", () => {
  it("laat een specifieke opgave voorgaan op 'alle uitjes'", () => {
    const result = calculateAllocation(
      input({
        signups: [
          { id: "s1", participantId: "a", targetType: "period", outingId: null, seriesKey: "", groupMode: "alone", groupId: null },
          { id: "s2", participantId: "b", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
        ],
      }),
    );

    expect(result.assignments.find((row) => row.outingId === "o1")?.participantId).toBe("b");
    expect(result.assignments.some((row) => row.outingId === "o1" && row.participantId === "a")).toBe(false);
    expect(result.waitlist.some((row) => row.participantId === "a" && row.outingId === "o1")).toBe(true);
  });

  it("plaatst een specifieke opgave nooit op een andere datum", () => {
    const result = calculateAllocation(
      input({
        outings: [
          { id: "o1", date: "2026-11-10", capacity: 0, seriesKey: "", description: "Vol", status: "planned" },
          { id: "o2", date: "2026-11-12", capacity: 1, seriesKey: "", description: "Vrij", status: "planned" },
        ],
        signups: [
          { id: "s1", participantId: "a", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
        ],
      }),
    );

    expect(result.assignments.some((row) => row.participantId === "a")).toBe(false);
    expect(result.waitlist.some((row) => row.participantId === "a" && row.outingId === "o1")).toBe(true);
  });

  it("geeft een nieuwe deelnemer met startkans voorrang", () => {
    const result = calculateAllocation(
      input({
        participants: [person("a", { guaranteeRemaining: 1 }), person("b", { guaranteeRemaining: 0 })],
        signups: [
          { id: "s1", participantId: "a", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
          { id: "s2", participantId: "b", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
        ],
      }),
    );

    expect(result.assignments[0].participantId).toBe("a");
    expect(result.waitlist[0].participantId).toBe("b");
  });

  it("geeft iemand met minder geplande uitjes voorrang", () => {
    const result = calculateAllocation(
      input({
        participants: [
          person("a", { plannedCount: 5 }),
          person("b", { plannedCount: 2 }),
        ],
        signups: [
          { id: "s1", participantId: "a", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
          { id: "s2", participantId: "b", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
        ],
      }),
    );

    expect(result.assignments[0].participantId).toBe("b");
    expect(result.waitlist[0].participantId).toBe("a");
  });

  it("geeft iemand die minder vaak meedeed voorrang", () => {
    const result = calculateAllocation(
      input({
        participants: [person("a", { count12m: 0 }), person("b", { count12m: 4, lastVisitDate: "2026-06-01" })],
        signups: [
          { id: "s1", participantId: "a", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
          { id: "s2", participantId: "b", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
        ],
      }),
    );

    expect(result.assignments[0].participantId).toBe("a");
    expect(result.waitlist[0].participantId).toBe("b");
  });

  it("plaatst een groepje alleen als geheel", () => {
    const result = calculateAllocation(
      input({
        participants: [person("a"), person("b"), person("c")],
        groups: [{ id: "g1", name: "Groep", memberIds: ["a", "b", "c"] }],
        signups: [
          { id: "s1", participantId: "a", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "with_group", groupId: "g1" },
        ],
      }),
    );

    expect(result.assignments).toHaveLength(0);
    expect(result.waitlist).toHaveLength(3);
    expect(new Set(result.waitlist.map((row) => row.groupId))).toEqual(new Set(["g1"]));
  });

  it("kiest bij een reeks de datum met ruimte", () => {
    const result = calculateAllocation(
      input({
        outings: [
          { id: "o1", date: "2026-11-10", capacity: 1, seriesKey: "serie", description: "Reeks", status: "planned" },
          { id: "o2", date: "2026-11-17", capacity: 1, seriesKey: "serie", description: "Reeks", status: "planned" },
        ],
        signups: [
          { id: "s1", participantId: "a", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
          { id: "s2", participantId: "b", targetType: "series", outingId: null, seriesKey: "serie", groupMode: "alone", groupId: null },
        ],
      }),
    );

    expect(result.assignments.find((row) => row.participantId === "a")?.outingId).toBe("o1");
    expect(result.assignments.find((row) => row.participantId === "b")?.outingId).toBe("o2");
  });

  it("is deterministisch bij dezelfde invoer", () => {
    const fixture = input({
      signups: [
        { id: "s1", participantId: "a", targetType: "period", outingId: null, seriesKey: "", groupMode: "alone", groupId: null },
        { id: "s2", participantId: "b", targetType: "outing", outingId: "o1", seriesKey: "", groupMode: "alone", groupId: null },
      ],
    });

    expect(calculateAllocation(fixture)).toEqual(calculateAllocation(fixture));
  });

  it("overschrijdt de capaciteit nooit automatisch", () => {
    const result = calculateAllocation(
      input({
        outings: [{ id: "o1", date: "2026-11-10", capacity: 2, seriesKey: "", description: "Klein", status: "planned" }],
        participants: [person("a", { count12m: 0 }), person("b", { count12m: 1 }), person("c", { count12m: 2 })],
        signups: ["a", "b", "c"].map((participantId, index) => ({
          id: `s${index}`,
          participantId,
          targetType: "outing" as const,
          outingId: "o1",
          seriesKey: "",
          groupMode: "alone" as const,
          groupId: null,
        })),
      }),
    );

    expect(result.assignments).toHaveLength(2);
    expect(result.waitlist).toHaveLength(1);
    expect(result.stats.capacityUsed.o1).toBe(2);
  });

  it("laat een exacte gelijke stand aan de coördinator", () => {
    const result = calculateAllocation(
      input({
        outings: [{ id: "o1", date: "2026-11-10", capacity: 2, seriesKey: "", description: "Klein", status: "planned" }],
        signups: ["a", "b", "c"].map((participantId, index) => ({
          id: `s${index}`,
          participantId,
          targetType: "outing" as const,
          outingId: "o1",
          seriesKey: "",
          groupMode: "alone" as const,
          groupId: null,
        })),
      }),
    );

    expect(result.assignments).toHaveLength(0);
    expect(result.ties).toHaveLength(3);
  });
});
