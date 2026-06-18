export const metadata = { title: "Sertifikat" };

import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

async function loadCert(projectId: string, userId: string) {
  const supabase = createClient();
  const [{ data: project }, { data: user }, { data: rapor }, { data: membership }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          `id, name, period_start, period_end,
           organization:organizations(name, logo_url)`,
        )
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("users")
        .select("id, full_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("rapor_peserta")
        .select(
          "pre_test_score, post_test_score, improvement_percent, attendance",
        )
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("project_memberships")
        .select("desa:desa(name, kabupaten, provinsi)")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .eq("role", "peserta")
        .maybeSingle(),
    ]);

  return { project, user, rapor, membership };
}

export default async function SertifikatPage({
  params,
}: {
  params: { id: string; userId: string };
}) {
  await requireRole("superadmin");
  const data = await loadCert(params.id, params.userId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = data.project as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = data.user as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rapor = data.rapor as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = data.membership as any;

  if (!project || !user) notFound();

  // Eligibility check
  const post = rapor?.post_test_score ?? 0;
  const improvement = rapor?.improvement_percent ?? 0;
  const eligible = post >= 70 && improvement >= 20;

  const today = new Date();
  const certNo = `VMT/${params.id.slice(0, 6).toUpperCase()}/${params.userId.slice(0, 6).toUpperCase()}/${today.getFullYear()}`;

  return (
    <main className="min-h-screen bg-atr-bg-soft p-6 print:bg-white print:p-0">
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 landscape; margin: 0; }
              .no-print { display: none !important; }
              .cert-page { box-shadow: none !important; border: none !important; }
            }
          `,
        }}
      />

      <div className="no-print mx-auto mb-4 max-w-4xl rounded-lg border border-atr-outline bg-white p-3 text-xs text-atr-fg-muted">
        <strong className="text-atr-fg">Tips:</strong> Cetak landscape A4
        (Ctrl/⌘+P, &quot;Save as PDF&quot;).
        {!eligible && (
          <span className="ml-2 text-atr-red">
            ⚠️ Peserta belum memenuhi syarat sertifikat (Post-test ≥70 +
            improvement ≥20%). Sertifikat tetap bisa di-print untuk preview.
          </span>
        )}
      </div>

      {/* Certificate page - A4 landscape (297mm × 210mm) */}
      <div
        className="cert-page relative mx-auto bg-white shadow-atr-4 print:shadow-none"
        style={{
          width: "297mm",
          minHeight: "210mm",
          padding: "16mm",
        }}
      >
        {/* Purple gradient corner accents */}
        <div
          className="absolute left-0 top-0 h-32 w-32"
          style={{
            background:
              "linear-gradient(135deg, #7068D5 0%, #574BAE 100%)",
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-32 w-32"
          style={{
            background:
              "linear-gradient(135deg, #7068D5 0%, #574BAE 100%)",
            clipPath: "polygon(100% 100%, 0 100%, 100% 0)",
          }}
        />

        {/* Header */}
        <header className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/vmt/vmt-app-icon.svg"
              alt="VMT"
              width={56}
              height={56}
              className="rounded-lg"
            />
            <div>
              <div className="text-sm font-bold tracking-tight text-atr-fg">
                Village Milestone Tracker
              </div>
              <div className="text-xs text-atr-fg-muted">by Atourin</div>
            </div>
          </div>
          {project.organization?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.organization.logo_url}
              alt={project.organization.name}
              className="h-14 w-auto"
            />
          ) : (
            <div className="text-right">
              <div className="text-sm font-bold text-atr-fg">
                {project.organization?.name}
              </div>
            </div>
          )}
        </header>

        {/* Title */}
        <div className="relative mt-12 text-center">
          <div className="text-sm font-bold uppercase tracking-[0.3em] text-atr-purple">
            Sertifikat Kelulusan
          </div>
          <div className="mt-1 text-xs text-atr-fg-muted">
            Certificate of Completion
          </div>

          <div className="mt-8 text-xs uppercase tracking-wide text-atr-fg-muted">
            Diberikan kepada
          </div>
          <h1
            className="mt-3 text-5xl font-bold text-atr-fg"
            style={{ fontFamily: "Product Sans" }}
          >
            {user.full_name}
          </h1>
          {membership?.desa?.name && (
            <div className="mt-2 text-sm text-atr-fg-muted">
              Mewakili {membership.desa.name}
              {membership.desa.kabupaten && `, ${membership.desa.kabupaten}`}
            </div>
          )}

          <p className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-atr-fg">
            Atas keberhasilan menyelesaikan program
            <br />
            <strong className="text-atr-purple-600">{project.name}</strong>
            <br />
            yang diselenggarakan oleh {project.organization?.name ?? "-"} bersama Atourin
            pada periode {project.period_start} – {project.period_end}.
          </p>

          {/* Achievement metrics */}
          {rapor && (
            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-4 rounded-2xl border border-atr-purple/20 bg-atr-purple-50/30 p-4">
              <Metric label="Pre-test" value={rapor.pre_test_score ?? "-"} />
              <Metric label="Post-test" value={rapor.post_test_score ?? "-"} />
              <Metric
                label="Improvement"
                value={
                  rapor.improvement_percent != null
                    ? `${rapor.improvement_percent > 0 ? "+" : ""}${rapor.improvement_percent}%`
                    : "-"
                }
                highlight
              />
            </div>
          )}
        </div>

        {/* Signatures */}
        <footer className="absolute bottom-12 left-0 right-0 grid grid-cols-2 gap-16 px-16 text-xs">
          <div className="text-center">
            <div className="text-atr-fg-muted">
              {project.organization?.name ?? "Mitra"}
            </div>
            <div className="mt-16 border-t border-atr-fg pt-2 font-bold text-atr-fg">
              ____________________________
            </div>
            <div className="mt-1 text-[10px] text-atr-fg-muted">
              Nama & Tanda Tangan
            </div>
          </div>
          <div className="text-center">
            <div className="text-atr-fg-muted">Atourin Mentor Lead</div>
            <div className="mt-16 border-t border-atr-fg pt-2 font-bold text-atr-fg">
              ____________________________
            </div>
            <div className="mt-1 text-[10px] text-atr-fg-muted">
              Nama & Tanda Tangan
            </div>
          </div>
        </footer>

        {/* Cert no */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-atr-fg-muted">
          No. {certNo} ·{" "}
          {today.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold ${highlight ? "text-atr-purple-600" : "text-atr-fg"}`}
      >
        {value}
      </div>
    </div>
  );
}
