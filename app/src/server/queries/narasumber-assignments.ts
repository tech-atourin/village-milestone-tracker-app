import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import type { NarasumberAssignment } from "@/app/atourin/projects/[id]/narasumber-tab";

/**
 * Build the per-project narasumber roster:
 * - Anyone with a project_memberships row as `narasumber`
 * - PLUS anyone who runs a session for the project (so seeded narasumber
 *   without a membership row still appear).
 *
 * For each narasumber we aggregate: list of desa they actually mentor
 * (derived from sessions), session count, and avg/count of kuisioner
 * ratings scoped to this project.
 *
 * Admin client because peserta-scope and mitra-scope can't read other users
 * under RLS, and this view is rendered by Atourin/Mitra after their own
 * ownership guard.
 */
export async function loadNarasumberAssignments(
  projectId: string,
): Promise<NarasumberAssignment[]> {
  const supabase = createAdminClient();

  const [{ data: memberships }, { data: sessions }, { data: ratings }] =
    await Promise.all([
      supabase
        .from("project_memberships")
        .select(
          "id, user:users!project_memberships_user_id_fkey(id, full_name, email)",
        )
        .eq("project_id", projectId)
        .eq("role", "narasumber")
        .eq("status", "active"),
      supabase
        .from("pendampingan_sessions")
        .select(
          "narasumber_id, project_desa_id, narasumber:users!pendampingan_sessions_narasumber_id_fkey(id, full_name, email), project_desa:project_desa(id, desa:desa(id, name))",
        )
        .eq("project_id", projectId),
      supabase
        .from("narasumber_ratings")
        .select("narasumber_id, rating")
        .eq("project_id", projectId),
    ]);

  type Bucket = {
    user: { id: string; full_name: string; email: string | null };
    membership_id: string | null;
    desa: Map<string, string>;
    sessions_count: number;
    rating_sum: number;
    rating_count: number;
  };
  const byId = new Map<string, Bucket>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (memberships ?? []) as any[]) {
    if (!m.user?.id) continue;
    byId.set(m.user.id, {
      user: {
        id: m.user.id,
        full_name: m.user.full_name,
        email: m.user.email ?? null,
      },
      membership_id: m.id,
      desa: new Map(),
      sessions_count: 0,
      rating_sum: 0,
      rating_count: 0,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (sessions ?? []) as any[]) {
    const id = s.narasumber_id as string | null;
    if (!id) continue;
    const cur =
      byId.get(id) ??
      ({
        user: {
          id,
          full_name: s.narasumber?.full_name ?? "Narasumber",
          email: s.narasumber?.email ?? null,
        },
        membership_id: null,
        desa: new Map<string, string>(),
        sessions_count: 0,
        rating_sum: 0,
        rating_count: 0,
      } as Bucket);
    cur.sessions_count += 1;
    const desaId: string | undefined = s.project_desa?.desa?.id;
    const desaName: string | undefined = s.project_desa?.desa?.name;
    if (desaId && desaName) cur.desa.set(desaId, desaName);
    byId.set(id, cur);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (ratings ?? []) as any[]) {
    const id = r.narasumber_id as string;
    const cur = byId.get(id);
    if (!cur) continue;
    cur.rating_sum += r.rating;
    cur.rating_count += 1;
  }

  return Array.from(byId.values())
    .map((b) => ({
      membership_id: b.membership_id,
      user: b.user,
      desa: Array.from(b.desa.entries()).map(([id, name]) => ({ id, name })),
      sessions_count: b.sessions_count,
      avg_rating: b.rating_count > 0 ? b.rating_sum / b.rating_count : null,
      rating_count: b.rating_count,
    }))
    .sort((a, b) => a.user.full_name.localeCompare(b.user.full_name));
}
