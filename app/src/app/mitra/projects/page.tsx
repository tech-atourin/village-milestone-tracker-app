export const metadata = { title: "Project Saya" };

import { Folder } from "lucide-react";
import { listProjects } from "@/server/queries/projects";
import { ProjectsTable } from "@/app/atourin/projects/projects-table";
import { EmptyState } from "@/components/ui/empty-state";

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
        <EmptyState
          icon={Folder}
          title="Belum ada project ditugaskan"
          description="Tim Atourin akan menugaskan project ke organisasi Anda saat siap."
        />
      ) : (
        <ProjectsTable projects={projects} scope="mitra" />
      )}
    </div>
  );
}
