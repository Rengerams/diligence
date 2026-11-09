import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./passwords";

const NOW = new Date().toISOString();

type ParticipantSeed = {
  id: string;
  firstName: string;
  prefix?: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  status?: "active" | "paused" | "stopped";
  stoppedOn?: string;
  stopReason?: string;
  walker?: boolean;
  wheelchair?: boolean;
  helpBoarding?: boolean;
  notes?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  cards?: string;
  groupId?: string;
};

const participants: ParticipantSeed[] = [
  {
    id: "p-01",
    firstName: "Jan",
    prefix: "de",
    lastName: "Vries",
    phone: "0612345678",
    email: "jan@example.nl",
    street: "Molenstraat",
    houseNumber: "12",
    postalCode: "1333 AB",
    city: "Almere",
    walker: true,
    helpBoarding: true,
    notes: "Wil graag voorin zitten.",
    emergencyName: "Piet de Vries",
    emergencyPhone: "0698765432",
    cards: "Museumkaart",
    groupId: "g-01",
  },
  {
    id: "p-02",
    firstName: "Anna",
    lastName: "Smit",
    phone: "0612345679",
    email: "anna@example.nl",
    street: "Dijkstraat",
    houseNumber: "8",
    postalCode: "1334 CD",
    city: "Almere",
    cards: "VriendenLoterij",
    groupId: "g-01",
  },
  {
    id: "p-03",
    firstName: "Piet",
    lastName: "Jansen",
    phone: "0612345680",
    email: "piet@example.nl",
    street: "Stationsweg",
    houseNumber: "44",
    postalCode: "1335 EF",
    city: "Almere",
    cards: "Museumkaart",
    groupId: "g-01",
  },
  {
    id: "p-04",
    firstName: "Els",
    lastName: "Bakker",
    phone: "0612345681",
    email: "els@example.nl",
    street: "Bolderweg",
    houseNumber: "1",
    postalCode: "1332 AX",
    city: "Almere",
    walker: true,
    cards: "Museumkaart, VriendenLoterij",
    groupId: "g-02",
  },
  {
    id: "p-05",
    firstName: "Kees",
    lastName: "Visser",
    phone: "0612345682",
    email: "kees@example.nl",
    street: "Parklaan",
    houseNumber: "3",
    postalCode: "1336 GH",
    city: "Almere",
    groupId: "g-02",
  },
  {
    id: "p-06",
    firstName: "Maria",
    prefix: "de",
    lastName: "Boer",
    phone: "0612345683",
    email: "maria@example.nl",
    street: "Havenstraat",
    houseNumber: "21",
    postalCode: "1337 IJ",
    city: "Almere",
    notes: "Nieuw sinds deze periode.",
  },
  {
    id: "p-07",
    firstName: "Henk",
    lastName: "Mulder",
    phone: "0612345684",
    email: "henk@example.nl",
    street: "Bosweg",
    houseNumber: "9",
    postalCode: "1338 KL",
    city: "Almere",
  },
  {
    id: "p-08",
    firstName: "Truus",
    prefix: "van",
    lastName: "Dijk",
    phone: "0612345685",
    email: "truus@example.nl",
    street: "Vaartweg",
    houseNumber: "15",
    postalCode: "1339 MN",
    city: "Almere",
    walker: true,
  },
  {
    id: "p-09",
    firstName: "Gerard",
    lastName: "Vos",
    phone: "0612345686",
    email: "gerard@example.nl",
    street: "Kerkstraat",
    houseNumber: "7",
    postalCode: "1340 OP",
    city: "Almere",
  },
  {
    id: "p-10",
    firstName: "Ria",
    lastName: "Meijer",
    phone: "0612345687",
    email: "ria@example.nl",
    street: "Schoolstraat",
    houseNumber: "2",
    postalCode: "1341 QR",
    city: "Almere",
  },
  {
    id: "p-11",
    firstName: "Willem",
    lastName: "Bos",
    phone: "0612345688",
    email: "willem@example.nl",
    street: "Sportlaan",
    houseNumber: "18",
    postalCode: "1342 ST",
    city: "Almere",
    wheelchair: true,
  },
  {
    id: "p-12",
    firstName: "Leny",
    lastName: "Kok",
    phone: "0612345689",
    email: "leny@example.nl",
    street: "Duinweg",
    houseNumber: "5",
    postalCode: "1343 UV",
    city: "Almere",
    status: "paused",
  },
  {
    id: "p-13",
    firstName: "Cor",
    prefix: "van",
    lastName: "Leeuwen",
    phone: "0612345690",
    email: "cor@example.nl",
    street: "Plasweg",
    houseNumber: "33",
    postalCode: "1344 WX",
    city: "Almere",
  },
  {
    id: "p-14",
    firstName: "Nelly",
    lastName: "Prins",
    phone: "0612345691",
    email: "nelly@example.nl",
    street: "Ringdijk",
    houseNumber: "6",
    postalCode: "1345 YZ",
    city: "Almere",
  },
];

