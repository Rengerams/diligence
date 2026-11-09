export const PERMISSIONS = [
  { key: "participants.view", label: "Deelnemers bekijken" },
  { key: "participants.manage", label: "Deelnemers toevoegen en wijzigen" },
  { key: "groups.manage", label: "Groepjes beheren" },
  { key: "program.view", label: "Programma bekijken" },
  { key: "program.manage", label: "Programma en evenementen beheren" },
  { key: "signups.manage", label: "Opgaven invoeren en wijzigen" },
  { key: "allocation.manage", label: "Indeling maken en bevestigen" },
  { key: "vehicles.view", label: "Voertuigen bekijken" },
  { key: "vehicles.manage", label: "Voertuigen en chauffeurs beheren" },
  { key: "calls.manage", label: "Bellijst afwerken" },
  { key: "messages.manage", label: "E-mailwachtrij beheren" },
  { key: "audit.view", label: "Wijzigingsoverzicht bekijken" },
  { key: "feedback.manage", label: "Feedback van vrijwilligers afhandelen" },
  { key: "users.manage", label: "Gebruikers beheren" },
  { key: "roles.manage", label: "Rollen en rechten beheren" },
  { key: "own.outings", label: "Eigen evenementen en daglijsten bekijken" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export type RoleDefinition = {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
};

export const BUILTIN_ROLES: RoleDefinition[] = [
  {
    key: "admin",
    name: "Admin",
    description: "Beheerder met toegang tot alles, inclusief gebruikers, rollen en modules.",
    permissions: ["*"],
    isSystem: true,
  },
  {
    key: "coordinator",
    name: "Coördinator",
    description: "Dagelijkse bediening: deelnemers, programma, opgave, indeling, bellen en e-mail.",
    permissions: [
      "participants.view",
      "participants.manage",
      "groups.manage",
      "program.view",
      "program.manage",
      "signups.manage",
      "allocation.manage",
      "vehicles.view",
      "vehicles.manage",
      "calls.manage",
      "messages.manage",
      "audit.view",
      "feedback.manage",
    ],
    isSystem: true,
  },
  {
    key: "driver",
    name: "Chauffeur",
    description: "Ziet alleen de eigen evenementen en de bijbehorende daglijst.",
    permissions: ["own.outings"],
    isSystem: true,
  },
  {
    key: "treasurer",
    name: "Penningmeester",
    description: "Voorbereid voor de latere module Chauffeurskosten en Kas.",
    permissions: [],
    isSystem: true,
  },
];

export function can(
  user: { permissions: string[] } | null | undefined,
  permission: PermissionKey | string,
): boolean {
  if (!user) return false;
  return user.permissions.includes("*") || user.permissions.includes(permission);
}

export function canAny(
  user: { permissions: string[] } | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((permission) => can(user, permission));
}

export function permissionLabel(key: string): string {
  return PERMISSIONS.find((permission) => permission.key === key)?.label ?? key;
}

export function parsePermissions(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}
