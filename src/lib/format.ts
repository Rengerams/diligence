import type { Role } from "./auth";

export function fullName(p: {
  first_name: string;
  last_name_prefix: string;
  last_name: string;
}): string {
  return [p.first_name, p.last_name_prefix, p.last_name].filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateLong(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  return value;
}

export function roleLabel(role: Role | string): string {
  switch (role) {
    case "admin":
      return "Beheerder";
    case "coordinator":
      return "Coördinator";
    case "driver":
      return "Chauffeur";
    default:
      return role;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Actief";
    case "paused":
      return "Gepauzeerd";
    case "stopped":
      return "Gestopt";
    case "planned":
      return "Gepland";
    case "cancelled":
      return "Geannuleerd";
    case "completed":
      return "Afgerond";
    case "assigned":
      return "Ingedeeld";
    case "waitlist":
      return "Reservelijst";
    case "tie":
      return "Gelijke stand";
    default:
      return status;
  }
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
