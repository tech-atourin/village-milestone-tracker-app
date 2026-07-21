export const metadata = { title: "Rapor Saya" };

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Award, GraduationCap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { predikat } from "@/lib/rapor/scoring";

/**
 * Rapor versi peserta: Nilai Akhir + predikat, plus Pre-Test & Post-Test
 * (peserta memang sudah tahu nilainya dari hasil pengisian).
 * Rincian bobot penilaian serta nilai Tugas & Keaktifan sengaja TIDAK
 * ditampilkan; itu hanya untuk internal (mitra/superadmin).
 */
export default async function PesertaRaporPage({
  params,
}: {
  params: { projectId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Wajib anggota aktif project ini.
  const { data: member } = await admin
    .from("project_memberships")
    .select("id")
    .eq("project_id", params.projectId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  if (!member || member.length === 0) notFound();

  const [{ data: project }, { data: rapor }] = await Promise.all([
    admin
      .from("projects")
      .select("id, name, period_start, period_end")
      .eq("id", params.projectId)
      .maybeSingle(),
    admin
      .from("rapor_peserta")
      .select("final_score, pre_test_score, post_test_score, generated_at")
      .eq("project_id", params.projectId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!project) notFound();

  const p = project as { id: string; name: string };
  const r = rapor as {
    final_score: number | null;
    pre_test_score: number | null;
    post_test_score: number | null;
  } | null;
  const finalScore = r?.final_score ?? null;

  return (
    <div className="space-y-5">
      <Link
        href={`/peserta/training/${p.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke pelatihan
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Rapor Saya
        </h1>
        <p className="text-sm text-atr-fg-muted">{p.name}</p>
      </header>

      <section className="rounded-2xl border-2 border-atr-purple/30 bg-atr-purple-50/40 p-6 text-center shadow-atr-1">
        <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Nilai Akhir
        </div>
        {finalScore != null ? (
          <>
            <div className="mt-1 text-5xl font-bold text-atr-purple-700">
              {Number(finalScore).toFixed(2)}
            </div>
            <div className="mt-1 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-atr-purple-700">
              {predikat(Number(finalScore))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-2 text-2xl font-bold text-atr-fg-muted">
              Belum tersedia
            </div>
            <p className="mt-1 text-xs text-atr-fg-muted">
              Nilai akhir akan muncul setelah penyelenggara selesai menilai.
            </p>
          </>
        )}
      </section>

      {/* Pre-test & post-test: peserta memang sudah tahu dari hasil pengisian. */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Pre-test", value: r?.pre_test_score, highlight: false },
          { label: "Post-test", value: r?.post_test_score, highlight: true },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-atr-outline bg-white p-4 text-center shadow-atr-1"
          >
            <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
              {c.label}
            </div>
            <div
              className={`mt-0.5 text-2xl font-bold ${
                c.highlight ? "text-atr-purple-700" : "text-atr-fg"
              }`}
            >
              {c.value != null ? Number(c.value) : "-"}
            </div>
          </div>
        ))}
      </div>

      {finalScore != null && (
        <Link
          href={`/peserta/rapor/${p.id}/sertifikat`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-atr-yellow/40 bg-atr-yellow/10 p-4 transition hover:bg-atr-yellow/20"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-yellow text-atr-fg">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-atr-fg">Buka Sertifikat</div>
            <div className="text-xs text-atr-fg-muted">
              Sertifikat kelulusan program Anda
            </div>
          </div>
        </Link>
      )}

      <div className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
        <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          <GraduationCap className="h-3.5 w-3.5" />
          Catatan
        </h2>
        <p className="mt-1.5 text-sm text-atr-fg-muted">
          Nilai akhir dihitung oleh penyelenggara dari beberapa komponen
          penilaian selama program berlangsung. Bila ada pertanyaan mengenai
          nilai Anda, hubungi admin/mitra penyelenggara.
        </p>
      </div>
    </div>
  );
}
