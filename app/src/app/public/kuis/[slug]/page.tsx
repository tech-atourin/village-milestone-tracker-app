import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicQuiz } from "@/server/queries/quiz-public";
import { getCurrentUser } from "@/lib/auth/rbac";
import { QuizTaker } from "./quiz-taker";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const quiz = await getPublicQuiz(params.slug, Date.now());
  if (!quiz) return { title: "Kuis" };
  return {
    title: `${quiz.title} - Kuis`,
    description: quiz.description ?? "Ikuti kuis ini.",
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuizPage({
  params,
}: {
  params: { slug: string };
}) {
  const quiz = await getPublicQuiz(params.slug, Date.now());
  if (!quiz) notFound();

  // If the taker is already logged in, attribute the attempt directly to their
  // account (identity locked from session, not typed in).
  const user = await getCurrentUser();
  const knownIdentity = user
    ? { name: user.full_name, email: user.email ?? "" }
    : null;

  return (
    <main className="min-h-screen bg-atr-bg-soft py-8 px-4">
      <div className="mx-auto w-full max-w-2xl">
        <QuizTaker
          quiz={quiz}
          slug={params.slug}
          knownIdentity={knownIdentity}
        />
        <p className="mt-6 text-center text-[11px] text-atr-fg-muted">
          Didukung oleh Village Milestone Tracker by Atourin
        </p>
      </div>
    </main>
  );
}
