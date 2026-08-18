export const metadata = { title: "Project" };

import Link from "next/link";
import { Folder, CalendarRange, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { getMyPersonnelProjects } from "@/server/queries/personnel";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Aktif",
  completed: "Selesai",
  archived: "Arsip",
};

function fmt(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function PersonilProjectsPage() {
  await requireRole("personil");
  const projects = await getMyPersonnelProjects();

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">Project</h1>
        <p className="text-sm text-atr-fg-muted">
          Project tempat Anda ditugaskan sebagai fasilitator. Buka untuk melihat
          detail lengkap program.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <Folder className="mx-auto mb-3 h-6 w-6 text-atr-fg-muted" />
          <p className="text-sm font-bold text-atr-fg">
            Belum ada project
          </p>
          <p className="mt-1 text-sm text-atr-fg-muted">
            Anda belum terdaftar sebagai fasilitator di project mana pun.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.project_id}>
              <Link
                href={`/personil/projects/${p.project_id}`}
                className="flex items-start gap-3 rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1 transition hover:bg-atr-bg-soft"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-atr-fg">
                      {p.project_name}
                    </span>
                    <span className="shrink-0 rounded-full bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-atr-fg-muted">
                    {p.position}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-atr-fg-muted">
                    <CalendarRange className="h-3 w-3" />
                    {fmt(p.period_start)} sampai {fmt(p.period_end)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-atr-fg-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
