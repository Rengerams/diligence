import { all, get } from "./db";

export type Period = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  deadline: string;
  status: "draft" | "published" | "closed" | "archived";
  default_capacity: number;
  created_at: string;
};

export type Participant = {
  id: string;
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
  contact_preference: "phone" | "email" | "both";
  status: "active" | "paused" | "stopped";
  stopped_on: string | null;
  stop_reason: string | null;
  mobility_walker: number;
  mobility_wheelchair: number;
  mobility_help_boarding: number;
  notes: string;
  emergency_name: string;
  emergency_phone: string;
  cards: string;
  anonymized_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  group_id?: string | null;
  group_name?: string | null;
};

export type Outing = {
  id: string;
  period_id: string;
  series_key: string;
  series_name: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  location_id: string | null;
  category_id: string | null;
  price_cents: number;
  extra_costs: string;
  labels: string;
  capacity: number;
  less_suitable_walkers: number;
  status: "planned" | "cancelled" | "completed";
  created_at: string;
};

export type Vehicle = {
  id: string;
  name: string;
  license_plate: string;
  license_plate_normalized: string;
  seats: number;
  active: number;
  notes: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Run = {
  id: string;
  period_id: string;
  kind: "system" | "manual";
  phase: "proposal" | "confirmed";
  algorithm_version: string;
  input_hash: string;
  created_at: string;
  created_by: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
};

export function getActivePeriod(): Period | undefined {
  return get<Period>(
    "SELECT * FROM periods WHERE status IN ('published', 'closed') ORDER BY start_date DESC LIMIT 1",
  );
}

export function getPeriodById(id: string): Period | undefined {
  return get<Period>("SELECT * FROM periods WHERE id = ?", id);
}

export function getOutings(periodId: string): Outing[] {
  return all<Outing>(
    "SELECT * FROM outings WHERE period_id = ? ORDER BY date, start_time, id",
    periodId,
  );
}

export function getParticipant(id: string): Participant | undefined {
  return get<Participant>(
    `SELECT p.*, gm.group_id, g.name AS group_name
       FROM participants p
       LEFT JOIN group_members gm ON gm.participant_id = p.id AND gm.active = 1
       LEFT JOIN "groups" g ON g.id = gm.group_id
      WHERE p.id = ?`,
    id,
  );
}

export function getParticipantGroup(participantId: string): { id: string; name: string } | undefined {
  return get<{ id: string; name: string }>(
    `SELECT g.id, g.name
       FROM group_members gm
       JOIN "groups" g ON g.id = gm.group_id
      WHERE gm.participant_id = ? AND gm.active = 1`,
    participantId,
  );
}

export function getLatestRun(periodId: string): Run | undefined {
  return get<Run>(
    "SELECT * FROM allocation_runs WHERE period_id = ? AND kind = 'system' ORDER BY created_at DESC, rowid DESC LIMIT 1",
    periodId,
  );
}

export function getLatestManualRun(periodId: string): Run | undefined {
  return get<Run>(
    "SELECT * FROM allocation_runs WHERE period_id = ? AND kind = 'manual' ORDER BY created_at DESC, rowid DESC LIMIT 1",
    periodId,
  );
}

export function getLatestConfirmedRun(periodId: string): Run | undefined {
  return get<Run>(
    "SELECT * FROM allocation_runs WHERE period_id = ? AND phase = 'confirmed' ORDER BY confirmed_at DESC, rowid DESC LIMIT 1",
    periodId,
  );
}

export function getVehicles(includeInactive = true): Vehicle[] {
  return all<Vehicle>(
    `SELECT * FROM vehicles ${includeInactive ? "" : "WHERE active = 1 AND archived_at IS NULL"} ORDER BY name`,
  );
}
