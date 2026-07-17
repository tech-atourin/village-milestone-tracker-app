export const metadata = { title: "Hasil Kuis" };

import { notFound } from "next/navigation";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { getQuizResults } from "@/server/queries/quiz-results";
import { listProjectMemberOptions } from "@/server/queries/quiz-results-members";
import { QuizResultsView } from "@/app/atourin/projects/[id]/kuis/[quizId]/hasil/quiz-results-view";

export default async function MitraQuizHasilPage({
  params,
}: {
  params: { id: string; quizId: string };
}) {
  await requireRole("mitra_admin");
  const user = await getCurrentUser();
  const results = await getQuizResults(params.quizId);
  if (!results || results.quiz.project_id !== params.id || !user) notFound();

  // Ownership: project must belong to the mitra's org.
  const admin = createAdminClient();
  const { data: proj } = await admin
    .from("projects")
    .select("organization_id")
    .eq("id", params.id)
    .maybeSingle();
  const orgId = (proj as { organization_id: string | null } | null)?.organization_id;
  if (!orgId || orgId !== user.organization_id) notFound();

  const memberOptions = await listProjectMemberOptions(params.id);
  return (
    <QuizResultsView
      results={results}
      backHref={`/mitra/projects/${params.id}?tab=kuis`}
      memberOptions={memberOptions}
    />
  );
}
