import Link from "next/link";
import { Plus, Folder } from "lucide-react";
import { listProjects } from "@/server/queries/projects";
import { ProjectsTable } from "./projects-table";

export default async function ProjectsListPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Projects
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Semua project pendampingan yang dikelola Atourin.
          </p>
        </div>
        <Link
          href="/atourin/projects/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <Folder className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">Belum ada project</p>
          <p className="mt-1 text-sm text-atr-fg-muted">
            Mulai project pendampingan pertama dari template default.
          </p>
          <Link
            href="/atourin/projects/new"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
          >
            <Plus className="h-4 w-4" />
            Buat project pertama
          </Link>
        </div>
      ) : (
        <ProjectsTable projects={projects} scope="atourin" />
      )}
    </div>
  );
}
