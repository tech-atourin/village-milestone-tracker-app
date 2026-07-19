import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

/** Set of project_topik_id the user has checked in to, for a project. */
export async function getMyCheckinTopikIds(
  projectId: string,
  userId: string,
): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("topik_check_ins")
    .select("project_topik_id")
    .eq("project_id", projectId)
    .eq("user_id", userId);
  return new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((data ?? []) as any[]).map((r) => r.project_topik_id as string),
  );
}

export type CheckinMatrix = {
  topik: { id: string; name: string; sort_order: number }[];
  rows: {
    user_id: string;
    name: string;
    email: string | null;
    checked: Record<string, string>; // topik_id -> checked_in_at ISO
    checked_count: number;
  }[];
  total_topik: number;
};

/**
 * Attendance matrix for a project: active peserta (rows) × training topik
 * (columns), with each cell marking whether/when the peserta checked in.
 */
export async function getProjectCheckinMatrix(
  projectId: string,
): Promise<CheckinMatrix> {
  const admin = createAdminClient();

  const { data: topikRows } = await admin
    .from("project_topik")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  const topik = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (topikRows ?? []) as any[]
  ).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    sort_order: t.sort_order as number,
  }));

  const { data: members } = await admin
    .from("project_memberships")
    .select(
      "user_id, user:users!project_memberships_user_id_fkey(full_name, email)",
    )
    .eq("project_id", projectId)
    .eq("role", "peserta")
    .eq("status", "active");

  const { data: checkins } = await admin
    .from("topik_check_ins")
    .select("user_id, project_topik_id, checked_in_at")
    .eq("project_id", projectId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byUser = new Map<string, Record<string, string>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (checkins ?? []) as any[]) {
    const m = byUser.get(c.user_id) ?? {};
    m[c.project_topik_id] = c.checked_in_at;
    byUser.set(c.user_id, m);
  }

  const seen = new Set<string>();
  const rows: CheckinMatrix["rows"] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (members ?? []) as any[]) {
    if (!m.user_id || seen.has(m.user_id)) continue;
    seen.add(m.user_id);
    const checked = byUser.get(m.user_id) ?? {};
    rows.push({
      user_id: m.user_id,
      name: m.user?.full_name ?? "-",
      email: m.user?.email ?? null,
      checked,
      checked_count: Object.keys(checked).length,
    });
  }
  rows.sort((a, b) => b.checked_count - a.checked_count || a.name.localeCompare(b.name));

  return { topik, rows, total_topik: topik.length };
}
