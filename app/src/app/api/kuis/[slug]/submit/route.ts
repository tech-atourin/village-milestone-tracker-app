import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { rateLimit, ipFromHeaders } from "@/lib/rate-limit";
import { bridgeAttemptToTestResult } from "@/lib/quiz/bridge";

// Anonymous quiz submission. No auth — gated by published slug + window +
// attempt cap + rate limit. Grading happens here (server-side) so correct
// answers never reach the client.

const submitSchema = z.object({
  respondent_name: z.string().min(2).max(120),
  respondent_email: z.string().email().max(200),
  respondent_phone: z.string().max(30).optional().nullable(),
  started_at: z.string().datetime().optional().nullable(),
  // Honeypot: real users never fill this hidden field.
  hp: z.string().optional().nullable(),
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        selected_option_ids: z.array(z.string().uuid()).max(8),
      }),
    )
    .max(200),
});

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit(`quiz-submit:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }
  const d = parsed.data;

  // Honeypot tripped → pretend success without persisting (bot).
  if (d.hp && d.hp.trim().length > 0) {
    return NextResponse.json({ ok: true, spam: true });
  }

  const admin = createAdminClient();
  const now = Date.now();

  // Load quiz (published) + questions + options WITH correct flags.
  const { data: quizRow } = await admin
    .from("quizzes")
    .select(
      "id, kind, is_published, opens_at, closes_at, passing_score, max_attempts",
    )
    .eq("public_slug", params.slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!quizRow) {
    return NextResponse.json({ error: "Kuis tidak ditemukan" }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quiz = quizRow as any;

  // Window enforcement.
  if (quiz.opens_at && now < new Date(quiz.opens_at).getTime())
    return NextResponse.json({ error: "Kuis belum dibuka" }, { status: 403 });
  if (quiz.closes_at && now > new Date(quiz.closes_at).getTime())
    return NextResponse.json({ error: "Kuis sudah ditutup" }, { status: 403 });

  // Attempt cap per email (max_attempts <= 0 = unlimited).
  const email = d.respondent_email.trim().toLowerCase();
  if (quiz.max_attempts && quiz.max_attempts > 0) {
    const { count } = await admin
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quiz.id)
      .eq("respondent_email", email);
    if ((count ?? 0) >= quiz.max_attempts) {
      return NextResponse.json(
        { error: "Anda sudah mencapai batas maksimal pengerjaan kuis ini." },
        { status: 403 },
      );
    }
  }

  const { data: questions } = await admin
    .from("quiz_questions")
    .select(
      "id, prompt, points, sort_order, options:quiz_options(id, label, is_correct, sort_order)",
    )
    .eq("quiz_id", quiz.id)
    .order("sort_order", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qList = (questions ?? []) as any[];

  // Grade.
  const answerByQ = new Map(d.answers.map((a) => [a.question_id, a.selected_option_ids]));
  let score = 0;
  let maxScore = 0;
  const gradedRows: {
    question_id: string;
    selected_option_ids: string[];
    is_correct: boolean;
    points_awarded: number;
  }[] = [];
  for (const q of qList) {
    const pts = Number(q.points ?? 1);
    maxScore += pts;
    const correctIds = (q.options as Array<{ id: string; is_correct: boolean }>)
      .filter((o) => o.is_correct)
      .map((o) => o.id);
    const selected = (answerByQ.get(q.id) ?? []).filter((id: string) =>
      (q.options as Array<{ id: string }>).some((o) => o.id === id),
    );
    const correct = setsEqual(selected, correctIds);
    if (correct) score += pts;
    gradedRows.push({
      question_id: q.id,
      selected_option_ids: selected,
      is_correct: correct,
      points_awarded: correct ? pts : 0,
    });
  }
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  const passed =
    quiz.passing_score != null ? percent >= Number(quiz.passing_score) : null;

  const startedAt = d.started_at ? new Date(d.started_at) : null;
  const durationSeconds = startedAt
    ? Math.max(0, Math.round((now - startedAt.getTime()) / 1000))
    : null;

  // Identity resolution:
  //  1. If the taker is LOGGED IN, attribute the attempt to their account
  //     directly (authoritative — from the session cookie, not client input).
  //  2. Otherwise match by email (exact, lowercase). Unmatched anonymous
  //     attempts auto-link later when an account with that email is created
  //     (reconcile, Fase 4).
  let matchedUserId: string | null = null;
  let matchedStatus: "matched" | "unmatched" | "ambiguous" = "unmatched";
  const sessionUser = await getCurrentUser();
  if (sessionUser) {
    matchedUserId = sessionUser.id;
    matchedStatus = "matched";
  } else {
    const { data: users } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .is("deleted_at", null)
      .limit(2);
    if (users && users.length === 1) {
      matchedUserId = (users[0] as { id: string }).id;
      matchedStatus = "matched";
    } else if (users && users.length > 1) {
      matchedStatus = "ambiguous";
    }
  }

  const ipHash = createHash("sha256").update(`${ip}|vmt-quiz`).digest("hex");

  const { data: attempt, error: attErr } = await admin
    .from("quiz_attempts")
    .insert({
      quiz_id: quiz.id,
      respondent_name: d.respondent_name.trim(),
      respondent_email: email,
      respondent_phone: d.respondent_phone ?? null,
      score,
      max_score: maxScore,
      percent,
      passed,
      started_at: startedAt ? startedAt.toISOString() : null,
      submitted_at: new Date(now).toISOString(),
      duration_seconds: durationSeconds,
      matched_user_id: matchedUserId,
      matched_status: matchedStatus,
      ip_hash: ipHash,
    })
    .select("id")
    .single();
  if (attErr || !attempt) {
    return NextResponse.json(
      { error: attErr?.message ?? "Gagal menyimpan hasil" },
      { status: 500 },
    );
  }
  const attemptId = (attempt as { id: string }).id;

  if (gradedRows.length > 0) {
    await admin.from("quiz_answers").insert(
      gradedRows.map((g) => ({ attempt_id: attemptId, ...g })),
    );
  }

  // Bridge into peserta_test_results when matched + pre/post + topik-linked.
  if (matchedStatus === "matched") {
    await bridgeAttemptToTestResult(attemptId);
  }

  // Answer review is only disclosed for POST-TEST — so peserta can learn which
  // answers were correct. Pre-test / standalone return score only (kunci
  // jawaban tetap tersembunyi agar kuis bisa dipakai ulang).
  let review: unknown = undefined;
  if (quiz.kind === "post_test") {
    review = qList.map((q) => {
      const selected = new Set(answerByQ.get(q.id) ?? []);
      const graded = gradedRows.find((g) => g.question_id === q.id);
      return {
        prompt: q.prompt,
        is_correct: graded?.is_correct ?? false,
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
  }

  return NextResponse.json({
    ok: true,
    attempt_id: attemptId,
    kind: quiz.kind,
    score,
    max_score: maxScore,
    percent,
    passed,
    review,
  });
}
