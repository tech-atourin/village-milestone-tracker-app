"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getQuizFull, type QuizFull } from "@/server/queries/quizzes";

/**
 * Server action wrapper so the client Kuis tab can lazily load a quiz's full
 * authoring payload (with correct-answer flags). Access-guarded to superadmin
 * or the mitra_admin that owns the project's org.
 */
export async function getQuizFullClient(
  quizId: string,
): Promise<QuizFull | null> {
  const actor = await getCurrentUser();
  if (!actor) return null;
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return null;

  const admin = createAdminClient();
  const { data: quiz } = await admin
    .from("quizzes")
    .select("project_id, projects(organization_id)")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) return null;
  if (actor.global_role === "mitra_admin") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgId = (quiz as any).projects?.organization_id as string | null;
    if (!orgId || orgId !== actor.organization_id) return null;
  }
  return getQuizFull(quizId);
}
