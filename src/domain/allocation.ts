/**
 * Deterministische indelingsmotor.
 *
 * Deze functie is bewust puur: geen database, geen netwerk, geen klok en geen
 * willekeur. Dezelfde invoer geeft altijd dezelfde uitvoer. De volgorde van de
 * regels is een voorstel op basis van EISEN.md; de punten die nog niet zijn
 * bevestigd staan in docs/INDELINGSALGORITME.md als TODO(besluit).
 */

export type AllocationOuting = {
  id: string;
  date: string;
  capacity: number;
  seriesKey: string;
  description: string;
  status: "planned" | "completed" | "cancelled";
};

export type AllocationParticipant = {
  id: string;
  name: string;
  count12m: number;
  plannedCount: number;
  lastVisitDate: string | null;
  guaranteeRemaining: number;
};

export type AllocationGroup = {
  id: string;
  name: string;
  memberIds: string[];
};

export type AllocationSignup = {
  id: string;
  participantId: string;
  targetType: "outing" | "series" | "period";
  outingId: string | null;
  seriesKey: string;
  groupMode: "with_group" | "alone";
  groupId: string | null;
};

export type AllocationInput = {
  outings: AllocationOuting[];
  participants: AllocationParticipant[];
  groups: AllocationGroup[];
  signups: AllocationSignup[];
};

export type AllocationAssignment = {
  outingId: string;
  participantId: string;
  groupId: string | null;
  status: "assigned";
  source: "system";
  reasonCode:
    | "placed_specific"
    | "placed_flexible"
    | "placed_guarantee";
  reasonText: string;
};

export type AllocationWaitlistEntry = {
  outingId: string;
  participantId: string;
  groupId: string | null;
  status: "waitlist";
  source: "system";
  rank: number;
  reasonCode: "waitlist_capacity" | "waitlist_group" | "waitlist_series";
  reasonText: string;
};

export type AllocationTieEntry = {
  outingId: string;
  participantId: string;
  groupId: string | null;
  status: "tie";
  source: "system";
  reasonCode: "tie";
  reasonText: string;
};

export type AllocationResult = {
  assignments: AllocationAssignment[];
  waitlist: AllocationWaitlistEntry[];
  ties: AllocationTieEntry[];
  stats: {
    placed: number;
    waitlisted: number;
    ties: number;
    capacityUsed: Record<string, number>;
  };
};

type Unit = {
  targetKey: string;
  targetType: "outing" | "series" | "period";
  outingIds: string[];
};

type Claim = Unit & {
  key: string;
  memberIds: string[];
  groupId: string | null;
  groupName: string | null;
  fixed: boolean;
  guaranteeOpen: boolean;
  count: number;
  plannedCount: number;
  lastVisitDate: string | null;
};

const REASON = {
  placed_specific: "Specifieke opgave; er was plek.",
  placed_flexible: "Flexibele opgave; deze datum had de meeste ruimte.",
  placed_guarantee: "Nieuwe deelnemer met startkans; er was plek.",
  waitlist_capacity: "Het evenement is vol; op de reservelijst geplaatst.",
  waitlist_group: "Het groepje past niet in één keer; samen op de reservelijst.",
  waitlist_series: "Alle data van deze reeks zijn vol; op de reservelijst geplaatst.",
  tie: "Gelijke stand; de coördinator beslist.",
} as const;

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildUnits(signup: AllocationSignup, outings: AllocationOuting[]): Unit[] {
  if (signup.targetType === "outing") {
    return signup.outingId
      ? [{ targetKey: `outing:${signup.outingId}`, targetType: "outing", outingIds: [signup.outingId] }]
      : [];
  }

  if (signup.targetType === "series") {
    const ids = outings.filter((o) => o.seriesKey === signup.seriesKey).map((o) => o.id);
    return ids.length
      ? [{ targetKey: `series:${signup.seriesKey}`, targetType: "series", outingIds: ids }]
      : [];
  }

  const bySeries = new Map<string, AllocationOuting[]>();
  const singles: AllocationOuting[] = [];
  for (const outing of outings) {
    if (!outing.seriesKey) {
      singles.push(outing);
      continue;
    }
    const list = bySeries.get(outing.seriesKey) ?? [];
    list.push(outing);
    bySeries.set(outing.seriesKey, list);
  }

  const units: Unit[] = [];
  for (const [seriesKey, list] of bySeries) {
    units.push({
      targetKey: `period:series:${seriesKey}`,
      targetType: "period",
      outingIds: list.map((o) => o.id),
    });
  }
  for (const outing of singles) {
    units.push({
      targetKey: `period:outing:${outing.id}`,
      targetType: "period",
      outingIds: [outing.id],
    });
  }
  return units;
}

function overlaps(signup: AllocationSignup, unit: Unit, outingsById: Map<string, AllocationOuting>): boolean {
  if (signup.targetType === "outing") {
    return signup.outingId ? unit.outingIds.includes(signup.outingId) : false;
  }
  if (signup.targetType === "series") {
    return unit.outingIds.some((id) => outingsById.get(id)?.seriesKey === signup.seriesKey);
  }
  return true;
}

