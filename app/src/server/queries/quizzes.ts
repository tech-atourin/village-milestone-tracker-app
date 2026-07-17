import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type QuizKind = "pre_test" | "post_test" | "standalone";
export type QuizQuestionType = "single_choice" | "true_false";

export type QuizListRow = {
  id: string;
  title: string;
  description: string | null;
  kind: QuizKind;
  topik_id: string | null;
  topik_name: string | null;
  is_published: boolean;
  public_slug: string | null;
  time_limit_seconds: number | null;
  passing_score: number | null;
  max_attempts: number;
  opens_at: string | null;
  closes_at: string | null;
  question_count: number;
  attempt_count: number;
  created_at: string;
};

export async function listProjectQuizzes(
  projectId: string,
): Promise<QuizListRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("quizzes")
    .select(
      "id, title, description, kind, topik_id, is_published, public_slug, time_limit_seconds, passing_score, max_attempts, opens_at, closes_at, created_at, topik:project_topik(name), questions:quiz_questions(id), attempts:quiz_attempts(id)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description ?? null,
    kind: q.kind,
    topik_id: q.topik_id ?? null,
    topik_name: q.topik?.name ?? null,
    is_published: q.is_published,
    public_slug: q.public_slug ?? null,
    time_limit_seconds: q.time_limit_seconds ?? null,
    passing_score: q.passing_score ?? null,
    max_attempts: q.max_attempts ?? 1,
    opens_at: q.opens_at ?? null,
    closes_at: q.closes_at ?? null,
    question_count: Array.isArray(q.questions) ? q.questions.length : 0,
    attempt_count: Array.isArray(q.attempts) ? q.attempts.length : 0,
    created_at: q.created_at,
  }));
}

export type QuizOptionFull = {
  id: string;
  label: string;
  is_correct: boolean;
  sort_order: number;
};
export type QuizQuestionFull = {
  id: string;
  prompt: string;
  question_type: QuizQuestionType;
  points: number;
  sort_order: number;
  options: QuizOptionFull[];
};
export type QuizFull = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  kind: QuizKind;
  topik_id: string | null;
  time_limit_seconds: number | null;
  passing_score: number | null;
  shuffle_questions: boolean;
  max_attempts: number;
  opens_at: string | null;
  closes_at: string | null;
  is_published: boolean;
  public_slug: string | null;
  questions: QuizQuestionFull[];
};

/**
 * Full quiz WITH correct-answer flags — admin/authoring only. Never send this
 * shape to a public taker (use the sanitized query in queries/quiz-public.ts).
 */
export async function getQuizFull(quizId: string): Promise<QuizFull | null> {
  const admin = createAdminClient();
  const { data: quiz } = await admin
    .from("quizzes")
    .select(
      "id, project_id, title, description, kind, topik_id, time_limit_seconds, passing_score, shuffle_questions, max_attempts, opens_at, closes_at, is_published, public_slug",
    )
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) return null;

  const { data: questions } = await admin
    .from("quiz_questions")
    .select(
      "id, prompt, question_type, points, sort_order, options:quiz_options(id, label, is_correct, sort_order)",
    )
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = quiz as any;
  return {
    id: q.id,
    project_id: q.project_id,
    title: q.title,
    description: q.description ?? null,
    kind: q.kind,
    topik_id: q.topik_id ?? null,
    time_limit_seconds: q.time_limit_seconds ?? null,
    passing_score: q.passing_score ?? null,
    shuffle_questions: q.shuffle_questions ?? false,
    max_attempts: q.max_attempts ?? 1,
    opens_at: q.opens_at ?? null,
    closes_at: q.closes_at ?? null,
    is_published: q.is_published ?? false,
    public_slug: q.public_slug ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions: ((questions ?? []) as any[]).map((qq) => ({
      id: qq.id,
      prompt: qq.prompt,
      question_type: qq.question_type,
      points: Number(qq.points ?? 1),
      sort_order: qq.sort_order,
      options: ((qq.options ?? []) as QuizOptionFull[])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({
          id: o.id,
          label: o.label,
          is_correct: o.is_correct,
          sort_order: o.sort_order,
        })),
    })),
  };
}
