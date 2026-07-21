import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type DesaQuizResult = {
  attempt_id: string;
  peserta_name: string;
  quiz_title: string;
  kind: "pre_test" | "post_test" | "standalone";
  project_name: string | null;
  percent: number | null;
  score: number | null;
  max_score: number | null;
  passed: boolean | null;
  submitted_at: string;
};

/**
 * Quiz attempts of peserta belonging to a desa - for the desa_wisata account
 * to monitor its representatives. Peserta↔desa link is via
 * project_memberships.desa_id. Scores only (no per-question answer sheet -
 * that stays personal to each peserta).
 */
export async function listDesaQuizResults(
  desaId: string,
): Promise<DesaQuizResult[]> {
  const admin = createAdminClient();

  // Peserta belonging to this desa.
  const { data: memberships } = await admin
    .from("project_memberships")
    .select("user_id")
    .eq("desa_id", desaId)
    .eq("role", "peserta")
    .eq("status", "active");
  const userIds = Array.from(
    new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((memberships ?? []) as any[]).map((m) => m.user_id).filter(Boolean),
    ),
  );
  if (userIds.length === 0) return [];

  const { data } = await admin
    .from("quiz_attempts")
    .select(
      "id, percent, score, max_score, passed, submitted_at, matched_user:users!quiz_attempts_matched_user_id_fkey(full_name), quiz:quizzes(title, kind, project:projects(name))",
    )
    .in("matched_user_id", userIds)
    .order("submitted_at", { ascending: false })
    .limit(1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((a) => ({
    attempt_id: a.id,
    peserta_name: a.matched_user?.full_name ?? "Peserta",
    quiz_title: a.quiz?.title ?? "Kuis",
    kind: a.quiz?.kind ?? "standalone",
    project_name: a.quiz?.project?.name ?? null,
    percent: a.percent,
    score: a.score,
    max_score: a.max_score,
    passed: a.passed,
    submitted_at: a.submitted_at,
  }));
}
