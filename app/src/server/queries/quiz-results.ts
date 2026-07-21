import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type QuizAttemptRow = {
  id: string;
  respondent_name: string;
  respondent_email: string;
  respondent_phone: string | null;
  score: number | null;
  max_score: number | null;
  percent: number | null;
  passed: boolean | null;
  duration_seconds: number | null;
  submitted_at: string;
  matched_status: "matched" | "unmatched" | "ambiguous";
  matched_user_id: string | null;
  matched_user_name: string | null;
};

export type QuizItemAnalysis = {
  question_id: string;
  prompt: string;
  sort_order: number;
  answered: number;
  correct: number;
  correct_rate: number; // 0-100
};

export type QuizResults = {
  quiz: {
    id: string;
    project_id: string;
    title: string;
    kind: string;
    passing_score: number | null;
    is_published: boolean;
    public_slug: string | null;
  };
  attempts: QuizAttemptRow[];
  stats: {
    total: number;
    matched: number;
    unmatched: number;
    ambiguous: number;
    avg_percent: number | null;
    median_percent: number | null;
    pass_rate: number | null; // 0-100, null when no passing_score
    avg_duration_seconds: number | null;
    distribution: { bucket: string; count: number }[]; // 0-20,21-40,...
  };
  item_analysis: QuizItemAnalysis[];
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export async function getQuizResults(
  quizId: string,
): Promise<QuizResults | null> {
  const admin = createAdminClient();
  const { data: quiz } = await admin
    .from("quizzes")
    .select("id, project_id, title, kind, passing_score, is_published, public_slug")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = quiz as any;

  const { data: attemptsData } = await admin
    .from("quiz_attempts")
    .select(
      "id, respondent_name, respondent_email, respondent_phone, score, max_score, percent, passed, duration_seconds, submitted_at, matched_status, matched_user_id, matched:users!quiz_attempts_matched_user_id_fkey(full_name)",
    )
    .eq("quiz_id", quizId)
    .order("submitted_at", { ascending: false })
    .limit(2000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attempts: QuizAttemptRow[] = ((attemptsData ?? []) as any[]).map((a) => ({
    id: a.id,
    respondent_name: a.respondent_name,
    respondent_email: a.respondent_email,
    respondent_phone: a.respondent_phone ?? null,
    score: a.score,
    max_score: a.max_score,
    percent: a.percent,
    passed: a.passed,
    duration_seconds: a.duration_seconds ?? null,
    submitted_at: a.submitted_at,
    matched_status: a.matched_status,
    matched_user_id: a.matched_user_id ?? null,
    matched_user_name: a.matched?.full_name ?? null,
  }));

  const percents = attempts
    .map((a) => a.percent)
    .filter((p): p is number => typeof p === "number");
  const durations = attempts
    .map((a) => a.duration_seconds)
    .filter((d): d is number => typeof d === "number");
  const withPass = attempts.filter((a) => a.passed !== null);

  const distribution = [
    { bucket: "0-20", count: 0 },
    { bucket: "21-40", count: 0 },
    { bucket: "41-60", count: 0 },
    { bucket: "61-80", count: 0 },
    { bucket: "81-100", count: 0 },
  ];
  for (const p of percents) {
    const idx = p <= 20 ? 0 : p <= 40 ? 1 : p <= 60 ? 2 : p <= 80 ? 3 : 4;
    distribution[idx].count++;
  }

  // Item analysis - join questions + their answers across attempts.
  const { data: questions } = await admin
    .from("quiz_questions")
    .select("id, prompt, sort_order")
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qRows = (questions ?? []) as any[];

  const attemptIds = attempts.map((a) => a.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let answers: any[] = [];
  if (attemptIds.length > 0) {
    const { data: ansData } = await admin
      .from("quiz_answers")
      .select("question_id, is_correct")
      .in("attempt_id", attemptIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    answers = (ansData ?? []) as any[];
  }
  const byQ = new Map<string, { answered: number; correct: number }>();
  for (const a of answers) {
    const cur = byQ.get(a.question_id) ?? { answered: 0, correct: 0 };
    cur.answered++;
    if (a.is_correct) cur.correct++;
    byQ.set(a.question_id, cur);
  }
  const item_analysis: QuizItemAnalysis[] = qRows.map((qq) => {
    const agg = byQ.get(qq.id) ?? { answered: 0, correct: 0 };
    return {
      question_id: qq.id,
      prompt: qq.prompt,
      sort_order: qq.sort_order,
      answered: agg.answered,
      correct: agg.correct,
      correct_rate:
        agg.answered > 0 ? Math.round((agg.correct / agg.answered) * 100) : 0,
    };
  });

  return {
    quiz: {
      id: q.id,
      project_id: q.project_id,
      title: q.title,
      kind: q.kind,
      passing_score: q.passing_score ?? null,
      is_published: q.is_published,
      public_slug: q.public_slug ?? null,
    },
    attempts,
    stats: {
      total: attempts.length,
      matched: attempts.filter((a) => a.matched_status === "matched").length,
      unmatched: attempts.filter((a) => a.matched_status === "unmatched").length,
      ambiguous: attempts.filter((a) => a.matched_status === "ambiguous").length,
      avg_percent:
        percents.length > 0
          ? Math.round((percents.reduce((s, x) => s + x, 0) / percents.length) * 10) / 10
          : null,
      median_percent: median(percents),
      pass_rate:
        withPass.length > 0
          ? Math.round(
              (withPass.filter((a) => a.passed).length / withPass.length) * 100,
            )
          : null,
      avg_duration_seconds:
        durations.length > 0
          ? Math.round(durations.reduce((s, x) => s + x, 0) / durations.length)
          : null,
      distribution,
    },
    item_analysis,
  };
}