export function calculateAllocation(input: AllocationInput): AllocationResult {
  const outingsById = new Map(input.outings.map((o) => [o.id, o]));
  const participantsById = new Map(input.participants.map((p) => [p.id, p]));
  const groupsById = new Map(input.groups.map((g) => [g.id, g]));

  const aloneSignups = input.signups.filter((s) => s.groupMode === "alone");
  const specificSignups = input.signups.filter((s) => s.targetType === "outing");

  const claims: Claim[] = [];
  const seen = new Set<string>();

  for (const signup of input.signups) {
    const units = buildUnits(signup, input.outings);
    for (const unit of units) {
      let memberIds: string[];
      let groupId: string | null = null;
      let groupName: string | null = null;

      if (signup.groupMode === "with_group" && signup.groupId) {
        const group = groupsById.get(signup.groupId);
        if (group && group.memberIds.length > 1) {
          groupId = group.id;
          groupName = group.name;
          memberIds = group.memberIds.filter((memberId) => {
            // Een lid dat voor deze evenementen "Alleen" opgaf, doet niet mee in de groep.
            const hasAlone = aloneSignups.some(
              (s) => s.participantId === memberId && overlaps(s, unit, outingsById),
            );
            // Een lid met een eigen specifieke opgave voor dit evenement houdt die opgave.
            const hasOwnSpecific = specificSignups.some(
              (s) =>
                s.participantId === memberId &&
                s.id !== signup.id &&
                s.outingId !== null &&
                unit.outingIds.includes(s.outingId),
            );
            return !hasAlone && !hasOwnSpecific;
          });
        } else {
          memberIds = [signup.participantId];
        }
      } else {
        memberIds = [signup.participantId];
      }

      if (memberIds.length === 0) continue;
      if (memberIds.length === 1) {
        groupId = null;
        groupName = null;
      }

      const sortedMembers = [...memberIds].sort(compareText);
      const key = `${unit.targetKey}|${sortedMembers.join(",")}|${signup.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const members = sortedMembers
        .map((id) => participantsById.get(id))
        .filter((p): p is AllocationParticipant => Boolean(p));
      if (members.length !== sortedMembers.length) continue;

      const fixed = unit.targetType === "outing";
      const guaranteeOpen = members.some((member) => member.guaranteeRemaining > 0);
      const count = avg(members.map((member) => member.count12m));
      const plannedCount = avg(members.map((member) => member.plannedCount));
      const lastVisitDate = members.some((member) => member.lastVisitDate === null)
        ? null
        : members
            .map((member) => member.lastVisitDate as string)
            .sort(compareText)[0] ?? null;

      claims.push({
        ...unit,
        key,
        memberIds: sortedMembers,
        groupId,
        groupName,
        fixed,
        guaranteeOpen,
        count,
        plannedCount,
        lastVisitDate,
      });
    }
  }

  claims.sort((a, b) => {
    if (a.guaranteeOpen !== b.guaranteeOpen) return a.guaranteeOpen ? -1 : 1;
    if (a.plannedCount !== b.plannedCount) return a.plannedCount - b.plannedCount;
    if (a.fixed !== b.fixed) return a.fixed ? -1 : 1;
    if (a.count !== b.count) return a.count - b.count;
    if (a.lastVisitDate !== b.lastVisitDate) {
      if (a.lastVisitDate === null) return -1;
      if (b.lastVisitDate === null) return 1;
      return compareText(a.lastVisitDate, b.lastVisitDate);
    }
    return compareText(a.key, b.key);
  });

  const remaining = new Map(input.outings.map((outing) => [outing.id, outing.capacity]));
  const assigned = new Set<string>();
  const seriesTaken = new Map<string, Set<string>>();
  const guaranteeUsed = new Map<string, number>();
  const waitlistRank = new Map<string, number>();
  const waitlisted = new Set<string>();
  const assignments: AllocationAssignment[] = [];
  const waitlist: AllocationWaitlistEntry[] = [];
  const ties: AllocationTieEntry[] = [];

  // Eenvoudige, transparante gelijke-stand-detectie: exact dezelfde prioriteit,
  // hetzelfde ene evenement en samen meer vraag dan plekken. De plekken blijven vrij.
  const tieGroups = new Map<string, Claim[]>();
  for (const claim of claims) {
    if (!claim.fixed || claim.outingIds.length !== 1) continue;
    const key = [
      claim.outingIds[0],
      claim.count.toFixed(4),
      claim.plannedCount.toFixed(4),
      claim.lastVisitDate ?? "nooit",
      claim.guaranteeOpen ? "garantie" : "geen",
    ].join("|");
    const list = tieGroups.get(key) ?? [];
    list.push(claim);
    tieGroups.set(key, list);
  }
  const tiedClaimKeys = new Set<string>();
  for (const group of tieGroups.values()) {
    if (group.length < 2) continue;
    const outingId = group[0].outingIds[0];
    const capacity = remaining.get(outingId) ?? 0;
    const demand = group.reduce((sum, claim) => sum + claim.memberIds.length, 0);
    if (demand <= capacity) continue;
    for (const claim of group) {
      tiedClaimKeys.add(claim.key);
      for (const participantId of claim.memberIds) {
        ties.push({
          outingId,
          participantId,
          groupId: claim.groupId,
          status: "tie",
          source: "system",
          reasonCode: "tie",
          reasonText: REASON.tie,
        });
      }
    }
    // De betwiste plekken blijven gereserveerd voor het besluit van de coördinator.
    remaining.set(outingId, Math.max(0, capacity - demand));
  }

  for (const claim of claims) {
    if (tiedClaimKeys.has(claim.key)) continue;

    const candidates = claim.outingIds
      .map((id) => outingsById.get(id))
      .filter((outing): outing is AllocationOuting => Boolean(outing))
      .filter((outing) => outing.status === "planned")
      .filter((outing) => (remaining.get(outing.id) ?? 0) >= claim.memberIds.length)
      .filter(
        (outing) =>
          !claim.memberIds.some((memberId) => assigned.has(`${memberId}:${outing.id}`)),
      )
      .filter((outing) => {
        if (!outing.seriesKey) return true;
        return !claim.memberIds.some((memberId) =>
          seriesTaken.get(memberId)?.has(outing.seriesKey),
        );
      });

    candidates.sort((a, b) => {
      const remainingA = remaining.get(a.id) ?? 0;
      const remainingB = remaining.get(b.id) ?? 0;
      if (remainingA !== remainingB) return remainingB - remainingA;
      if (a.date !== b.date) return compareText(a.date, b.date);
      return compareText(a.id, b.id);
    });

    const chosen = claim.fixed ? candidates[0] : candidates[0];

    if (chosen) {
      const guaranteeNow =
        claim.guaranteeOpen &&
        claim.memberIds.some(
          (memberId) =>
            (guaranteeUsed.get(memberId) ?? 0) <
            (participantsById.get(memberId)?.guaranteeRemaining ?? 0),
        );
      const reasonCode = guaranteeNow
        ? "placed_guarantee"
        : claim.fixed
          ? "placed_specific"
          : "placed_flexible";
      for (const participantId of claim.memberIds) {
        assignments.push({
          outingId: chosen.id,
          participantId,
          groupId: claim.groupId,
          status: "assigned",
          source: "system",
          reasonCode,
          reasonText: REASON[reasonCode],
        });
        assigned.add(`${participantId}:${chosen.id}`);
        if (guaranteeNow) {
          guaranteeUsed.set(participantId, (guaranteeUsed.get(participantId) ?? 0) + 1);
        }
        if (chosen.seriesKey) {
          const set = seriesTaken.get(participantId) ?? new Set<string>();
          set.add(chosen.seriesKey);
          seriesTaken.set(participantId, set);
        }
      }
      remaining.set(chosen.id, (remaining.get(chosen.id) ?? 0) - claim.memberIds.length);
      continue;
    }

    const waitlistCandidates = claim.outingIds
      .map((id) => outingsById.get(id))
      .filter((outing): outing is AllocationOuting => Boolean(outing))
      .filter((outing) => outing.status === "planned");
    waitlistCandidates.sort((a, b) => {
      const remainingA = remaining.get(a.id) ?? 0;
      const remainingB = remaining.get(b.id) ?? 0;
      if (remainingA !== remainingB) return remainingB - remainingA;
      if (a.date !== b.date) return compareText(a.date, b.date);
      return compareText(a.id, b.id);
    });
    const target = waitlistCandidates[0];
    if (!target) continue;

    const rank = (waitlistRank.get(target.id) ?? 0) + 1;
    waitlistRank.set(target.id, rank);
    const reasonCode =
      claim.memberIds.length > 1
        ? "waitlist_group"
        : claim.targetType === "series" && !claim.fixed
          ? "waitlist_series"
          : "waitlist_capacity";

    for (const participantId of claim.memberIds) {
      const dedupeKey = `${participantId}:${target.id}`;
      if (waitlisted.has(dedupeKey)) continue;
      waitlisted.add(dedupeKey);
      waitlist.push({
        outingId: target.id,
        participantId,
        groupId: claim.groupId,
        status: "waitlist",
        source: "system",
        rank,
        reasonCode,
        reasonText: REASON[reasonCode],
      });
    }
  }

  const capacityUsed: Record<string, number> = {};
  for (const outing of input.outings) {
    capacityUsed[outing.id] =
      outing.capacity - (remaining.get(outing.id) ?? outing.capacity);
  }

  return {
    assignments,
    waitlist,
    ties,
    stats: {
      placed: assignments.length,
      waitlisted: waitlist.length,
      ties: ties.length,
      capacityUsed,
    },
  };
}
