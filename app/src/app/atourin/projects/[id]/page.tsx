export const metadata = { title: "Detail Project" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/server/queries/projects";
import { listProjectDesa, listDesa } from "@/server/queries/desa";
import { listProjectMembers } from "@/server/queries/memberships";
import { listUsers } from "@/server/queries/users";
import { listProjectTopikWithItems } from "@/server/queries/topik";
import { listTemplates } from "@/server/queries/projects";
import { createClient } from "@/lib/supabase/server";
import { DesaTab } from "./desa-tab";
import { PesertaTab } from "./peserta-tab";
import { NarasumberTab } from "./narasumber-tab";
import { loadNarasumberAssignments } from "@/server/queries/narasumber-assignments";
import { TopikTab } from "./topik-tab";
import { EvidenceTab } from "./evidence-tab";
import { ProjectActions } from "./project-actions";
import { OverviewTab } from "./overview-tab";
import { SettingsTab } from "./settings-tab";
import { type GformRow } from "./gforms-panel";
import {
  GformsTab,
  type TestResultRow,
  type NarasumberRatingRow,
} from "./gforms-tab";
import { SummaryTab } from "./summary-tab";
import { KuisTab } from "./kuis-tab";
import { KuisTesTab } from "./kuis-tes-tab";
import { KehadiranTab } from "./kehadiran-tab";
import { MateriTab } from "./materi-tab";
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

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; topik?: string; desa?: string };
}) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const publicState = await getPublicState(params.id);
  const activeTab = searchParams.tab ?? "overview";
  const isDesaBased = project.program_type === "desa_based";
  // Pelaku pariwisata: project tidak terkait desa wisata, jadi tab Desa dan
  // Rencana Aksi (yang per-desa) disembunyikan.
  const TABS = ALL_TABS.filter(
    (t) => isDesaBased || !("desaOnly" in t && t.desaOnly),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/atourin/projects"
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
                  href={`/atourin/projects/${project.id}?tab=${t.key}`}
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
        <SummaryTab projectId={project.id} scope="atourin" />
      )}
      {activeTab === "desa" && <DesaTabLoader projectId={project.id} />}
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
          kuis={<KuisTabLoader projectId={project.id} scope="atourin" />}
          gform={<GformsAndResultsLoader projectId={project.id} />}
        />
      )}
      {activeTab === "kehadiran" && <KehadiranTab projectId={project.id} />}
      {activeTab === "materi" && <MateriTab projectId={project.id} />}
      {activeTab === "settings" && (
        <SettingsTabLoader
          project={{
            id: project.id,
            name: project.name,
            description: project.description,
            period_start: project.period_start,
            period_end: project.period_end,
            total_pendampingan_days: project.total_pendampingan_days,
            status: project.status,
            enabled_modules: project.enabled_modules,
          }}
        />
      )}
    </div>
  );
}

async function SettingsTabLoader({
  project,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
    period_start: string | null;
    period_end: string | null;
    total_pendampingan_days: number | null;
    status: "draft" | "active" | "completed" | "archived";
    enabled_modules: Record<string, boolean>;
  };
}) {
  const extraLogos = await listProjectLogoUrls(project.id);
  return <SettingsTab project={project} extraLogos={extraLogos} />;
}

async function DesaTabLoader({ projectId }: { projectId: string }) {
  const [attached, all] = await Promise.all([
    listProjectDesa(projectId),
    listDesa(),
  ]);
  return <DesaTab projectId={projectId} attached={attached} allDesa={all} />;
}

async function PesertaTabLoader({
  projectId,
  programType,
}: {
  projectId: string;
  programType: "desa_based" | "pelaku_pariwisata";
}) {
  const [members, candidates, desa] = await Promise.all([
    listProjectMembers(projectId),
    listUsers(),
    listProjectDesa(projectId),
  ]);
  return (
    <PesertaTab
      projectId={projectId}
      members={members}
      candidates={candidates}
      desa={desa}
      programType={programType}
    />
  );
}

async function NarasumberTabLoader({ projectId }: { projectId: string }) {
  const [assignments, candidates, projectDesaRows] = await Promise.all([
    loadNarasumberAssignments(projectId),
    listUsers({ role: "narasumber" }),
    listProjectDesa(projectId),
  ]);
  const projectDesa = projectDesaRows
    .map((d) => ({ id: d.desa.id, name: d.desa.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <NarasumberTab
      projectId={projectId}
      assignments={assignments}
      candidates={candidates}
      narasumberDetailBase="/atourin/narasumber"
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

  // Narasumber kuisioner data - joined separately because it lives in
  // narasumber_ratings (not synced from a gform).
  const { data: nrData } = await supabase
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

