import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type MyQuizAttempt = {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  kind: "pre_test" | "post_test" | "standalone";
  project_name: string | null;
  score: number | null;
  max_score: number | null;
  percent: number | null;
  passed: boolean | null;
  submitted_at: string;
  can_review: boolean; // true only for post_test
};

/**
 * A peserta's own quiz attempts (matched to their account). Read via admin
 * client with a strict matched_user_id filter so no other respondent's data
 * is exposed.
 */
export async function listMyQuizAttempts(
  userId: string,
): Promise<MyQuizAttempt[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("quiz_attempts")
    .select(
      "id, quiz_id, score, max_score, percent, passed, submitted_at, quiz:quizzes(title, kind, project:projects(name))",
    )
    .eq("matched_user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(200);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((a) => ({
    attempt_id: a.id,
    quiz_id: a.quiz_id,
    quiz_title: a.quiz?.title ?? "Kuis",
    kind: a.quiz?.kind ?? "standalone",
    project_name: a.quiz?.project?.name ?? null,
    score: a.score,
    max_score: a.max_score,
    percent: a.percent,
    passed: a.passed,
    submitted_at: a.submitted_at,
    can_review: a.quiz?.kind === "post_test",
  }));
}

export type MyQuizReview = {
  quiz_title: string;
  percent: number | null;
  passed: boolean | null;
  questions: {
    prompt: string;
    is_correct: boolean;
    options: { label: string; is_correct: boolean; selected: boolean }[];
  }[];
};

/**
 * Per-question review for one of the peserta's own attempts. Discloses correct
 * answers ONLY for post_test (learning aid). Returns null for pre_test /
 * standalone or when the attempt is not owned by this user.
 */
export async function getMyQuizAttemptReview(
  attemptId: string,
  userId: string,
): Promise<MyQuizReview | null> {
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("quiz_attempts")
    .select(
      "id, matched_user_id, percent, passed, quiz:quizzes(id, title, kind)",
    )
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = attempt as any;
  if (a.matched_user_id !== userId) return null;
  if (a.quiz?.kind !== "post_test") return null; // review only for post-test

  const { data: answers } = await admin
    .from("quiz_answers")
    .select("question_id, selected_option_ids, is_correct")
    .eq("attempt_id", attemptId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ansByQ = new Map<string, any>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((answers ?? []) as any[]).map((x) => [x.question_id, x]),
  );

  const { data: questions } = await admin
    .from("quiz_questions")
    .select(
      "id, prompt, sort_order, options:quiz_options(id, label, is_correct, sort_order)",
    )
    .eq("quiz_id", a.quiz.id)
    .order("sort_order", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qs = ((questions ?? []) as any[]).map((q) => {
    const ans = ansByQ.get(q.id);
    const selected = new Set<string>(ans?.selected_option_ids ?? []);
    return {
      prompt: q.prompt,
      is_correct: ans?.is_correct ?? false,
      options: (q.options as Array<{ id: string; label: string; is_correct: boolean; sort_order: number }>)
        .slice()
        .sort((x, y) => x.sort_order - y.sort_order)
        .map((o) => ({
          label: o.label,
          is_correct: o.is_correct,
          selected: selected.has(o.id),
        })),
    };
  });

  return {
    quiz_title: a.quiz?.title ?? "Kuis",
    percent: a.percent,
    passed: a.passed,
    questions: qs,
  };
}
