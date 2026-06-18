export const metadata = {
  title: "Detail Assessment Klasifikasi Desa V2 (Atourin)",
};

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, MessageSquare, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HubAssessmentForm } from "@/components/hub-assessment/hub-form";
import { HubVerifyBar } from "./verify-bar";
import { listCommentsForHubAssessment } from "@/server/queries/assessment-comments";
import type {
  HubAssessmentTemplate,
  HubAssessmentResponse,
} from "@/server/queries/hub-assessment";

const TIER_COLOR: Record<string, string> = {
  Rintisan: "bg-atr-yellow/20 text-atr-fg border-atr-yellow/40",
  Berkembang: "bg-atr-arti/15 text-atr-arti border-atr-arti/30",
  Maju: "bg-atr-purple-50 text-atr-purple-600 border-atr-purple/30",
  Mandiri: "bg-atr-purple-light/60 text-atr-purple-800 border-atr-purple/50",
};

function fmt(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function HubAssessmentViewerPage({
  params,
}: {
  params: { assessmentId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Both superadmin & mitra_admin can review; desa_wisata is redirected
  // away (they use the editable /desa/self-assessment instead).
  if (user.global_role !== "superadmin" && user.global_role !== "mitra_admin") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data: assessment } = await supabase
    .from("hub_assessment")
    .select(
      "id, desa_id, template_id, jawaban, skor_pilar, skor_total, level_hasil, status, submitted_at, verifier_note, verified_at",
    )
    .eq("id", params.assessmentId)
    .maybeSingle();
  if (!assessment) notFound();
  const a = assessment as unknown as HubAssessmentResponse;

  const { data: tpl } = await supabase
    .from("hub_assessment_template")
    .select("id, versi, name, description, definisi, is_active")
    .eq("id", a.template_id)
    .maybeSingle();
  if (!tpl) notFound();
  const template = tpl as unknown as HubAssessmentTemplate;

  const { data: desa } = await supabase
    .from("desa")
    .select("id, name, kabupaten, provinsi")
    .eq("id", a.desa_id)
    .maybeSingle();

  const commentsByQuestion = await listCommentsForHubAssessment(
    a.desa_id,
    a.id,
  );
  let totalComments = 0;
  commentsByQuestion.forEach((arr) => {
    totalComments += arr.length;
  });

  return (
    <div className="space-y-6">
      <Link
        href="/atourin/klasifikasi"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Verifikasi Klasifikasi
      </Link>

      <header className="rounded-2xl border border-atr-outline bg-gradient-to-br from-atr-purple-50 to-white p-6 shadow-atr-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-atr-purple-600">
              Assessment Klasifikasi Desa V2 (Atourin) · Read-only Viewer
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-atr-fg">
              {desa?.name ?? "-"}
            </h1>
            <p className="text-sm text-atr-fg-muted">
              {[desa?.kabupaten, desa?.provinsi].filter(Boolean).join(", ") ||
                "-"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-atr-bg-soft px-2 py-0.5 font-bold uppercase text-atr-fg-muted">
                <FileText className="h-3 w-3" />
                {template.name} · v{template.versi}
              </span>
              <StatusBadge status={a.status} />
              {a.submitted_at && (
                <span className="text-atr-fg-muted">
                  · Disubmit {fmt(a.submitted_at)}
                </span>
              )}
              {a.verified_at && (
                <span className="text-atr-fg-muted">
                  · Diverifikasi {fmt(a.verified_at)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Hasil
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-atr-fg">
                {a.skor_total ?? "-"}%
              </span>
              {a.level_hasil && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    TIER_COLOR[a.level_hasil] ?? ""
                  }`}
                >
                  <Award className="h-3 w-3" />
                  {a.level_hasil}
                </span>
              )}
            </div>
            <Link
              href={`/atourin/desa/${a.desa_id}`}
              className="text-[11px] font-bold text-atr-purple-600 hover:underline"
            >
              Lihat profil desa →
            </Link>
          </div>
        </div>
        {a.verifier_note && (
          <div className="mt-4 rounded-lg border border-atr-yellow/40 bg-atr-yellow/10 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
              Catatan Verifikasi
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-atr-fg">
              {a.verifier_note}
            </p>
          </div>
        )}
      </header>

      {/* Verify / reject - superadmin only, when awaiting review */}
      {user.global_role === "superadmin" && a.status === "submitted" && (
        <HubVerifyBar
          assessmentId={a.id}
          desaName={desa?.name ?? "desa"}
          levelHasil={a.level_hasil}
        />
      )}

      <article className="rounded-2xl border border-atr-purple/30 bg-atr-purple-50/30 p-4 shadow-atr-1">
        <div className="flex items-center gap-2 text-xs text-atr-fg">
          <MessageSquare className="h-3.5 w-3.5 text-atr-purple" />
          <span className="font-bold">{totalComments}</span> komentar di seluruh
          pertanyaan.{" "}
          {user.global_role === "superadmin" ? (
            <>Anda bisa balas / kirim feedback per pertanyaan di bawah.</>
          ) : (
            <>Mitra dapat melihat thread non-internal.</>
          )}
        </div>
      </article>
      <p className="-mt-2 px-1 text-[11px] text-atr-fg-muted">
        ℹ️ Assessment V2 berbasis kuesioner ber-skor (single/multi/slider),
        jadi verifikasi dilakukan di tingkat submission - bukan upload bukti
        per item seperti V1 Permenpar. Diskusi per pertanyaan tetap bisa lewat
        thread di bawah.
      </p>

      <HubAssessmentForm
        desaId={a.desa_id}
        template={template}
        existing={a}
        commentsByQuestion={commentsByQuestion}
        currentUserId={user.id}
        currentUserRole={user.global_role}
        forceReadOnly
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorByStatus: Record<string, string> = {
    draft: "bg-atr-bg-soft text-atr-fg-muted",
    submitted: "bg-atr-yellow/20 text-atr-fg",
    verified: "bg-atr-arti/15 text-atr-arti",
  };
  const labelByStatus: Record<string, string> = {
    draft: "Draft",
    submitted: "Menunggu Verifikasi",
    verified: "Terverifikasi",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
        colorByStatus[status] ?? "bg-atr-bg-soft text-atr-fg-muted"
      }`}
    >
      {labelByStatus[status] ?? status}
    </span>
  );
}
