import { run } from "./db";
import type { SessionUser } from "./auth";

type AuditActor = {
  id: string;
  name: string;
  role?: string;
  roleName?: string;
};

type AuditInput = {
  actor: SessionUser | AuditActor;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
};

export function writeAudit({
  actor,
  action,
  entityType,
  entityId = "",
  summary,
  before,
  after,
}: AuditInput): void {
  const role =
    "roleName" in actor && actor.roleName
      ? actor.roleName
      : "role" in actor && actor.role
        ? actor.role
        : "";
  run(
    `INSERT INTO audit_log
       (at, actor_id, actor_name, actor_role, action, entity_type, entity_id, summary, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    new Date().toISOString(),
    actor.id,
    actor.name,
    role,
    action,
    entityType,
    entityId,
    summary,
    before === undefined ? null : JSON.stringify(before),
    after === undefined ? null : JSON.stringify(after),
  );
}
