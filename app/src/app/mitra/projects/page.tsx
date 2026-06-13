import { Folder } from "lucide-react";
import { listProjects } from "@/server/queries/projects";
import { ProjectsTable } from "@/app/atourin/projects/projects-table";

export default async function MitraProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Project Anda
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Daftar project pendampingan yang dipegang organisasi Anda.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <Folder className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">
            Belum ada project ditugaskan
          </p>
          <p className="mt-1 text-sm text-atr-fg-muted">
            Tim Atourin akan menugaskan project ke organisasi Anda saat siap.
          </p>
        </div>
      ) : (
        <ProjectsTable projects={projects} scope="mitra" />
      )}
    </div>
  );
}
