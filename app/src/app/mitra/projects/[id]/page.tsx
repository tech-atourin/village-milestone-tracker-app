export const metadata = { title: "Detail Project" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { getProject } from "@/server/queries/projects";
import { listProjectDesa, listDesa } from "@/server/queries/desa";
import type { ProjectMemberRow } from "@/server/queries/memberships";
import type { UserListRow } from "@/server/queries/users";
import { listProjectTopikWithItems } from "@/server/queries/topik";
import { listTemplates } from "@/server/queries/projects";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { DesaTab } from "@/app/atourin/projects/[id]/desa-tab";
import { PesertaTab } from "@/app/atourin/projects/[id]/peserta-tab";
import { NarasumberTab } from "@/app/atourin/projects/[id]/narasumber-tab";
import { loadNarasumberAssignments } from "@/server/queries/narasumber-assignments";
import { TopikTab } from "@/app/atourin/projects/[id]/topik-tab";
import { EvidenceTab } from "@/app/atourin/projects/[id]/evidence-tab";
import { ProjectActions } from "@/app/atourin/projects/[id]/project-actions";
import { SettingsTab } from "@/app/atourin/projects/[id]/settings-tab";
import { type GformRow } from "@/app/atourin/projects/[id]/gforms-panel";
import {
  GformsTab,
  type TestResultRow,
  type NarasumberRatingRow,
} from "@/app/atourin/projects/[id]/gforms-tab";
import { OverviewTab } from "@/app/atourin/projects/[id]/overview-tab";
import { SummaryTab } from "@/app/atourin/projects/[id]/summary-tab";
import { KuisTab } from "@/app/atourin/projects/[id]/kuis-tab";
import { KuisTesTab } from "@/app/atourin/projects/[id]/kuis-tes-tab";
import { KehadiranTab } from "@/app/atourin/projects/[id]/kehadiran-tab";
import { MateriTab } from "@/app/atourin/projects/[id]/materi-tab";
import { listProjectQuizzes } from "@/server/queries/quizzes";
import { ActionPlanBoard } from "@/components/action-plans/action-plan-board";
import { listActionPlans } from "@/server/queries/action-plans";
import { listProjectLogoUrls } from "@/server/actions/project-logos";

async function getPublicState(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("public_dashboard_enabled, public_dashboard_slug")
    .eq("id", projectId)
    .maybeSingle();
  const row = data as {
    public_dashboard_enabled: boolean | null;
    public_dashboard_slug: string | null;
  } | null;
  return {
    enabled: row?.public_dashboard_enabled ?? false,
    slug: row?.public_dashboard_slug ?? null,
  };
}

const STATUS_STYLES = {
  draft: "bg-atr-bg-soft text-atr-fg-muted",
  active: "bg-atr-arti/15 text-atr-arti",
  completed: "bg-atr-purple-light/50 text-atr-purple-600",
  archived: "bg-atr-bg-soft text-atr-fg-muted",
} as const;

const STATUS_LABEL = {
  draft: "Draft",
  active: "Aktif",
  completed: "Selesai",
  archived: "Arsip",
} as const;

const ALL_TABS = [
  { key: "overview", label: "Ringkasan" },
  { key: "summary", label: "Analisis" },
  { key: "desa", label: "Desa", desaOnly: true },
  { key: "topik", label: "Topik" },
  { key: "peserta", label: "Peserta" },
  { key: "narasumber", label: "Narasumber" },
  { key: "rencana-aksi", label: "Rencana Aksi" },
  { key: "evidence", label: "Bukti" },
  { key: "kuis", label: "Kuis & Tes" },
  { key: "kehadiran", label: "Kehadiran" },
  { key: "materi", label: "Materi & Tautan" },
  { key: "settings", label: "Pengaturan" },
] as const;

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function MitraProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; topik?: string; desa?: string };
}) {
  await requireRole("mitra_admin");
  const user = await getCurrentUser();
  const project = await getProject(params.id);
  if (!project || !user) notFound();

  // Ownership check: mitra can only view projects under their own organization
  if (project.organization?.id && project.organization.id !== user.organization_id) {
    notFound();
  }

  const publicState = await getPublicState(params.id);
  const activeTab = searchParams.tab ?? "overview";
  const isDesaBased = project.program_type === "desa_based";
  const TABS = ALL_TABS.filter(
    (t) => isDesaBased || !("desaOnly" in t && t.desaOnly),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/mitra/projects"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar project
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
              {project.name}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[project.status]}`}
            >
              {STATUS_LABEL[project.status]}
            </span>
          </div>
          <div className="text-sm text-atr-fg-muted">
            Mitra: {project.organization?.name ?? "-"} ·{" "}
            {formatDate(project.period_start)} – {formatDate(project.period_end)}
          </div>
          {project.template && (
            <div className="text-xs text-atr-fg-muted">
              Template: {project.template.name}
            </div>
          )}
        </div>
        <ProjectActions
          projectId={params.id}
          initialEnabled={publicState.enabled}
          initialSlug={publicState.slug}
          scope="mitra"
        />
      </header>

      {/* Tabs */}
      <nav className="border-b border-atr-outline">
        <ul className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <li key={t.key}>
                <Link
                  href={`/mitra/projects/${project.id}?tab=${t.key}`}
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

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab project={project} projectId={project.id} />
      )}
      {activeTab === "summary" && (
        <SummaryTab projectId={project.id} scope="mitra" />
      )}
      {activeTab === "desa" && <DesaTabLoader projectId={project.id} />}
      {activeTab === "topik" && <TopikTabLoader projectId={project.id} />}
      {activeTab === "peserta" && (
        <PesertaTabLoader
          projectId={project.id}
          organizationId={user.organization_id ?? null}
          programType={project.program_type}
        />
      )}
      {activeTab === "narasumber" && (
        <NarasumberTabLoader projectId={project.id} />
      )}
      {activeTab === "rencana-aksi" && (
        <RencanaAksiTabLoader projectId={project.id} />
      )}
      {activeTab === "evidence" && (
        <EvidenceTabLoader
          projectId={project.id}
          filterTopikId={searchParams.topik}
          filterDesaId={searchParams.desa}
        />
      )}
      {activeTab === "kuis" && (
        <KuisTesTab
          kuis={<KuisTabLoader projectId={project.id} scope="mitra" />}
          gform={<GformsAndResultsLoader projectId={project.id} />}
        />
      )}
      {activeTab === "kehadiran" && <KehadiranTab projectId={project.id} />}
      {activeTab === "materi" && <MateriTab projectId={project.id} />}
      {activeTab === "settings" && (
        <MitraSettingsLoader project={project} />
      )}
    </div>
  );
}

async function DesaTabLoader({ projectId }: { projectId: string }) {
  const [attached, all] = await Promise.all([
    listProjectDesa(projectId),
    listDesa(),
  ]);
  return (
    <DesaTab
      projectId={projectId}
      attached={attached}
      allDesa={all}
      scope="mitra"
    />
  );
}

async function PesertaTabLoader({
  projectId,
  organizationId,
  programType,
}: {
  projectId: string;
  organizationId: string | null;
  programType: "desa_based" | "pelaku_pariwisata";
}) {
  // Mitra anon role can't read other users' rows under RLS, which makes the
  // embedded user join null and crashes the client. Use the admin client and
  // scope explicitly (ownership already verified on the page).
  const admin = createAdminClient();
  const [{ data: memberData }, { data: candData }, desa] = await Promise.all([
    admin
      .from("project_memberships")
      .select(
        "id, role, status, invited_at, attendance_mode, user:users!project_memberships_user_id_fkey(id, full_name, email), desa:desa(id, name)",
      )
      .eq("project_id", projectId)
      .order("invited_at", { ascending: false }),
    admin
      .from("users")
      .select(
        "id, full_name, email, email_artificial, phone, global_role, created_at, last_login_at, organization:organizations(id, name)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
    listProjectDesa(projectId),
  ]);
  const members = (memberData ?? []) as unknown as ProjectMemberRow[];
  // Candidates: users in mitra's org plus unaffiliated users (peserta/desa
  // accounts usually have no organization), so manual add has someone to pick.
  const allCandidates = (candData ?? []) as unknown as UserListRow[];
  const candidates = organizationId
    ? allCandidates.filter(
        (u) => !u.organization || u.organization.id === organizationId,
      )
    : allCandidates;
  return (
    <PesertaTab
      projectId={projectId}
      members={members}
      candidates={candidates}
      desa={desa}
      raporBasePath="/mitra"
      programType={programType}
    />
  );
}

async function NarasumberTabLoader({ projectId }: { projectId: string }) {
  // Same admin-client trick as Peserta tab: mitra anon role can't read other
  // narasumber rows through RLS, so we go through admin.
  const admin = createAdminClient();
  const [assignments, { data: candData }, { data: pdData }] = await Promise.all([
    loadNarasumberAssignments(projectId),
    admin
      .from("users")
      .select(
        "id, full_name, email, email_artificial, phone, global_role, created_at, last_login_at, organization:organizations(id, name)",
      )
      .is("deleted_at", null)
      .eq("global_role", "narasumber")
      .order("full_name", { ascending: true })
      .limit(500),
    admin
      .from("project_desa")
      .select("desa_id, desa:desa(id, name)")
      .eq("project_id", projectId),
  ]);
  const candidates = (candData ?? []) as unknown as UserListRow[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectDesa = ((pdData ?? []) as any[])
    .map((r) => ({ id: r.desa_id as string, name: r.desa?.name ?? "-" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <NarasumberTab
      projectId={projectId}
      assignments={assignments}
      candidates={candidates}
      narasumberDetailBase="/mitra/narasumber"
      projectDesa={projectDesa}
    />
  );
}

async function TopikTabLoader({ projectId }: { projectId: string }) {
  const [topik, templates] = await Promise.all([
    listProjectTopikWithItems(projectId),
    listTemplates(),
  ]);
  return (
    <TopikTab
      projectId={projectId}
      topik={topik}
      editable
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        topik_count: t.topik_count,
        checklist_count: t.checklist_count,
      }))}
    />
  );
}

async function EvidenceTabLoader({
  projectId,
  filterTopikId,
  filterDesaId,
}: {
  projectId: string;
  filterTopikId?: string;
  filterDesaId?: string;
}) {
  return (
    <EvidenceTab
      projectId={projectId}
      filterTopikId={filterTopikId}
      filterDesaId={filterDesaId}
    />
  );
}

async function RencanaAksiTabLoader({ projectId }: { projectId: string }) {
  const supabase = createClient();
  const [rows, { data: pd }] = await Promise.all([
    listActionPlans({ projectId }),
    supabase
      .from("project_desa")
      .select("id, project_id, desa:desa(name), project:projects(name)")
      .eq("project_id", projectId),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const desaOptions = ((pd ?? []) as any[]).map((r) => ({
    project_desa_id: r.id,
    project_id: r.project_id,
    project_name: r.project?.name ?? "-",
    desa_name: r.desa?.name ?? "-",
  }));
  return (
    <ActionPlanBoard rows={rows} desaOptions={desaOptions} canEdit={false} />
  );
}

async function GformsAndResultsLoader({ projectId }: { projectId: string }) {
  const supabase = createClient();
  const { data: gformsData } = await supabase
    .from("project_gforms")
    .select(
      "id, form_type, form_label, gform_id, sheet_id, identifier_field, sync_status, last_sync_at, last_sync_error",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const gforms = (gformsData ?? []) as unknown as GformRow[];
  const gformIds = gforms.map((g) => g.id);

  let testResults: TestResultRow[] = [];
  if (gformIds.length > 0) {
    const { data: trData } = await supabase
      .from("peserta_test_results")
      .select(
        "id, project_gform_id, project_topik_id, user_id, raw_response, score, max_score, submitted_at, matched_status, user:users(full_name, email), gform:project_gforms(form_type, form_label), topik:project_topik(name)",
      )
      .in("project_gform_id", gformIds)
      .order("submitted_at", { ascending: false })
      .limit(500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    testResults = ((trData ?? []) as any[]).map((r) => ({
      id: r.id,
      project_gform_id: r.project_gform_id,
      project_topik_id: r.project_topik_id ?? null,
      project_topik_name: r.topik?.name ?? null,
      user_id: r.user_id,
      user_name: r.user?.full_name ?? null,
      user_email: r.user?.email ?? null,
      form_type: r.gform?.form_type,
      form_label: r.gform?.form_label ?? null,
      raw_response: r.raw_response,
      score: r.score,
      max_score: r.max_score,
      submitted_at: r.submitted_at,
      matched_status: r.matched_status,
    }));
  }

  // Narasumber kuisioner data. Mitra anon can't read other users' rows
  // through RLS, so go through admin (ownership already enforced on page).
  const admin = createAdminClient();
  const { data: nrData } = await admin
    .from("narasumber_ratings")
    .select(
      "id, narasumber_id, rater_id, rating, comment, created_at, narasumber:users!narasumber_ratings_narasumber_id_fkey(full_name), rater:users!narasumber_ratings_rater_id_fkey(full_name, email)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(500);
  const narasumberRatings: NarasumberRatingRow[] = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (nrData ?? []) as any[]
  ).map((r) => ({
    id: r.id,
    narasumber_id: r.narasumber_id,
    narasumber_name: r.narasumber?.full_name ?? "Narasumber",
    rater_id: r.rater_id,
    rater_name: r.rater?.full_name ?? null,
    rater_email: r.rater?.email ?? null,
    rating: r.rating,
    comment: r.comment,
    submitted_at: r.created_at,
  }));

  return (
    <GformsTab
      projectId={projectId}
      gforms={gforms}
      testResults={testResults}
      narasumberRatings={narasumberRatings}
    />
  );
}


async function MitraSettingsLoader({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any;
}) {
  const extraLogos = await listProjectLogoUrls(project.id);
  return (
    <SettingsTab
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        period_start: project.period_start,
        period_end: project.period_end,
        pelatihan_start: project.pelatihan_start ?? null,
        pelatihan_end: project.pelatihan_end ?? null,
        total_pelatihan_days: project.total_pelatihan_days ?? null,
        pendampingan_start: project.pendampingan_start ?? null,
        pendampingan_end: project.pendampingan_end ?? null,
        total_pendampingan_days: project.total_pendampingan_days,
        status: project.status,
        enabled_modules: project.enabled_modules,
      }}
      extraLogos={extraLogos}
    />
  );
}

async function KuisTabLoader({
  projectId,
  scope,
}: {
  projectId: string;
  scope: "atourin" | "mitra";
}) {
  const [quizzes, topik] = await Promise.all([
    listProjectQuizzes(projectId),
    listProjectTopikWithItems(projectId),
  ]);
  const topikOptions = topik.map((t) => ({ id: t.id, name: t.name }));
  return (
    <KuisTab
      projectId={projectId}
      quizzes={quizzes}
      topikOptions={topikOptions}
      scope={scope}
    />
  );
}
