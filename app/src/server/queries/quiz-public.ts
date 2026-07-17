import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

// Public-safe shapes — NEVER include is_correct.
export type PublicQuizOption = { id: string; label: string };
export type PublicQuizQuestion = {
  id: string;
  prompt: string;
  question_type: "single_choice" | "true_false";
  points: number;
  options: PublicQuizOption[];
};
export type PublicQuizWindow = "open" | "not_yet" | "closed";
export type PublicQuizBranding = {
  org_name: string | null;
  org_logo_url: string | null;
  extra_logos: { label: string; signed_url: string }[];
};
export type PublicQuiz = {
  id: string;
  title: string;
  description: string | null;
  time_limit_seconds: number | null;
  passing_score: number | null;
  max_attempts: number;
  shuffle_questions: boolean;
  window: PublicQuizWindow;
  question_count: number;
  total_points: number;
  questions: PublicQuizQuestion[];
  branding: PublicQuizBranding;
};

function computeWindow(
  opensAt: string | null,
  closesAt: string | null,
  now: number,
): PublicQuizWindow {
  if (opensAt && now < new Date(opensAt).getTime()) return "not_yet";
  if (closesAt && now > new Date(closesAt).getTime()) return "closed";
  return "open";
}

/**
 * Fetch a published quiz by public slug for an anonymous taker. Options are
 * stripped of the is_correct flag. Returns null if slug unknown or unpublished.
 * `now` is passed in (never call Date.now here so callers control clock).
 */
export async function getPublicQuiz(
  slug: string,
  now: number,
): Promise<PublicQuiz | null> {
  const admin = createAdminClient();
  const { data: quiz } = await admin
    .from("quizzes")
    .select(
      "id, title, description, time_limit_seconds, passing_score, max_attempts, shuffle_questions, is_published, opens_at, closes_at, project:projects(extra_logos, organization:organizations(name, logo_url))",
    )
    .eq("public_slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!quiz) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = quiz as any;

  // Branding: org logo (direct URL) + extra project logos (signed, 7 days).
  const org = q.project?.organization ?? null;
  const extraRaw = (q.project?.extra_logos ?? []) as Array<{
    path: string;
    label: string;
  }>;
  const extra_logos = (
    await Promise.all(
      extraRaw.map(async (l) => {
        const { data: signed } = await admin.storage
          .from("vmt-evidence")
          .createSignedUrl(l.path, 60 * 60 * 24 * 7);
        return { label: l.label, signed_url: signed?.signedUrl ?? "" };
      }),
    )
  ).filter((l) => l.signed_url);
  const branding: PublicQuizBranding = {
    org_name: org?.name ?? null,
    org_logo_url: org?.logo_url ?? null,
    extra_logos,
  };

  const { data: questions } = await admin
    .from("quiz_questions")
    .select(
      "id, prompt, question_type, points, sort_order, options:quiz_options(id, label, sort_order)",
    )
    .eq("quiz_id", q.id)
    .order("sort_order", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped: PublicQuizQuestion[] = ((questions ?? []) as any[]).map((qq) => ({
    id: qq.id,
    prompt: qq.prompt,
    question_type: qq.question_type,
    points: Number(qq.points ?? 1),
    options: ((qq.options ?? []) as Array<{ id: string; label: string; sort_order: number }>)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((o) => ({ id: o.id, label: o.label })),
  }));

  const totalPoints = mapped.reduce((s, x) => s + x.points, 0);

  return {
    id: q.id,
    title: q.title,
    description: q.description ?? null,
    time_limit_seconds: q.time_limit_seconds ?? null,
    passing_score: q.passing_score ?? null,
    max_attempts: q.max_attempts ?? 1,
    shuffle_questions: q.shuffle_questions ?? false,
    window: computeWindow(q.opens_at ?? null, q.closes_at ?? null, now),
    question_count: mapped.length,
    total_points: totalPoints,
    questions: mapped,
    branding,
  };
}
