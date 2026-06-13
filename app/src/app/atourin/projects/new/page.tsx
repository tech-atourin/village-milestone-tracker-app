import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  listTemplates,
  listOrganizations,
} from "@/server/queries/projects";
import { ProjectWizard } from "./project-wizard";

export default async function NewProjectPage() {
  const [templates, organizations] = await Promise.all([
    listTemplates(),
    listOrganizations(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/atourin/projects"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar project
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-atr-fg">
          Buat Project Baru
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Ikuti 5 langkah untuk setup project pendampingan baru.
        </p>
      </header>

      <ProjectWizard templates={templates} organizations={organizations} />
    </div>
  );
}
