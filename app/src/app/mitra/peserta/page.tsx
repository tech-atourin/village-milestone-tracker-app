export const metadata = { title: "Peserta" };

import Link from "next/link";
import { Users, MapPin, FolderOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { listProjects } from "@/server/queries/projects";
import { EmptyState } from "@/components/ui/empty-state";

type Row = {
  user_id: string;
  full_name: string;
  email: string | null;
  desa_name: string | null;
  project_id: string;
  project_name: string;
};

async function loadPeserta(projectIds: string[]): Promise<Row[]> {
  if (projectIds.length === 0) return [];
  // Admin client bypasses RLS on project_memberships/users (mitra anon role
  // can't read other users' rows). Scope is enforced by the project_ids
  // list, which comes from the RLS-filtered listProjects() above.
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_memberships")
    .select(
      "user_id, project_id, user:users!project_memberships_user_id_fkey(full_name, email), desa:desa(name), project:projects(name)",
    )
    .in("project_id", projectIds)
    .eq("role", "peserta")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data ?? []) as any[]);
  return rows.map((r) => ({
    user_id: r.user_id,
    full_name: r.user?.full_name ?? "-",
    email: r.user?.email ?? null,
    desa_name: r.desa?.name ?? null,
    project_id: r.project_id,
    project_name: r.project?.name ?? "-",
  }));
}

export default async function MitraPesertaPage() {
  await requireRole("mitra_admin");
  // Use the same RLS-filtered project list the mitra sees on /mitra/projects
  // instead of comparing organization_id (which fails when the user's org and
  // project's org don't match exactly — e.g. atourin-created projects that
  // the mitra has membership-level access to).
  const projects = await listProjects();
  const rows = await loadPeserta(projects.map((p) => p.id));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Peserta
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Seluruh peserta dari project yang Anda pegang. Dikelompokkan per
            desa & project.
          </p>
        </div>
        <Link
          href="/mitra/projects"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          <FolderOpen className="h-4 w-4" />
          Tambah Peserta via Project
        </Link>
      </header>

      <div className="rounded-lg border border-atr-purple/30 bg-atr-purple-50/40 px-3.5 py-2.5 text-xs text-atr-fg">
        💡 Peserta selalu terikat ke sebuah project. Buka project di menu
        <strong> Project Saya</strong> → tab <strong>Peserta</strong> untuk
        tambah satuan atau <strong>Bulk Import</strong> puluhan/ratusan
        sekaligus. Satu orang bisa jadi peserta di beberapa project.
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada peserta"
          description="Tambahkan peserta lewat halaman project (Project Saya → pilih project → tab Peserta)."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-atr-outline bg-white shadow-atr-1">
          <table className="w-full text-sm">
            <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Desa</th>
                <th className="px-4 py-3">Project</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atr-outline">
              {rows.map((r) => (
                <tr key={`${r.project_id}-${r.user_id}`}>
                  <td className="px-4 py-3 font-bold text-atr-fg">
                    {r.full_name}
                  </td>
                  <td className="px-4 py-3 text-atr-fg-muted">
                    {r.email ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {r.desa_name ? (
                      <span className="inline-flex items-center gap-1 text-atr-fg">
                        <MapPin className="h-3 w-3 text-atr-purple" />
                        {r.desa_name}
                      </span>
                    ) : (
                      <span className="text-atr-fg-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/mitra/projects/${r.project_id}`}
                      className="font-bold text-atr-purple-600 hover:text-atr-purple"
                    >
                      {r.project_name}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
