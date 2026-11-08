export type ParticipantImportRow = {
  first_name: string;
  last_name_prefix: string;
  last_name: string;
  phone: string;
  phone_alt: string;
  email: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  cards: string;
  mobility_walker: boolean;
  mobility_wheelchair: boolean;
  mobility_help_boarding: boolean;
  notes: string;
};

export type ParticipantIssue = { row: number; message: string };

export type ParsedParticipants = {
  rows: ParticipantImportRow[];
  errors: ParticipantIssue[];
  warnings: ParticipantIssue[];
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

function yes(value: string): boolean {
  return ["ja", "yes", "1", "waar", "true"].includes(value.trim().toLowerCase());
}

export function parseParticipantCsv(text: string): ParsedParticipants {
  const errors: ParticipantIssue[] = [];
  const warnings: ParticipantIssue[] = [];
  const rows: ParticipantImportRow[] = [];
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!clean) {
    return { rows, errors: [{ row: 0, message: "Het bestand is leeg." }], warnings };
  }

  const lines = clean.split("\n").filter((line) => line.trim().length > 0);
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader);
  const at = (...names: string[]) => headers.findIndex((header) => names.includes(header));

  const firstName = at("voornaam", "first name");
  const prefix = at("tussenvoegsel", "prefix");
  const lastName = at("achternaam", "last name");
  const phone = at("telefoon", "telefoon 1", "phone");
  const phoneAlt = at("telefoon 2", "phone 2");
  const email = at("email", "e mail", "e-mail");
  const street = at("straat", "street");
  const houseNumber = at("huisnummer", "house number");
  const postalCode = at("postcode", "postal code");
  const city = at("plaats", "city");
  const cards = at("kaarten", "cards");
  const walker = at("rollator", "walker");
  const wheelchair = at("rolstoel", "wheelchair");
  const boarding = at("hulp bij instappen", "hulp instappen", "boarding");
  const notes = at("notitie", "notes");

  if (firstName < 0 || lastName < 0) {
    return {
      rows,
      errors: [{ row: 1, message: "De kopregel mist Voornaam of Achternaam. Gebruik het voorbeeldbestand." }],
      warnings,
    };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const cells = splitLine(lines[i], delimiter);
    const first = (cells[firstName] ?? "").trim();
    const last = (cells[lastName] ?? "").trim();
    const phoneValue = (phone >= 0 ? cells[phone] ?? "" : "").replace(/\D/g, "");
    const emailValue = (email >= 0 ? cells[email] ?? "" : "").trim().toLowerCase();

    if (!first || !last) {
      errors.push({ row: rowNumber, message: "Voornaam en achternaam zijn verplicht." });
      continue;
    }
    if (!phoneValue && !emailValue) {
      errors.push({ row: rowNumber, message: "Vul een telefoonnummer of e-mailadres in." });
      continue;
    }
    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      errors.push({ row: rowNumber, message: `Het e-mailadres “${emailValue}” klopt niet.` });
      continue;
    }
    if (!phoneValue) {
      warnings.push({ row: rowNumber, message: "Geen telefoonnummer; bellen is dan niet mogelijk." });
    }

    rows.push({
      first_name: first,
      last_name_prefix: prefix >= 0 ? (cells[prefix] ?? "").trim() : "",
      last_name: last,
      phone: phoneValue,
      phone_alt: phoneAlt >= 0 ? (cells[phoneAlt] ?? "").replace(/\D/g, "") : "",
      email: emailValue,
      street: street >= 0 ? (cells[street] ?? "").trim() : "",
      house_number: houseNumber >= 0 ? (cells[houseNumber] ?? "").trim() : "",
      postal_code: postalCode >= 0 ? (cells[postalCode] ?? "").trim().toUpperCase() : "",
      city: city >= 0 ? (cells[city] ?? "").trim() || "Almere" : "Almere",
      cards: cards >= 0 ? (cells[cards] ?? "").trim() : "",
      mobility_walker: walker >= 0 ? yes(cells[walker] ?? "") : false,
      mobility_wheelchair: wheelchair >= 0 ? yes(cells[wheelchair] ?? "") : false,
      mobility_help_boarding: boarding >= 0 ? yes(cells[boarding] ?? "") : false,
      notes: notes >= 0 ? (cells[notes] ?? "").trim() : "",
    });
  }

  return { rows, errors, warnings };
}
