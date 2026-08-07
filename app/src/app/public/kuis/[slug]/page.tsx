import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicQuiz } from "@/server/queries/quiz-public";
import { getRegistrationIdentity } from "@/server/queries/quiz-registrations";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { QuizTaker } from "./quiz-taker";
import { RegistrationForm } from "./registration-form";

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
  searchParams,
}: {
  params: { slug: string };
  searchParams: { reg?: string };
}) {
  const quiz = await getPublicQuiz(params.slug, Date.now());
  if (!quiz) notFound();

  // If the taker is already logged in, attribute the attempt directly to their
  // account (identity locked from session, not typed in).
  const user = await getCurrentUser();
  let knownIdentity = user
    ? { name: user.full_name, email: user.email ?? "" }
    : null;

  // Alur pendaftaran (pre-test): kuis meminta data diri dan taker belum login.
  if (quiz.collect_registration && !user) {
    if (searchParams.reg) {
      const identity = await getRegistrationIdentity(
        searchParams.reg,
        params.slug,
      );
      if (identity) knownIdentity = identity;
    }
    if (!knownIdentity) {
      const admin = createAdminClient();
      const { data: pd } = await admin
        .from("project_desa")
        .select("desa:desa(id, name)")
        .eq("project_id", quiz.project_id);
      const desaOptions = ((pd ?? []) as unknown as Array<{
        desa: { id: string; name: string } | null;
      }>)
        .map((r) => r.desa)
        .filter((d): d is { id: string; name: string } => !!d)
        .sort((a, b) => a.name.localeCompare(b.name));

      return (
        <main className="min-h-screen bg-atr-bg-soft py-8 px-4">
          <div className="mx-auto w-full max-w-2xl">
            <RegistrationForm
              slug={params.slug}
              quizTitle={quiz.title}
              desaOptions={desaOptions}
            />
            <p className="mt-6 text-center text-[11px] text-atr-fg-muted">
              Didukung oleh Village Milestone Tracker by Atourin
            </p>
          </div>
        </main>
      );
    }
  }

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
