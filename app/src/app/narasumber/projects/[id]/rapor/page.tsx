export const metadata = { title: "Rapor Project" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, FileText } from "lucide-react";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { listProjectRapor } from "@/server/queries/rapor";
import { RaporEntryTable } from "@/app/atourin/projects/[id]/rapor/rapor-entry-table";

async function isAssigned(projectId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("project_memberships")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "narasumber")
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export default async function NarasumberRaporIndexPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("narasumber");
  const user = await getCurrentUser();
  if (!user) notFound();
  if (!(await isAssigned(params.id, user.id))) notFound();

  const rows = await listProjectRapor(params.id);

  return (
    <div className="space-y-6">
      <Link
        href={`/narasumber/projects`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Project Saya
      </Link>

      <header className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Rapor per Peserta
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Hasil pre-test, post-test, attendance, dan survey kepuasan per
          peserta. Read-only untuk narasumber.
        </p>
        <div className="flex gap-4 pt-2 text-xs">
          <Link
            href={`/narasumber/projects/${params.id}/rapor-desa`}
            className="font-bold text-atr-purple-600 hover:text-atr-purple"
          >
            Rapor per Desa →
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-6 w-6 text-atr-fg-muted" />
          <p className="text-sm font-bold text-atr-fg">
            Belum ada peserta di project ini
          </p>
        </div>
      ) : (
        <RaporEntryTable
          projectId={params.id}
          rows={rows}
          scope="narasumber"
        />
      )}

      <div className="rounded-2xl border border-atr-outline bg-atr-bg-soft p-4">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-atr-purple" />
          <p className="text-xs text-atr-fg-muted">
            Klik &quot;Lihat&quot; untuk preview halaman rapor.
          </p>
        </div>
      </div>
    </div>
  );
}
