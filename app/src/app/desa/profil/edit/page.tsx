export const metadata = { title: "Edit Profil Desa | VMT by Atourin" };

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getDefaultBaselineSchema,
  getBaselineData,
} from "@/server/queries/baseline";
import { BaselineForm } from "@/app/peserta/projects/[id]/baseline/baseline-form";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin } from "lucide-react";

export default async function DesaProfilEditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.global_role !== "desa_wisata") redirect("/");

  const desaId = user.representing_desa_id;
  if (!desaId) {
    return (
      <div className="space-y-5">
        <Link
          href="/desa/profil"
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke profil
        </Link>
        <EmptyState
          icon={MapPin}
          title="Akun belum terhubung ke desa"
          description="Hubungi admin Atourin."
        />
      </div>
    );
  }

  const admin = createAdminClient();
  // Pilih project_desa paling aktif: prioritas project status berjalan,
  // fallback ke yang paling baru dibuat.
  const { data: pdRows } = await admin
    .from("project_desa")
    .select("id, project_id, created_at, project:project(id, status, created_at)")
    .eq("desa_id", desaId)
    .order("created_at", { ascending: false });
  type Row = {
    id: string;
    project_id: string;
    created_at: string;
    project: { id: string; status: string; created_at: string } | null;
  };
  const rows = (pdRows ?? []) as unknown as Row[];
  const active =
    rows.find((r) => r.project?.status === "active") ??
    rows.find((r) => r.project?.status === "planning") ??
    rows[0] ??
    null;

  if (!active) {
    return (
      <div className="space-y-5">
        <Link
          href="/desa/profil"
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke profil
        </Link>
        <EmptyState
          icon={MapPin}
          title="Belum ada project pendampingan"
          description="Data baseline desa dikumpulkan lewat project pendampingan. Hubungi admin Atourin untuk mendaftarkan desa Anda."
        />
      </div>
    );
  }

  const schema = await getDefaultBaselineSchema();
  if (!schema) notFound();
  const existing = await getBaselineData(active.id, { asAdmin: true });

  return (
    <div className="space-y-5">
      <Link
        href="/desa/profil"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke profil
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Edit Profil Desa
        </h1>
        <p className="mt-1 text-sm text-atr-fg-muted">
          Form ini sama dengan form baseline yang diisi peserta program. Anda
          dan peserta saling melengkapi data desa - yang Anda isi di sini
          langsung terlihat di profil, dan sebaliknya.
        </p>
        {existing?.submitted_at && (
          <p className="mt-2 text-xs text-atr-arti">
            ✓ Data baseline aktif, terakhir diupdate{" "}
            {new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(existing.submitted_at))}
          </p>
        )}
      </header>

      <div className="flex items-start gap-2.5 rounded-xl border border-atr-purple/30 bg-atr-purple-50/40 px-3.5 py-3 text-xs text-atr-fg">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-atr-purple-600" />
        <p>
          Beberapa field (alamat, kontak, deskripsi, koordinat) tersinkronisasi
          dua arah dengan profil desa di tampilan Atourin/Mitra. Sebagian besar
          field lain juga dapat di-sync otomatis dari Hub via tombol di
          halaman profil.
        </p>
      </div>

      <BaselineForm
        projectDesaId={active.id}
        schema={schema}
        initialData={existing?.data ?? {}}
      />
    </div>
  );
}
