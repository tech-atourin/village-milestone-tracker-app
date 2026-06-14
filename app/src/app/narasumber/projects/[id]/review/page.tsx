export const metadata = { title: "Review Bukti Peserta" };

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { listReviewQueue } from "@/server/queries/review";
import { ReviewQueue } from "@/app/atourin/projects/[id]/review-queue";

export default async function NarasumberReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.global_role !== "narasumber") redirect("/dashboard");

  // Confirm membership
  const admin = createAdminClient();
  const { data: m } = await admin
    .from("project_memberships")
    .select("id")
    .eq("project_id", params.id)
    .eq("user_id", user.id)
    .eq("role", "narasumber")
    .eq("status", "active")
    .maybeSingle();
  if (!m) notFound();

  const { data: project } = await admin
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .maybeSingle();
  if (!project) notFound();

  const queue = await listReviewQueue(params.id, "submitted");

  return (
    <div className="space-y-6">
      <Link
        href="/narasumber/projects"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar project
      </Link>

      <header>
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-atr-purple-600">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Review Bukti Peserta
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-atr-fg">
          {(project as { name: string }).name}
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Sebagai narasumber project ini, Anda bisa approve / reject bukti
          checklist yang disubmit peserta. Reviewer juga berlaku untuk admin
          mitra & superadmin.
        </p>
      </header>

      <ReviewQueue projectId={params.id} items={queue} />
    </div>
  );
}
