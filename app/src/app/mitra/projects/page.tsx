export const metadata = { title: "Project Saya" };

import Link from "next/link";
import { Folder, Plus } from "lucide-react";
import { listProjects } from "@/server/queries/projects";
import { ProjectsTable } from "@/app/atourin/projects/projects-table";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MitraProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Project Anda
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Daftar project pendampingan yang dipegang organisasi Anda. Anda
            bisa buat baru dan kelola sendiri.
          </p>
        </div>
        <Link
          href="/mitra/projects/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          <Plus className="h-4 w-4" />
          Project Baru
        </Link>
      </header>

      {projects.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="Belum ada project"
          description="Mulai project pendampingan pertama dengan tombol Project Baru di atas."
          action={
            <Link
              href="/mitra/projects/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
            >
              <Plus className="h-4 w-4" />
              Buat project pertama
            </Link>
          }
        />
      ) : (
        <ProjectsTable projects={projects} scope="mitra" />
      )}
    </div>
  );
}
