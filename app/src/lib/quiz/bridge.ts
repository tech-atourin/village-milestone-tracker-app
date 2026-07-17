import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Bridge a quiz attempt into peserta_test_results so pre/post-test quiz scores
 * appear in the peserta's rapor + training pre/post views (same surface as
 * Google-Form-sourced results).
 *
 * Only quizzes with kind pre_test|post_test AND a topik_id produce a bridged
 * row, and only when the attempt is matched to a user. Idempotent: keyed on
 * quiz_attempt_id. When the attempt is unmatched/cleared, the bridged row is
 * removed. Best-effort — never throws.
 */
export async function bridgeAttemptToTestResult(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  try {
    const { data: att } = await admin
      .from("quiz_attempts")
      .select(
        "id, score, max_score, percent, submitted_at, matched_user_id, matched_status, quiz:quizzes(id, kind, topik_id)",
      )
      .eq("id", attemptId)
      .maybeSingle();
    if (!att) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = att as any;
    const quiz = a.quiz;
    const eligible =
      quiz &&
      (quiz.kind === "pre_test" || quiz.kind === "post_test") &&
      quiz.topik_id &&
      a.matched_user_id &&
      a.matched_status === "matched";

    // Remove any stale bridged row first (handles un-match + re-match cleanly).
    await admin
      .from("peserta_test_results")
      .delete()
      .eq("quiz_attempt_id", attemptId);

    if (!eligible) return;

    await admin.from("peserta_test_results").insert({
      project_gform_id: null,
      quiz_attempt_id: attemptId,
      source: "quiz",
      form_type: quiz.kind, // pre_test | post_test → gform_type
      project_topik_id: quiz.topik_id,
      user_id: a.matched_user_id,
      raw_response: {
        source: "quiz",
        quiz_id: quiz.id,
        percent: a.percent,
      },
      score: a.score,
      max_score: a.max_score,
      submitted_at: a.submitted_at,
      matched_status: "matched",
    });
  } catch {
    // best-effort
  }
}
