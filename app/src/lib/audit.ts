import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type AuditAction =
  | "project.created"
  | "project.published"
  | "project.public_toggled"
  | "user.bulk_imported"
  | "member.added"
  | "member.removed"
  | "desa.attached"
  | "checklist.approved"
  | "checklist.rejected"
  | "evidence.uploaded"
  | "baseline.submitted";

export async function audit(opts: {
  actor_id?: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id?: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("audit_log").insert({
      actor_id: opts.actor_id ?? null,
      action: opts.action,
      entity_type: opts.entity_type,
      entity_id: opts.entity_id ?? null,
      before: opts.before ?? null,
      after: opts.after ?? null,
    });
  } catch (e) {
    console.warn("audit() failed:", (e as Error).message);
  }
}
