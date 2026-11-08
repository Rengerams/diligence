import { digitsOnly, normalize } from "./format";

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

export type SearchableParticipant = {
  id: string;
  first_name: string;
  last_name_prefix: string;
  last_name: string;
  phone: string;
  phone_alt: string;
};

export type SearchHit = {
  participant: SearchableParticipant;
  score: number;
};

export function searchParticipants<T extends SearchableParticipant>(
  participants: T[],
  query: string,
): (T & { _score: number })[] {
  const q = normalize(query);
  const phoneQuery = digitsOnly(query);
  if (!q && !phoneQuery) return participants.map((p) => ({ ...p, _score: 0 }));

  const hits: (T & { _score: number })[] = [];
  for (const participant of participants) {
    const name = normalize(
      `${participant.first_name} ${participant.last_name_prefix} ${participant.last_name}`,
    );
    const phones = [participant.phone, participant.phone_alt]
      .map(digitsOnly)
      .filter(Boolean);

    let score = -1;
    if (phoneQuery.length >= 3 && phones.some((phone) => phone.includes(phoneQuery))) {
      score = 100;
    } else if (q.length >= 2) {
      if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else {
        const distance = levenshtein(q, name);
        if (distance <= 2) score = 40 - distance;
        else {
          const words = name.split(" ");
          if (words.some((word) => levenshtein(q, word) <= 1)) score = 20;
        }
      }
    }

    if (score >= 0) hits.push({ ...participant, _score: score });
  }

  return hits.sort((a, b) => b._score - a._score || a.last_name.localeCompare(b.last_name));
}
