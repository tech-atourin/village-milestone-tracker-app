import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProject } from "@/server/queries/projects";
import { listProjectDesa } from "@/server/queries/desa";
import { listProjectTopikWithItems } from "@/server/queries/topik";
import { TopikTab } from "@/app/atourin/projects/[id]/topik-tab";
import { MitraDesaTable } from "./mitra-desa-table";

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
  { key: "desa", label: "Desa" },
  { key: "topik", label: "Topik" },
  { key: "reports", label: "Reports" },
] as const;

function formatDate(iso: string | null) {
  if (!iso) return "—";
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
  searchParams: { tab?: string };
}) {
  const project = await getProject(params.id);
  if (!project) notFound();
  const activeTab = searchParams.tab ?? "overview";

  return (
    <div className="space-y-6">
      <Link
        href="/mitra/projects"
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
            {STATUS_LABEL[project.status]}
          </span>
        </div>
        <div className="text-sm text-atr-fg-muted">
          {formatDate(project.period_start)} – {formatDate(project.period_end)}
        </div>
      </header>

      <nav className="border-b border-atr-outline">
        <ul className="-mb-px flex gap-6">
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

      {activeTab === "overview" && <Overview project={project} />}
      {activeTab === "desa" && <DesaPanel projectId={project.id} />}
      {activeTab === "topik" && <TopikPanel projectId={project.id} />}
      {activeTab === "reports" && (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <p className="text-sm font-bold text-atr-fg">
            Branded report tersedia di Phase 3
          </p>
          <p className="mt-1 text-sm text-atr-fg-muted">
            PDF dengan logo organisasi + executive summary AI.
          </p>
        </div>
      )}
    </div>
  );
}

function Overview({
  project,
}: {
  project: Awaited<ReturnType<typeof getProject>> & object;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          <h3 className="mb-3 text-sm font-bold text-atr-fg">Deskripsi</h3>
          {project.description ? (
            <p className="whitespace-pre-line text-sm text-atr-fg">
              {project.description}
            </p>
          ) : (
            <p className="text-sm italic text-atr-fg-muted">
              Tidak ada deskripsi.
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <Stat label="Desa" value={project.desa_count} />
        <Stat label="Topik" value={project.topik_count} />
        <Stat label="Anggota" value={project.member_count} />
      </div>
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

async function DesaPanel({ projectId }: { projectId: string }) {
  const attached = await listProjectDesa(projectId);
  if (attached.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <p className="text-sm font-bold text-atr-fg">
          Belum ada desa di project ini
        </p>
      </div>
    );
  }
  return <MitraDesaTable attached={attached} />;
}

async function TopikPanel({ projectId }: { projectId: string }) {
  const topik = await listProjectTopikWithItems(projectId);
  return <TopikTab topik={topik} />;
}
