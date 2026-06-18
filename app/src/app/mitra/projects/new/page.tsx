export const metadata = { title: "Project Baru" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { listTemplates, listOrganizations } from "@/server/queries/projects";
import { ProjectWizard } from "@/app/atourin/projects/new/project-wizard";

export default async function NewMitraProjectPage() {
  const user = await requireRole("mitra_admin");
  const [templates, allOrgs] = await Promise.all([
    listTemplates(),
    listOrganizations(),
  ]);
  // Mitra hanya bisa buat untuk org sendiri - pre-filter list
  const organizations = allOrgs.filter((o) => o.id === user.organization_id);

  return (
    <div className="space-y-6">
      <Link
        href="/mitra/projects"
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
          Project ini otomatis terdaftar atas nama organisasi Anda.
        </p>
      </header>

      <ProjectWizard
        templates={templates}
        organizations={organizations}
        defaultOrganizationId={user.organization_id ?? undefined}
        redirectScope="mitra"
      />
    </div>
  );
}
