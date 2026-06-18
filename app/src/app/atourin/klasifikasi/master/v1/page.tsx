export const metadata = { title: "Master Klasifikasi V1 | VMT by Atourin" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { V1MasterEditor, type CriteriaItemRow } from "./v1-master-editor";

export default async function MasterV1Page() {
  await requireRole("superadmin");
  const supabase = createClient();
  const { data: master } = await supabase
    .from("national_criteria_master")
    .select("id, version, source_url, effective_from, effective_to")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const masterId = (master as { id: string } | null)?.id ?? null;

  const { data: items } = masterId
    ? await supabase
        .from("national_criteria_item")
        .select(
          "id, master_id, title, description, category, tier, sort_order, weight, required",
        )
        .eq("master_id", masterId)
        .order("sort_order", { ascending: true })
    : { data: [] };

  return (
    <div className="space-y-5">
      <Link
        href="/atourin/klasifikasi"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Verifikasi Klasifikasi
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Master Klasifikasi V1 (ADWI / Permenpar)
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Kelola daftar kriteria per tier. Perubahan langsung berlaku untuk
          semua desa wisata yang menggunakan klasifikasi V1.
        </p>
      </header>

      {!masterId ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <p className="text-sm font-bold text-atr-fg">
            Belum ada master criteria
          </p>
          <p className="mt-1 text-xs text-atr-fg-muted">
            Hubungi tim engineering untuk seed data master awal.
          </p>
        </div>
      ) : (
        <V1MasterEditor
          masterId={masterId}
          items={(items ?? []) as unknown as CriteriaItemRow[]}
        />
      )}
    </div>
  );
}