const historyCounts: Record<string, number> = {
  "p-01": 3,
  "p-02": 2,
  "p-03": 5,
  "p-04": 4,
  "p-05": 1,
  "p-06": 0,
  "p-07": 6,
  "p-08": 2,
  "p-09": 7,
  "p-10": 1,
  "p-11": 3,
  "p-12": 0,
  "p-13": 3,
  "p-14": 0,
};

const historyDates = [
  "2026-09-15",
  "2026-06-10",
  "2026-02-20",
  "2025-11-05",
  "2025-07-12",
  "2025-03-18",
  "2024-10-01",
];

const historyDescriptions = [
  "Museum Harderwijk",
  "Uit eten in Almere",
  "Tuincentrum",
  "Rondvaart",
  "Kerstfair",
  "Museum Beeld & Geluid",
  "Pannenkoekhuis",
];

type OutingSeed = {
  id: string;
  seriesKey: string;
  seriesName: string;
  date: string;
  start: string;
  end: string;
  description: string;
  price: number;
  extra: string;
  labels: string;
  capacity: number;
  lessSuitable?: boolean;
};

const outings: OutingSeed[] = [
  {
    id: "o-01",
    seriesKey: "museum-harderwijk",
    seriesName: "Museum Harderwijk",
    date: "2026-11-10",
    start: "10:30",
    end: "14:30",
    description: "Marius van Dokkum Museum",
    price: 1250,
    extra: "Koffie en thee inbegrepen",
    labels: "Nieuw",
    capacity: 14,
  },
  {
    id: "o-02",
    seriesKey: "",
    seriesName: "",
    date: "2026-11-12",
    start: "10:30",
    end: "14:30",
    description: "Restaurant Chapeau",
    price: 2500,
    extra: "Driegangenlunch",
    labels: "Op herhaling",
    capacity: 7,
  },
  {
    id: "o-03",
    seriesKey: "beeld-geluid",
    seriesName: "Museum Beeld & Geluid",
    date: "2026-11-17",
    start: "10:00",
    end: "16:00",
    description: "Museum Beeld & Geluid",
    price: 1750,
    extra: "Entree",
    labels: "Uitgelicht",
    capacity: 14,
  },
  {
    id: "o-04",
    seriesKey: "",
    seriesName: "",
    date: "2026-11-19",
    start: "13:00",
    end: "17:00",
    description: "Tuincentrum 't Vaarderhoogt",
    price: 500,
    extra: "",
    labels: "",
    capacity: 14,
  },
  {
    id: "o-05",
    seriesKey: "pannenkoek",
    seriesName: "Pannenkoekhuis De Smickel",
    date: "2026-11-24",
    start: "10:30",
    end: "14:30",
    description: "Pannenkoekhuis De Smickel",
    price: 1800,
    extra: "Pannenkoek en koffie",
    labels: "Op veler verzoek",
    capacity: 7,
  },
  {
    id: "o-06",
    seriesKey: "pannenkoek",
    seriesName: "Pannenkoekhuis De Smickel",
    date: "2026-11-26",
    start: "10:30",
    end: "14:30",
    description: "Pannenkoekhuis De Smickel",
    price: 1800,
    extra: "Pannenkoek en koffie",
    labels: "Op veler verzoek",
    capacity: 7,
  },
  {
    id: "o-07",
    seriesKey: "beeld-geluid",
    seriesName: "Museum Beeld & Geluid",
    date: "2026-12-02",
    start: "10:00",
    end: "16:00",
    description: "Museum Beeld & Geluid",
    price: 1750,
    extra: "Entree",
    labels: "Uitgelicht",
    capacity: 14,
  },
  {
    id: "o-08",
    seriesKey: "",
    seriesName: "",
    date: "2026-12-08",
    start: "18:00",
    end: "22:00",
    description: "Amsterdam Light Festival",
    price: 2250,
    extra: "Rondvaart",
    labels: "Uitgelicht",
    capacity: 14,
  },
  {
    id: "o-09",
    seriesKey: "",
    seriesName: "",
    date: "2026-12-15",
    start: "10:30",
    end: "14:30",
    description: "Kerstfair Paleis Soestdijk",
    price: 1000,
    extra: "",
    labels: "Eenmalig",
    capacity: 14,
  },
];

