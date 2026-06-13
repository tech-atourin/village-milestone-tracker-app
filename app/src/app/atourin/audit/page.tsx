export const metadata = { title: "Audit Log" };

import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { ShieldCheck } from "lucide-react";
import { AuditTable, type AuditRow } from "./audit-table";
import { AuditDateRange } from "./audit-date-range";

type DbRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

async function fetchAudit(from?: string, to?: string): Promise<AuditRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("audit_log")
    .select(
      "id, actor_id, action, entity_type, entity_id, created_at, before, after",
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  if (from) query = query.gte("created_at", from);
  if (to) {
    // Include the full day
    const end = new Date(to);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString().slice(0, 10));
  }
  const { data } = await query;
  const rows = (data ?? []) as unknown as DbRow[];

  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[]),
  );
  const actorMap = new Map<string, string>();
  if (actorIds.length) {
    const { data: users } = await admin
      .from("users")
      .select("id, full_name")
      .in("id", actorIds);
    for (const u of (users ?? []) as Array<{ id: string; full_name: string }>) {
      actorMap.set(u.id, u.full_name);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    actor_id: r.actor_id,
    actor_name: r.actor_id
      ? actorMap.get(r.actor_id) ?? r.actor_id.slice(0, 8)
      : "system",
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    created_at: r.created_at,
    note: (r.after?.note as string | undefined) ?? "",
  }));
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  await requireRole("superadmin");
  const rows = await fetchAudit(searchParams.from, searchParams.to);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Audit log
        </h1>
        <p className="text-sm text-atr-fg-muted">
          {rows.length} entry. Untuk compliance project pemerintah.
        </p>
      </header>
      <AuditDateRange from={searchParams.from} to={searchParams.to} />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <ShieldCheck className="mx-auto mb-3 h-6 w-6 text-atr-fg-muted" />
          <p className="text-sm font-bold text-atr-fg">
            Belum ada aktivitas tercatat
          </p>
        </div>
      ) : (
        <AuditTable rows={rows} />
      )}
    </div>
  );
}
