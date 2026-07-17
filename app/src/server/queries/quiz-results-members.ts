import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import type { MemberOption } from "@/app/atourin/projects/[id]/kuis/[quizId]/hasil/quiz-results-view";

/**
 * Active members of a project (peserta + narasumber) for the manual
 * quiz-attempt match dropdown.
 */
export async function listProjectMemberOptions(
  projectId: string,
): Promise<MemberOption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_memberships")
    .select("user:users!project_memberships_user_id_fkey(id, full_name, email)")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  const seen = new Set<string>();
  const out: MemberOption[] = [];
  for (const r of rows) {
    const u = r.user;
    if (!u?.id || seen.has(u.id)) continue;
    seen.add(u.id);
    out.push({ id: u.id, name: u.full_name ?? "-", email: u.email ?? null });
  }
  return out;
}