type SignupSeed = {
  id: string;
  participantId: string;
  targetType: "outing" | "series" | "period";
  outingId?: string;
  seriesKey?: string;
  groupMode: "with_group" | "alone";
  groupId?: string;
  note?: string;
};

const signups: SignupSeed[] = [
  { id: "s-01", participantId: "p-01", targetType: "outing", outingId: "o-01", groupMode: "with_group", groupId: "g-01" },
  { id: "s-02", participantId: "p-06", targetType: "period", groupMode: "alone", note: "Nieuwe deelnemer, wil graag veel meedoen." },
  { id: "s-03", participantId: "p-07", targetType: "outing", outingId: "o-01", groupMode: "alone" },
  { id: "s-04", participantId: "p-07", targetType: "outing", outingId: "o-03", groupMode: "alone" },
  { id: "s-05", participantId: "p-07", targetType: "outing", outingId: "o-05", groupMode: "alone" },
  { id: "s-06", participantId: "p-08", targetType: "series", seriesKey: "beeld-geluid", groupMode: "alone" },
  { id: "s-07", participantId: "p-09", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-08", participantId: "p-09", targetType: "outing", outingId: "o-08", groupMode: "alone" },
  { id: "s-09", participantId: "p-10", targetType: "period", groupMode: "alone" },
  { id: "s-10", participantId: "p-11", targetType: "outing", outingId: "o-03", groupMode: "alone" },
  { id: "s-11", participantId: "p-11", targetType: "outing", outingId: "o-04", groupMode: "alone" },
  { id: "s-12", participantId: "p-04", targetType: "period", groupMode: "with_group", groupId: "g-02" },
  { id: "s-13", participantId: "p-02", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-14", participantId: "p-03", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-15", participantId: "p-08", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-16", participantId: "p-07", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-17", participantId: "p-01", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-18", participantId: "p-11", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-19", participantId: "p-13", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-20", participantId: "p-14", targetType: "outing", outingId: "o-02", groupMode: "alone" },
  { id: "s-21", participantId: "p-08", targetType: "outing", outingId: "o-08", groupMode: "alone" },
  { id: "s-22", participantId: "p-01", targetType: "outing", outingId: "o-08", groupMode: "alone" },
  { id: "s-23", participantId: "p-13", targetType: "outing", outingId: "o-08", groupMode: "alone" },
  { id: "s-24", participantId: "p-14", targetType: "outing", outingId: "o-08", groupMode: "alone" },
];

export function seedDatabase(db: DatabaseSync): void {
  const insertUser = db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, role_key, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
  );
  // Op een echte server zet je SEED_ADMIN_EMAIL en SEED_ADMIN_PASSWORD, zodat er
  // geen account met het bekende demowachtwoord bestaat.
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@diligence.local")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "demo1234";
  const adminName = process.env.SEED_ADMIN_NAME || "Beheerder Demo";
  insertUser.run(
    "u-admin",
    adminName,
    adminEmail,
    hashPassword(adminPassword),
    "admin",
    "admin",
    NOW,
  );

  // SEED_DEMO_DATA=false laat alleen het beheerdersaccount staan, zonder
  // verzonnen deelnemers, uitjes en opgaven.
  if (process.env.SEED_DEMO_DATA === "false") {
    return;
  }

  const password = hashPassword("demo1234");
  insertUser.run("u-coordinator", "Coördinator Demo", "coordinator@diligence.local", password, "coordinator", "coordinator", NOW);
  insertUser.run("u-driver", "Chauffeur Demo", "chauffeur@diligence.local", password, "driver", "driver", NOW);

  const insertGroup = db.prepare(
    'INSERT INTO "groups" (id, name, created_at) VALUES (?, ?, ?)',
  );
  insertGroup.run("g-01", "De Wandelaars", NOW);
  insertGroup.run("g-02", "Koffieclub", NOW);

  const insertParticipant = db.prepare(`
    INSERT INTO participants (
      id, first_name, last_name_prefix, last_name, phone, phone_alt, email,
      street, house_number, postal_code, city, contact_preference, status,
      stopped_on, stop_reason, mobility_walker, mobility_wheelchair,
      mobility_help_boarding, notes, emergency_name, emergency_phone, cards,
      archived_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, 'phone', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `);

  const insertMember = db.prepare(
    'INSERT INTO group_members (group_id, participant_id, active, created_at) VALUES (?, ?, 1, ?)',
  );
  for (const p of participants) {
    insertParticipant.run(
      p.id,
      p.firstName,
      p.prefix ?? "",
      p.lastName,
      p.phone,
      p.email,
      p.street,
      p.houseNumber,
      p.postalCode,
      p.city,
      p.status ?? "active",
      p.stoppedOn ?? null,
      p.stopReason ?? null,
      p.walker ? 1 : 0,
      p.wheelchair ? 1 : 0,
      p.helpBoarding ? 1 : 0,
      p.notes ?? "",
      p.emergencyName ?? "",
      p.emergencyPhone ?? "",
      p.cards ?? "",
      NOW,
      NOW,
    );
    if (p.groupId) {
      insertMember.run(p.groupId, p.id, NOW);
    }
  }

  const insertHistory = db.prepare(
    "INSERT INTO historical_visits (id, participant_id, visit_date, description, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  let historyId = 1;
  for (const p of participants) {
    const count = historyCounts[p.id] ?? 0;
    for (let i = 0; i < count; i += 1) {
      insertHistory.run(
        `h-${String(historyId).padStart(3, "0")}`,
        p.id,
        historyDates[i],
        historyDescriptions[i],
        NOW,
      );
      historyId += 1;
    }
  }

  const insertPeriod = db.prepare(`
    INSERT INTO periods (id, name, start_date, end_date, deadline, status, default_capacity, created_at)
    VALUES (?, ?, ?, ?, ?, 'published', 14, ?)
  `);
  insertPeriod.run(
    "per-2026-11",
    "November–december 2026",
    "2026-11-01",
    "2026-12-31",
    "2026-10-30",
    NOW,
  );

  const categoryNames = ["Museum", "Uit eten", "Tuincentrum", "Evenement"];
  const categoryIds = new Map<string, string>();
  const insertCategory = db.prepare(
    "INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)",
  );
  for (const [index, name] of categoryNames.entries()) {
    const id = `cat-seed-${index + 1}`;
    categoryIds.set(name, id);
    insertCategory.run(id, name, NOW);
  }

  const categoryFor = (description: string): string => {
    if (description.toLowerCase().includes("museum")) return "Museum";
    if (
      description.toLowerCase().includes("restaurant") ||
      description.toLowerCase().includes("pannenkoek")
    ) {
      return "Uit eten";
    }
    if (description.toLowerCase().includes("tuincentrum")) return "Tuincentrum";
    return "Evenement";
  };

  const insertLocation = db.prepare(`
    INSERT INTO locations (id, name, address, postal_code, city, category_id, created_at)
    VALUES (?, ?, '', '', '', ?, ?)
  `);
  const locationIds = new Map<string, string>();

  const insertOuting = db.prepare(`
    INSERT INTO outings (
      id, period_id, series_key, series_name, date, start_time, end_time,
      description, location_id, category_id, price_cents, extra_costs, labels, capacity,
      less_suitable_walkers, status, created_at
    ) VALUES (?, 'per-2026-11', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?)
  `);
  for (const o of outings) {
    const categoryName = categoryFor(o.description);
    const categoryId = categoryIds.get(categoryName) ?? null;
    let locationId = locationIds.get(o.description);
    if (!locationId) {
      locationId = `loc-seed-${locationIds.size + 1}`;
      locationIds.set(o.description, locationId);
      insertLocation.run(locationId, o.description, categoryId, NOW);
    }
    insertOuting.run(
      o.id,
      o.seriesKey,
      o.seriesName,
      o.date,
      o.start,
      o.end,
      o.description,
      locationId,
      categoryId,
      o.price,
      o.extra,
      o.labels,
      o.capacity,
      o.lessSuitable ? 1 : 0,
      NOW,
    );
  }

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (
      id, name, license_plate, license_plate_normalized, seats, active,
      notes, archived_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, NULL, ?, ?)
  `);
  insertVehicle.run("v-01", "Busje 1", "12-ABC-3", "12ABC3", 7, "Mercedes, 7 gasten", NOW, NOW);
  insertVehicle.run("v-02", "Busje 2", "45-DEF-6", "45DEF6", 7, "Mercedes, 7 gasten", NOW, NOW);
  insertVehicle.run("v-03", "Touringcar", "78-GHI-9", "78GHI9", 40, "Alleen bij grote uitjes", NOW, NOW);

  // Laat de chauffeurdemo meteen één toegewezen uitje zien.
  db.prepare(
    `INSERT INTO outing_vehicles
      (id, outing_id, vehicle_id, service_date, driver_id, seats_snapshot, plate_snapshot, created_at)
     VALUES ('ov-01', 'o-02', 'v-01', '2026-11-12', 'u-driver', 7, '12-ABC-3', ?)`,
  ).run(NOW);

  const insertSignup = db.prepare(`
    INSERT INTO signups (
      id, period_id, participant_id, target_type, outing_id, series_key,
      group_mode, group_id, note, status, created_at, created_by
    ) VALUES (?, 'per-2026-11', ?, ?, ?, ?, ?, ?, ?, 'active', ?, 'u-coordinator')
  `);
  for (const s of signups) {
    insertSignup.run(
      s.id,
      s.participantId,
      s.targetType,
      s.outingId ?? null,
      s.seriesKey ?? "",
      s.groupMode,
      s.groupId ?? null,
      s.note ?? "",
      NOW,
    );
  }

  const insertAudit = db.prepare(`
    INSERT INTO audit_log (at, actor_id, actor_name, action, entity_type, entity_id, summary, before_json, after_json)
    VALUES (?, 'u-admin', 'Beheerder Demo', 'system.seed', 'system', '', ?, NULL, NULL)
  `);
  insertAudit.run(NOW, "Demonstratiegegevens geladen: 14 deelnemers, 9 uitjes en 24 opgaven.");
}
