export const metadata = { title: "Hasil Kuis" };

import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { getQuizResults } from "@/server/queries/quiz-results";
import { listProjectMemberOptions } from "@/server/queries/quiz-results-members";
import { QuizResultsView } from "./quiz-results-view";

export default async function QuizHasilPage({
  params,
}: {
  params: { id: string; quizId: string };
}) {
  await requireRole("superadmin");
  const results = await getQuizResults(params.quizId);
  if (!results || results.quiz.project_id !== params.id) notFound();
  const memberOptions = await listProjectMemberOptions(params.id);
  return (
    <QuizResultsView
      results={results}
      backHref={`/atourin/projects/${params.id}?tab=kuis`}
      memberOptions={memberOptions}
    />
  );
}
