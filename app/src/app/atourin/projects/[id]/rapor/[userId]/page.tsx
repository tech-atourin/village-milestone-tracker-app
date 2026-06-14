export const metadata = { title: "Rapor Peserta" };

import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

async function loadRapor(projectId: string, userId: string) {
  const supabase = createClient();

  const [{ data: project }, { data: user }, { data: rapor }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, period_start, period_end, organization:organizations(name, logo_url, brand_color_primary)",
      )
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, full_name, email, phone")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("rapor_peserta")
      .select(
        "pre_test_score, post_test_score, improvement_percent, survey_kepuasan, attendance, generated_at",
      )
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  // Desa they represented
  const { data: membership } = await supabase
    .from("project_memberships")
    .select("desa:desa(name, kabupaten, provinsi)")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "peserta")
    .maybeSingle();

  return { project, user, rapor, membership };
}

export default async function RaporPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  await requireRole("superadmin");
  const data = await loadRapor(params.id, params.userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = data.project as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = data.user as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rapor = data.rapor as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = data.membership as any;

  if (!project || !user) notFound();

  const pre = rapor?.pre_test_score ?? null;
  const post = rapor?.post_test_score ?? null;
  const delta =
    pre !== null && post !== null ? Math.round(((post - pre) / Math.max(pre, 1)) * 100) : null;

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4; margin: 18mm; }
              .no-print { display: none !important; }
            }
          `,
        }}
      />

      <div className="no-print mb-6 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
        <strong className="text-atr-fg">Tips:</strong> Cetak halaman ini (Ctrl/⌘+P)
        atau &quot;Save as PDF&quot; di dialog print untuk RAPOR final.
      </div>

      {/* Header */}
      <header className="mb-8 flex items-start justify-between border-b border-atr-outline pb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-purple">
            Rapor Peserta Pendampingan
          </div>
          <h1 className="mt-1 text-2xl font-bold text-atr-fg">
            {user.full_name}
          </h1>
          <p className="mt-1 text-sm text-atr-fg-muted">
            {membership?.desa?.name ?? "—"} ·{" "}
            {[membership?.desa?.kabupaten, membership?.desa?.provinsi]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {project.organization?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.organization.logo_url}
              alt={project.organization.name}
              className="h-14 w-auto"
            />
          ) : (
            <div className="text-right text-xs text-atr-fg-muted">
              <div className="font-bold text-atr-fg">
                {project.organization?.name ?? "—"}
              </div>
              <div>powered by Atourin</div>
            </div>
          )}
        </div>
      </header>

      {/* Project meta */}
      <section className="mb-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Project
          </div>
          <div className="mt-1 font-bold text-atr-fg">{project.name}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Periode
          </div>
          <div className="mt-1 font-bold text-atr-fg">
            {project.period_start} – {project.period_end}
          </div>
        </div>
      </section>

      {/* Scores */}
      <section className="mb-8 rounded-2xl border border-atr-outline p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Hasil Capacity Building
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <ScoreCard label="Pre-test" value={pre} max={100} />
          <ScoreCard label="Post-test" value={post} max={100} />
          <div className="rounded-xl border border-atr-purple/30 bg-atr-purple-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Improvement
            </div>
            <div className="mt-2 text-3xl font-bold text-atr-purple-600">
              {delta !== null ? `${delta > 0 ? "+" : ""}${delta}%` : "—"}
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-atr-fg-muted">
          Kehadiran: {rapor?.attendance != null ? `${rapor.attendance}%` : "—"}
        </div>
      </section>

      {/* Material covered */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Materi yang Diikuti
        </h2>
        <ul className="space-y-1 text-sm text-atr-fg">
          <li>• Kelembagaan & Tata Kelola Desa Wisata</li>
          <li>• Produk Wisata & Storytelling Desa</li>
          <li>• Amenitas & Standar Homestay</li>
          <li>• Pemasaran Digital Desa Wisata</li>
          <li>• Resiliensi & Mitigasi Bencana</li>
          <li>• Produk Ekonomi Kreatif</li>
          <li>• Pengelolaan Keuangan Desa Wisata</li>
        </ul>
      </section>

      {/* Sertifikat note */}
      {delta !== null && delta >= 20 && (
        <section className="mb-8 rounded-2xl border-2 border-atr-yellow bg-atr-yellow/10 p-6">
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Pencapaian
          </div>
          <div className="mt-1 text-lg font-bold text-atr-fg">
            🏆 Peningkatan signifikan &mdash; berhak atas sertifikat kelulusan
          </div>
        </section>
      )}

      {/* Footer signatures */}
      <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-atr-outline pt-8 text-xs">
        <div className="text-center">
          <div className="text-atr-fg-muted">Mengetahui,</div>
          <div className="mt-16 border-t border-atr-fg pt-1 font-bold text-atr-fg">
            {project.organization?.name ?? "Mitra"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-atr-fg-muted">Atourin Mentor</div>
          <div className="mt-16 border-t border-atr-fg pt-1 font-bold text-atr-fg">
            Tim Atourin
          </div>
        </div>
      </footer>

      <div className="mt-8 flex items-center justify-between text-[10px] text-atr-fg-muted">
        <span>
          Generated{" "}
          {rapor?.generated_at
            ? new Date(rapor.generated_at).toLocaleDateString("id-ID")
            : "—"}
        </span>
        <div className="flex items-center gap-2">
          <Image
            src="/logo/vmt/vmt-mark.svg"
            alt="VMT"
            width={20}
            height={20}
          />
          <span className="font-bold">Village Milestone Tracker</span>
        </div>
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  value,
  max,
}: {
  label: string;
  value: number | null;
  max: number;
}) {
  return (
    <div className="rounded-xl border border-atr-outline p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-atr-fg">
        {value ?? "—"}
      </div>
      <div className="text-xs text-atr-fg-muted">/ {max}</div>
    </div>
  );
}
