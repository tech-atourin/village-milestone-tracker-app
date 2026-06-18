export const metadata = { title: "Detail User" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { UserDetailAuth } from "@/components/users/user-detail-auth";

const ROLE_LABEL: Record<string, string> = {
  peserta: "Peserta",
  narasumber: "Narasumber",
  desa_wisata: "Desa Wisata",
};

// Mitra hanya boleh kelola user dengan role berikut. Lainnya (superadmin,
// mitra_admin) tidak boleh diakses dari scope ini.
const MITRA_MANAGEABLE_ROLES = new Set([
  "peserta",
  "narasumber",
  "desa_wisata",
]);

export default async function MitraUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("mitra_admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select(
      "id, full_name, email, phone, global_role, organization:organizations(id, name), created_at, last_login_at",
    )
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = data as any;
  if (!MITRA_MANAGEABLE_ROLES.has(u.global_role)) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/mitra/users"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar user
      </Link>

      <header className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          {u.full_name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600">
            {ROLE_LABEL[u.global_role] ?? u.global_role}
          </span>
          {u.organization?.name && (
            <span className="text-atr-fg-muted">{u.organization.name}</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Detail label="Email" value={u.email} />
          <Detail label="HP" value={u.phone} />
          <Detail
            label="Login Terakhir"
            value={u.last_login_at ? new Date(u.last_login_at).toLocaleString("id-ID") : "Belum pernah"}
          />
          <Detail
            label="Dibuat"
            value={new Date(u.created_at).toLocaleDateString("id-ID")}
          />
        </div>
      </header>

      <UserDetailAuth userId={u.id} initialEmail={u.email} />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-atr-fg">
        {value ?? <span className="italic text-atr-fg-muted">-</span>}
      </div>
    </div>
  );
}
