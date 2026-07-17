"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { bridgeAttemptToTestResult } from "@/lib/quiz/bridge";

type Ok<T = object> = { ok: true } & T;
type Err = { error: string };

// =====================================================
// Ownership guard: superadmin, or mitra_admin scoped to the project's org.
// Returns the actor + project row when allowed.
// =====================================================
async function assertProjectAccess(
  projectId: string,
): Promise<{ actor: { id: string; global_role: string } } | Err> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };
  const admin = createAdminClient();
  const { data: proj } = await admin
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!proj) return { error: "Project tidak ditemukan" };
  if (actor.global_role === "mitra_admin") {
    const orgId = (proj as { organization_id: string | null }).organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda" };
  }
  return { actor: { id: actor.id, global_role: actor.global_role } };
}

// Resolve project_id from a quiz id, then run the project access guard.
async function assertQuizAccess(
  quizId: string,
): Promise<{ actor: { id: string; global_role: string }; projectId: string } | Err> {
  const admin = createAdminClient();
  const { data: quiz } = await admin
    .from("quizzes")
    .select("project_id")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) return { error: "Kuis tidak ditemukan" };
  const projectId = (quiz as { project_id: string }).project_id;
  const access = await assertProjectAccess(projectId);
  if ("error" in access) return access;
  return { actor: access.actor, projectId };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/atourin/projects/${projectId}`);
  revalidatePath(`/mitra/projects/${projectId}`);
}

// =====================================================
// Quiz meta CRUD
// =====================================================
const createSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(2).max(200),
});

export async function createQuiz(
  input: z.input<typeof createSchema>,
): Promise<Ok<{ id: string }> | Err> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const access = await assertProjectAccess(parsed.data.project_id);
  if ("error" in access) return access;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quizzes")
    .insert({
      project_id: parsed.data.project_id,
      title: parsed.data.title.trim(),
      created_by: access.actor.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Gagal buat kuis" };
  revalidateProject(parsed.data.project_id);
  return { ok: true, id: (data as { id: string }).id };
}

const updateMetaSchema = z.object({
  quiz_id: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  kind: z.enum(["pre_test", "post_test", "standalone"]),
  topik_id: z.string().uuid().optional().nullable(),
  time_limit_seconds: z.number().int().min(0).max(86400).optional().nullable(),
  passing_score: z.number().min(0).max(100).optional().nullable(),
  shuffle_questions: z.boolean().optional(),
  max_attempts: z.number().int().min(0).max(100).optional(),
  opens_at: z.string().optional().nullable(),
  closes_at: z.string().optional().nullable(),
});

export async function updateQuizMeta(
  input: z.input<typeof updateMetaSchema>,
): Promise<Ok | Err> {
  const parsed = updateMetaSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const access = await assertQuizAccess(parsed.data.quiz_id);
  if ("error" in access) return access;
  const admin = createAdminClient();
  const { error } = await admin
    .from("quizzes")
    .update({
      title: parsed.data.title.trim(),
      description: parsed.data.description ?? null,
      kind: parsed.data.kind,
      topik_id: parsed.data.topik_id ?? null,
      time_limit_seconds: parsed.data.time_limit_seconds || null,
      passing_score: parsed.data.passing_score ?? null,
      shuffle_questions: parsed.data.shuffle_questions ?? false,
      max_attempts: parsed.data.max_attempts ?? 1,
      opens_at: parsed.data.opens_at || null,
      closes_at: parsed.data.closes_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.quiz_id);
  if (error) return { error: error.message };
  revalidateProject(access.projectId);
  return { ok: true };
}

export async function deleteQuiz(quizId: string): Promise<Ok | Err> {
  const access = await assertQuizAccess(quizId);
  if ("error" in access) return access;
  const admin = createAdminClient();
  const { error } = await admin.from("quizzes").delete().eq("id", quizId);
  if (error) return { error: error.message };
  revalidateProject(access.projectId);
  return { ok: true };
}

// =====================================================
// Publish toggle — generates a CSPRNG slug on first publish.
// =====================================================
export async function togglePublishQuiz(
  quizId: string,
  publish: boolean,
): Promise<Ok<{ slug: string | null }> | Err> {
  const access = await assertQuizAccess(quizId);
  if ("error" in access) return access;
  const admin = createAdminClient();

  // Require at least one question before publishing.
  if (publish) {
    const { count } = await admin
      .from("quiz_questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId);
    if (!count || count < 1)
      return { error: "Tambahkan minimal 1 soal sebelum publish" };
  }

  const { data: existing } = await admin
    .from("quizzes")
    .select("public_slug")
    .eq("id", quizId)
    .maybeSingle();
  let slug =
    (existing as { public_slug: string | null } | null)?.public_slug ?? null;
  if (publish && !slug) {
    slug = randomBytes(12).toString("base64url");
    const dup = await admin
      .from("quizzes")
      .select("id")
      .eq("public_slug", slug)
      .maybeSingle();
    if (dup.data) slug = randomBytes(12).toString("base64url");
  }

  const { error } = await admin
    .from("quizzes")
    .update({ is_published: publish, public_slug: slug })
    .eq("id", quizId);
  if (error) return { error: error.message };
  revalidateProject(access.projectId);
  return { ok: true, slug };
}

// =====================================================
// Question + options upsert (options replaced wholesale on save)
// =====================================================
const optionSchema = z.object({
  label: z.string().min(1).max(500),
  is_correct: z.boolean(),
});
const upsertQuestionSchema = z.object({
  quiz_id: z.string().uuid(),
  question_id: z.string().uuid().optional().nullable(),
  prompt: z.string().min(1).max(2000),
  question_type: z.enum(["single_choice", "true_false"]),
  points: z.number().min(0).max(1000).default(1),
  options: z.array(optionSchema).min(2).max(8),
});

export async function upsertQuestion(
  input: z.input<typeof upsertQuestionSchema>,
): Promise<Ok<{ question_id: string }> | Err> {
  const parsed = upsertQuestionSchema.safeParse(input);
  if (!parsed.success) return { error: "Input soal tidak valid" };
  const d = parsed.data;
  if (!d.options.some((o) => o.is_correct))
    return { error: "Tandai minimal satu jawaban benar" };
  if (d.question_type === "true_false" && d.options.length !== 2)
    return { error: "Benar/Salah harus punya tepat 2 opsi" };

  const access = await assertQuizAccess(d.quiz_id);
  if ("error" in access) return access;
  const admin = createAdminClient();

  let questionId = d.question_id ?? null;
  if (questionId) {
    const { error } = await admin
      .from("quiz_questions")
      .update({ prompt: d.prompt.trim(), question_type: d.question_type, points: d.points })
      .eq("id", questionId)
      .eq("quiz_id", d.quiz_id);
    if (error) return { error: error.message };
    await admin.from("quiz_options").delete().eq("question_id", questionId);
  } else {
    // Append to the end.
    const { count } = await admin
      .from("quiz_questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", d.quiz_id);
    const { data, error } = await admin
      .from("quiz_questions")
      .insert({
        quiz_id: d.quiz_id,
        prompt: d.prompt.trim(),
        question_type: d.question_type,
        points: d.points,
        sort_order: count ?? 0,
      })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Gagal simpan soal" };
    questionId = (data as { id: string }).id;
  }

  const rows = d.options.map((o, i) => ({
    question_id: questionId,
    label: o.label.trim(),
    is_correct: o.is_correct,
    sort_order: i,
  }));
  const { error: optErr } = await admin.from("quiz_options").insert(rows);
  if (optErr) return { error: optErr.message };

  revalidateProject(access.projectId);
  return { ok: true, question_id: questionId! };
}

export async function deleteQuestion(questionId: string): Promise<Ok | Err> {
  const admin = createAdminClient();
  const { data: q } = await admin
    .from("quiz_questions")
    .select("quiz_id")
    .eq("id", questionId)
    .maybeSingle();
  if (!q) return { error: "Soal tidak ditemukan" };
  const access = await assertQuizAccess((q as { quiz_id: string }).quiz_id);
  if ("error" in access) return access;
  const { error } = await admin
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);
  if (error) return { error: error.message };
  revalidateProject(access.projectId);
  return { ok: true };
}

const reorderSchema = z.object({
  quiz_id: z.string().uuid(),
  ordered_ids: z.array(z.string().uuid()),
});

export async function reorderQuestions(
  input: z.input<typeof reorderSchema>,
): Promise<Ok | Err> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const access = await assertQuizAccess(parsed.data.quiz_id);
  if ("error" in access) return access;
  const admin = createAdminClient();
  await Promise.all(
    parsed.data.ordered_ids.map((id, i) =>
      admin
        .from("quiz_questions")
        .update({ sort_order: i })
        .eq("id", id)
        .eq("quiz_id", parsed.data.quiz_id),
    ),
  );
  revalidateProject(access.projectId);
  return { ok: true };
}

// =====================================================
// Manual match resolution — assign a quiz attempt to a project member
// (or clear the match). Used from the results view for
// unmatched/ambiguous rows.
// =====================================================
export async function resolveAttemptMatch(
  attemptId: string,
  userId: string | null,
): Promise<Ok | Err> {
  const admin = createAdminClient();
  const { data: att } = await admin
    .from("quiz_attempts")
    .select("id, quiz:quizzes(id, project_id)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!att) return { error: "Attempt tidak ditemukan" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quiz = (att as any).quiz;
  if (!quiz) return { error: "Kuis tidak ditemukan" };
  const access = await assertProjectAccess(quiz.project_id);
  if ("error" in access) return access;

  let membershipId: string | null = null;
  if (userId) {
    const { data: m } = await admin
      .from("project_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("project_id", quiz.project_id)
      .eq("status", "active")
      .maybeSingle();
    membershipId = (m as { id: string } | null)?.id ?? null;
  }

  const { error } = await admin
    .from("quiz_attempts")
    .update({
      matched_user_id: userId,
      matched_status: userId ? "matched" : "unmatched",
      matched_membership_id: membershipId,
    })
    .eq("id", attemptId);
  if (error) return { error: error.message };
  await bridgeAttemptToTestResult(attemptId);
  revalidateProject(quiz.project_id);
  return { ok: true };
}
