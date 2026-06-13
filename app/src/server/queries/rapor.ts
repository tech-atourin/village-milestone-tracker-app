import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RaporRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  desa_name: string | null;
  pre_test_score: number | null;
  post_test_score: number | null;
  attendance: number | null;
  improvement_percent: number | null;
  has_rapor: boolean;
};

export async function listProjectRapor(projectId: string): Promise<RaporRow[]> {
  const supabase = createClient();

  const { data: members } = await supabase
    .from("project_memberships")
    .select(
      "user_id, user:users(id, full_name, email), desa:desa(name)",
    )
    .eq("project_id", projectId)
    .eq("role", "peserta")
    .eq("status", "active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberRows = ((members ?? []) as any[]).map((r) => ({
    user_id: r.user_id as string,
    full_name: r.user?.full_name ?? "—",
    email: r.user?.email ?? null,
    desa_name: r.desa?.name ?? null,
  }));

  if (memberRows.length === 0) return [];

  const { data: rapors } = await supabase
    .from("rapor_peserta")
    .select(
      "user_id, pre_test_score, post_test_score, attendance, improvement_percent",
    )
    .eq("project_id", projectId)
    .in(
      "user_id",
      memberRows.map((m) => m.user_id),
    );

  const raporMap = new Map<
    string,
    {
      pre_test_score: number | null;
      post_test_score: number | null;
      attendance: number | null;
      improvement_percent: number | null;
    }
  >();
  for (const r of (rapors ?? []) as Array<{
    user_id: string;
    pre_test_score: number | null;
    post_test_score: number | null;
    attendance: number | null;
    improvement_percent: number | null;
  }>) {
    raporMap.set(r.user_id, r);
  }

  return memberRows.map((m) => {
    const r = raporMap.get(m.user_id);
    return {
      ...m,
      pre_test_score: r?.pre_test_score ?? null,
      post_test_score: r?.post_test_score ?? null,
      attendance: r?.attendance ?? null,
      improvement_percent: r?.improvement_percent ?? null,
      has_rapor: !!r,
    };
  });
}
