export const metadata = { title: "Detail Peserta" };

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  mitra_admin: "Mitra Admin",
  peserta: "Peserta",
  narasumber: "Narasumber",
  desa_wisata: "Desa Wisata",
  personil: "Personil",
};

export default async function PersonilUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.global_role !== "personil") redirect("/forbidden");

  const admin = createAdminClient();

  // Akses: fasilitator hanya boleh melihat user yang menjadi anggota project
  // tempat ia ditugaskan (project_personnel).
  const { data: myProj } = await admin
    .from("project_personnel")
    .select("project_id")
    .eq("user_id", me.id);
  const myProjectIds = (myProj ?? []).map(
    (r) => (r as { project_id: string }).project_id,
  );
  if (myProjectIds.length === 0) notFound();
  const { data: shared } = await admin
    .from("project_memberships")
    .select("id")
    .eq("user_id", params.id)
    .in("project_id", myProjectIds)
    .limit(1);
  if (!shared || shared.length === 0) notFound();

  const { data } = await admin
    .from("users")
    .select(
      "id, full_name, email, phone, global_role, gender, jabatan, kota, address, birth_date, created_at, last_login_at",
    )
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = data as any;

  return (
    <div className="space-y-6">
      <Link
        href="/personil/projects"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <header className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          {u.full_name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600">
            {ROLE_LABEL[u.global_role] ?? u.global_role}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Detail label="Email" value={u.email} />
          <Detail label="HP" value={u.phone} />
          <Detail
            label="Jenis Kelamin"
            value={
              u.gender === "L"
                ? "Laki-laki"
                : u.gender === "P"
                  ? "Perempuan"
                  : (u.gender ?? null)
            }
          />
          <Detail
            label="Tanggal Lahir"
            value={
              u.birth_date
                ? new Date(u.birth_date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : null
            }
          />
          <Detail label="Jabatan" value={u.jabatan} />
          <Detail label="Desa Asal" value={u.address} />
          <Detail label="Kabupaten" value={u.kota} />
          <Detail
            label="Login Terakhir"
            value={
              u.last_login_at
                ? new Date(u.last_login_at).toLocaleString("id-ID")
                : "Belum pernah"
            }
          />
        </div>
      </header>
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
