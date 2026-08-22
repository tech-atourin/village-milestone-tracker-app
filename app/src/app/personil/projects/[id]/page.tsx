export const metadata = { title: "Detail Project" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { getProject } from "@/server/queries/projects";
import { listProjectDesa } from "@/server/queries/desa";
import { listProjectTopikWithItems } from "@/server/queries/topik";
import { createAdminClient } from "@/lib/supabase/server";
import { isPersonnelOnProject } from "@/server/queries/personnel";
import { isModuleOn } from "@/lib/modules";
import type { ProjectMemberRow } from "@/server/queries/memberships";
import { OverviewTab } from "@/app/atourin/projects/[id]/overview-tab";
import { TopikTab } from "@/app/atourin/projects/[id]/topik-tab";
import { PesertaTab } from "@/app/atourin/projects/[id]/peserta-tab";
import { NarasumberTab } from "@/app/atourin/projects/[id]/narasumber-tab";
import { KehadiranTab } from "@/app/atourin/projects/[id]/kehadiran-tab";
import { EvidenceTab } from "@/app/atourin/projects/[id]/evidence-tab";
import { MateriTab } from "@/app/atourin/projects/[id]/materi-tab";
import { loadNarasumberAssignments } from "@/server/queries/narasumber-assignments";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-atr-bg-soft text-atr-fg-muted",
  active: "bg-atr-arti/15 text-atr-arti",
  completed: "bg-atr-purple-light/50 text-atr-purple-600",
  archived: "bg-atr-bg-soft text-atr-fg-muted",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Aktif",
  completed: "Selesai",
  archived: "Arsip",
};

// Fasilitator melihat detail project secara read-only (transparan). Tab
// pengaturan/aksi admin sengaja tidak ditampilkan.
const ALL_TABS = [
  { key: "overview", label: "Ringkasan" },
  { key: "topik", label: "Topik", moduleKey: "topik_pendampingan" },
  { key: "peserta", label: "Peserta" },
  { key: "narasumber", label: "Narasumber", moduleKey: "narasumber" },
  { key: "kehadiran", label: "Kehadiran", moduleKey: "kehadiran" },
  { key: "evidence", label: "Bukti", moduleKey: "evidence" },
  { key: "materi", label: "Materi & Tautan", moduleKey: "materi" },
] as const;

function fmt(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function PersonilProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; topik?: string; desa?: string };
}) {
  await requireRole("personil");
  // Akses: fasilitator hanya boleh membuka project tempat ia ditugaskan.
  const allowed = await isPersonnelOnProject(params.id);
  if (!allowed) notFound();

  const project = await getProject(params.id, { asAdmin: true });
  if (!project) notFound();

  const activeTab = searchParams.tab ?? "overview";
  const isDesaBased = project.program_type === "desa_based";
  const TABS = ALL_TABS.filter((t) => {
    if ("moduleKey" in t && t.moduleKey) {
      return isModuleOn(project.enabled_modules, t.moduleKey);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Link
        href="/personil/projects"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar project
      </Link>

      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            {project.name}
          </h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[project.status]}`}
          >
            {STATUS_LABEL[project.status] ?? project.status}
          </span>
        </div>
        <div className="text-sm text-atr-fg-muted">
          {project.organization?.name ? `${project.organization.name} · ` : ""}
          {fmt(project.period_start)} sampai {fmt(project.period_end)}
        </div>
      </header>

      <nav className="border-b border-atr-outline">
        <ul className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <li key={t.key}>
                <Link
                  href={`/personil/projects/${project.id}?tab=${t.key}`}
                  className={`inline-block border-b-2 px-1 py-3 text-sm font-bold transition ${
                    isActive
                      ? "border-atr-purple text-atr-purple-600"
                      : "border-transparent text-atr-fg-muted hover:text-atr-fg"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {activeTab === "overview" && (
        <OverviewTab
          project={project}
          projectId={project.id}
          isDesaBased={isDesaBased}
        />
      )}
      {activeTab === "topik" && <TopikTabLoader projectId={project.id} />}
      {activeTab === "peserta" && (
        <PesertaTabLoader
          projectId={project.id}
          programType={project.program_type}
        />
      )}
      {activeTab === "narasumber" && (
        <NarasumberTabLoader projectId={project.id} />
      )}
      {activeTab === "kehadiran" && (
        <KehadiranTab projectId={project.id} readOnly />
      )}
      {activeTab === "evidence" && (
        <EvidenceTab
          projectId={project.id}
          filterTopikId={searchParams.topik}
          filterDesaId={searchParams.desa}
          readOnly
        />
      )}
      {activeTab === "materi" && (
        <MateriTab projectId={project.id} readOnly />
      )}
    </div>
  );
}

async function TopikTabLoader({ projectId }: { projectId: string }) {
  const topik = await listProjectTopikWithItems(projectId, { asAdmin: true });
  // editable=false: fasilitator hanya melihat, tidak mengubah checklist.
  return <TopikTab projectId={projectId} topik={topik} editable={false} templates={[]} />;
}

async function PesertaTabLoader({
  projectId,
  programType,
}: {
  projectId: string;
  programType: "desa_based" | "pelaku_pariwisata";
}) {
  const admin = createAdminClient();
  const [{ data: memberData }, desa] = await Promise.all([
    admin
      .from("project_memberships")
      .select(
        "id, role, status, invited_at, attendance_mode, user:users!project_memberships_user_id_fkey(id, full_name, email, kota, address, gender, jabatan), desa:desa(id, name), batch:project_batches(id, name)",
      )
      .eq("project_id", projectId)
      .order("invited_at", { ascending: false }),
    listProjectDesa(projectId, { asAdmin: true }),
  ]);
  const members = (memberData ?? []) as unknown as ProjectMemberRow[];
  return (
    <PesertaTab
      projectId={projectId}
      members={members}
      candidates={[]}
      desa={desa}
      raporBasePath="/personil"
      programType={programType}
      readOnly
      showMemberDetail={false}
      showMemberRapor={false}
    />
  );
}

async function NarasumberTabLoader({ projectId }: { projectId: string }) {
  const admin = createAdminClient();
  const [assignments, { data: pdData }] = await Promise.all([
    loadNarasumberAssignments(projectId),
    admin
      .from("project_desa")
      .select("desa_id, desa:desa(id, name)")
      .eq("project_id", projectId),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectDesa = ((pdData ?? []) as any[])
    .map((r) => ({ id: r.desa_id as string, name: r.desa?.name ?? "-" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <NarasumberTab
      projectId={projectId}
      assignments={assignments}
      candidates={[]}
      narasumberDetailBase="/personil/narasumber"
      projectDesa={projectDesa}
      readOnly
    />
  );
}
