export const metadata = { title: "Detail Project" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/server/queries/projects";
import { listProjectDesa, listDesa } from "@/server/queries/desa";
import { listProjectMembers } from "@/server/queries/memberships";
import { listUsers } from "@/server/queries/users";
import { listProjectTopikWithItems } from "@/server/queries/topik";
import { createClient } from "@/lib/supabase/server";
import { DesaTab } from "./desa-tab";
import { PesertaTab } from "./peserta-tab";
import { TopikTab } from "./topik-tab";
import { EvidenceTab } from "./evidence-tab";
import { ProjectActions } from "./project-actions";
import { SettingsTab } from "./settings-tab";
import { type GformRow } from "./gforms-panel";
import { GformsTab, type TestResultRow } from "./gforms-tab";
import { AnalyticsSection } from "./analytics-section";
import { SummaryTab } from "./summary-tab";
import { ActionPlanBoard } from "@/components/action-plans/action-plan-board";
import { listActionPlans } from "@/server/queries/action-plans";

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

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "summary", label: "Summary" },
  { key: "desa", label: "Desa" },
  { key: "topik", label: "Topik" },
  { key: "peserta", label: "Peserta" },
  { key: "rencana-aksi", label: "Rencana Aksi" },
  { key: "evidence", label: "Evidence" },
  { key: "gforms", label: "Test Results" },
  { key: "settings", label: "Settings" },
] as const;

function formatDate(iso: string | null) {
  if (!iso) return "—";
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
  searchParams: { tab?: string };
}) {
  const project = await getProject(params.id);
  if (!project) notFound();

  const publicState = await getPublicState(params.id);
  const activeTab = searchParams.tab ?? "overview";

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
            Mitra: {project.organization?.name ?? "—"} ·{" "}
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
      {activeTab === "peserta" && <PesertaTabLoader projectId={project.id} />}
      {activeTab === "rencana-aksi" && (
        <RencanaAksiTabLoader projectId={project.id} />
      )}
      {activeTab === "evidence" && <EvidenceTabLoader projectId={project.id} />}
      {activeTab === "gforms" && <GformsAndResultsLoader projectId={project.id} />}
      {activeTab === "settings" && (
        <SettingsTab
          project={{
            id: project.id,
            name: project.name,
            description: project.description,
            period_start: project.period_start,
            period_end: project.period_end,
            status: project.status,
            enabled_modules: project.enabled_modules,
          }}
        />
      )}
    </div>
  );
}

async function DesaTabLoader({ projectId }: { projectId: string }) {
  const [attached, all] = await Promise.all([
    listProjectDesa(projectId),
    listDesa(),
  ]);
  return <DesaTab projectId={projectId} attached={attached} allDesa={all} />;
}

async function PesertaTabLoader({ projectId }: { projectId: string }) {
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
    />
  );
}

async function TopikTabLoader({ projectId }: { projectId: string }) {
  const topik = await listProjectTopikWithItems(projectId);
  return <TopikTab projectId={projectId} topik={topik} editable />;
}

async function EvidenceTabLoader({ projectId }: { projectId: string }) {
  return <EvidenceTab projectId={projectId} />;
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
    project_name: r.project?.name ?? "—",
    desa_name: r.desa?.name ?? "—",
  }));
  return <ActionPlanBoard rows={rows} desaOptions={desaOptions} canEdit />;
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
        "id, project_gform_id, user_id, raw_response, score, max_score, submitted_at, matched_status, user:users(full_name, email), gform:project_gforms(form_type, form_label)",
      )
      .in("project_gform_id", gformIds)
      .order("submitted_at", { ascending: false })
      .limit(500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    testResults = ((trData ?? []) as any[]).map((r) => ({
      id: r.id,
      project_gform_id: r.project_gform_id,
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

  return (
    <GformsTab
      projectId={projectId}
      gforms={gforms}
      testResults={testResults}
    />
  );
}

function OverviewTab({
  project,
  projectId,
}: {
  project: Awaited<ReturnType<typeof getProject>> & object;
  projectId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Deskripsi">
            {project.description ? (
              <p className="whitespace-pre-line text-sm text-atr-fg">
                {project.description}
              </p>
            ) : (
              <p className="text-sm italic text-atr-fg-muted">
                Tidak ada deskripsi.
              </p>
            )}
          </Card>

          <Card title="Modul aktif">
            <ul className="space-y-1.5 text-sm text-atr-fg">
              {Object.entries(project.enabled_modules).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      v
                        ? "bg-atr-arti/15 text-atr-arti"
                        : "bg-atr-bg-soft text-atr-fg-muted"
                    }`}
                  >
                    {v ? "Aktif" : "Off"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Stat label="Topik" value={project.topik_count} />
          <Stat label="Checklist items" value={project.checklist_count} />
          <Stat label="Desa" value={project.desa_count} />
          <Stat label="Anggota project" value={project.member_count} />
        </div>
      </div>

      {/* Analytics merged into Overview */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Analytics
        </h3>
        <AnalyticsSection projectId={projectId} />
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
      <h3 className="mb-3 text-sm font-bold text-atr-fg">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
      <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-atr-fg">{value}</div>
    </div>
  );
}
