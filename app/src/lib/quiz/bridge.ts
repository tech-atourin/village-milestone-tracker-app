import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Bridge a quiz attempt into peserta_test_results so pre/post-test quiz scores
 * appear in the peserta's rapor + training pre/post views (same surface as
 * Google-Form-sourced results).
 *
 * Multi-modul: satu kuis pre/post-test bisa berisi soal dari beberapa materi
 * (quiz_questions.topik_id). Nilainya otomatis dipecah per materi: satu baris
 * peserta_test_results per topik. Kalau soal tidak punya topik sendiri, ikut
 * topik kuis (quizzes.topik_id) - jadi kuis satu-modul lama tetap jalan.
 *
 * Hanya kuis kind pre_test|post_test dan attempt yang sudah ter-match ke user.
 * Idempoten: semua baris untuk attempt ini dihapus dulu lalu ditulis ulang.
 * Best-effort - tidak pernah throw.
 */
export async function bridgeAttemptToTestResult(attemptId: string): Promise<void> {
  const admin = createAdminClient();
  try {
    const { data: att } = await admin
      .from("quiz_attempts")
      .select(
        "id, submitted_at, matched_user_id, matched_status, quiz:quizzes(id, kind, topik_id)",
      )
      .eq("id", attemptId)
      .maybeSingle();
    if (!att) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = att as any;
    const quiz = a.quiz;

    // Selalu bersihkan baris lama dulu (rapi saat un-match + re-match).
    await admin
      .from("peserta_test_results")
      .delete()
      .eq("quiz_attempt_id", attemptId);

    const eligible =
      quiz &&
      (quiz.kind === "pre_test" || quiz.kind === "post_test") &&
      a.matched_user_id &&
      a.matched_status === "matched";
    if (!eligible) return;

    // Soal kuis (untuk skor maksimum + topik per soal).
    const { data: qRows } = await admin
      .from("quiz_questions")
      .select("id, points, topik_id")
      .eq("quiz_id", quiz.id);
    const questions = ((qRows ?? []) as Array<{
      id: string;
      points: number | null;
      topik_id: string | null;
    }>);
    if (questions.length === 0) return;

    // Jawaban peserta (poin yang didapat per soal).
    const { data: aRows } = await admin
      .from("quiz_answers")
      .select("question_id, points_awarded")
      .eq("attempt_id", attemptId);
    const awardedByQ = new Map<string, number>();
    for (const r of (aRows ?? []) as Array<{
      question_id: string;
      points_awarded: number | null;
    }>) {
      awardedByQ.set(r.question_id, Number(r.points_awarded ?? 0));
    }

    // Agregasi per topik. Topik efektif = topik soal, fallback ke topik kuis.
    const perTopik = new Map<string, { score: number; max: number }>();
    for (const q of questions) {
      const topik = q.topik_id ?? quiz.topik_id ?? null;
      if (!topik) continue; // tak bisa diatribusikan ke materi manapun
      const bucket = perTopik.get(topik) ?? { score: 0, max: 0 };
      bucket.max += Number(q.points ?? 1);
      bucket.score += awardedByQ.get(q.id) ?? 0;
      perTopik.set(topik, bucket);
    }
    if (perTopik.size === 0) return;

    const rows = Array.from(perTopik.entries())
      .filter(([, v]) => v.max > 0)
      .map(([topik, v]) => ({
        project_gform_id: null,
        quiz_attempt_id: attemptId,
        source: "quiz",
        form_type: quiz.kind, // pre_test | post_test
        project_topik_id: topik,
        user_id: a.matched_user_id,
        raw_response: {
          source: "quiz",
          quiz_id: quiz.id,
          percent:
            v.max > 0 ? Math.round((v.score / v.max) * 10000) / 100 : null,
        },
        score: v.score,
        max_score: v.max,
        submitted_at: a.submitted_at,
        matched_status: "matched",
      }));
    if (rows.length === 0) return;

    await admin.from("peserta_test_results").insert(rows);
  } catch {
    // best-effort
  }
}
