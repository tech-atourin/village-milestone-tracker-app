export const metadata = { title: "Peserta" };

import Link from "next/link";
import { Users, MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { AddPesertaButton } from "./add-peserta-button";

type Row = {
  user_id: string;
  full_name: string;
  email: string | null;
  desa_name: string | null;
  project_id: string;
  project_name: string;
};

async function loadPeserta(organizationId: string | null): Promise<Row[]> {
  // Admin client to bypass RLS on project_memberships/users (mitra anon role
  // can't read other users' rows). We scope to mitra's organization here.
  const admin = createAdminClient();
  let query = admin
    .from("project_memberships")
    .select(
      "user_id, project_id, user:users!project_memberships_user_id_fkey(full_name, email), desa:desa(name), project:projects(name, organization_id)",
    )
    .eq("role", "peserta")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  const { data } = await query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data ?? []) as any[]);
  const filtered = organizationId
    ? rows.filter((r) => r.project?.organization_id === organizationId)
    : rows;
  return filtered.map((r) => ({
    user_id: r.user_id,
    full_name: r.user?.full_name ?? "—",
    email: r.user?.email ?? null,
    desa_name: r.desa?.name ?? null,
    project_id: r.project_id,
    project_name: r.project?.name ?? "—",
  }));
}

export default async function MitraPesertaPage() {
  const user = await requireRole("mitra_admin");
  const rows = await loadPeserta(user.organization_id ?? null);

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
        {user.organization_id && (
          <AddPesertaButton orgId={user.organization_id} />
        )}
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada peserta"
          description="Peserta akan muncul di sini ketika sudah ditambahkan ke project oleh tim Atourin."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
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
                    {r.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.desa_name ? (
                      <span className="inline-flex items-center gap-1 text-atr-fg">
                        <MapPin className="h-3 w-3 text-atr-purple" />
                        {r.desa_name}
                      </span>
                    ) : (
                      <span className="text-atr-fg-muted">—</span>
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
