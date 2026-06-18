export const metadata = { title: "Master Klasifikasi V2 | VMT by Atourin" };

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { V2MasterEditor } from "./v2-master-editor";

export default async function MasterV2Page() {
  await requireRole("superadmin");
  const supabase = createClient();
  const { data } = await supabase
    .from("hub_assessment_template")
    .select("id, name, versi, description, definisi, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
          Master Klasifikasi V2 (Atourin / Hub)
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Edit struktur kuesioner V2. Definisi tersimpan sebagai JSON
          (section + question). Validasi otomatis sebelum simpan.
        </p>
      </header>

      {!data ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <p className="text-sm font-bold text-atr-fg">
            Belum ada template aktif
          </p>
        </div>
      ) : (
        <V2MasterEditor
          template={data as unknown as {
            id: string;
            name: string;
            versi: string;
            description: string | null;
            definisi: unknown;
          }}
        />
      )}
    </div>
  );
}
