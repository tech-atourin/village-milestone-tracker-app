export const metadata = { title: "Detail Sesi" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getSessionDetail } from "@/server/queries/pendampingan";
import { createClient } from "@/lib/supabase/server";
import { SesiDetailEditor } from "./editor";
import { signEvidenceUrls } from "@/server/actions/evidence";

async function loadCandidatePeserta(projectDesaId: string) {
  const supabase = createClient();
  // Resolve project_id + desa_id from project_desa
  const { data: pd } = await supabase
    .from("project_desa")
    .select("project_id, desa_id")
    .eq("id", projectDesaId)
    .maybeSingle();
  if (!pd) return [];
  const row = pd as { project_id: string; desa_id: string };
  const { data } = await supabase
    .from("project_memberships")
    .select("user_id, user:users!project_memberships_user_id_fkey(id, full_name, jabatan, gender)")
    .eq("project_id", row.project_id)
    .eq("desa_id", row.desa_id)
    .in("role", ["peserta", "pendamping"])
    .eq("status", "active");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    user_id: r.user_id as string,
    full_name: (r.user?.full_name as string) ?? "-",
    jabatan: (r.user?.jabatan as string) ?? null,
    gender: (r.user?.gender as "L" | "P" | null) ?? null,
  }));
}

export default async function SesiDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await getSessionDetail(params.id);
  if (!data) notFound();

  // Permission: narasumber yang punya OR superadmin
  if (
    data.narasumber_id !== user.id &&
    user.global_role !== "superadmin"
  ) {
    // For non-owner narasumber, render read-only view (still allow reading via RLS)
  }

  const candidates = await loadCandidatePeserta(data.project_desa_id);
  const signedUrls = await signEvidenceUrls(data.evidence_paths);

  return (
    <div className="space-y-6">
      <Link
        href="/narasumber/sesi"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar sesi
      </Link>

      {/* Header card - Informasi Pendampingan */}
      <header className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        <div className="bg-gradient-to-br from-atr-purple-50 to-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600">
                Hari {data.day_number} / {data.total_days}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-atr-fg">
                {data.desa_name}
              </h1>
              <p className="text-sm text-atr-fg-muted">
                {[data.kabupaten, data.provinsi].filter(Boolean).join(", ")} ·{" "}
                {data.project_name}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-atr-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Intl.DateTimeFormat("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(data.session_date))}
                </span>
                {(data.start_time || data.end_time) && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(data.start_time ?? "").slice(0, 5) || "-"} – {(data.end_time ?? "").slice(0, 5) || "-"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Narasumber: {data.narasumber_name}
                </span>
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                data.status === "verified"
                  ? "bg-atr-arti/15 text-atr-arti"
                  : data.status === "submitted"
                    ? "bg-atr-yellow/20 text-atr-fg"
                    : "bg-atr-bg-soft text-atr-fg-muted"
              }`}
            >
              {data.status === "verified"
                ? "Terverifikasi"
                : data.status === "submitted"
                  ? "Submitted"
                  : "Draft"}
            </span>
          </div>
        </div>
      </header>

      <SesiDetailEditor
        data={data}
        candidates={candidates}
        signedUrls={Object.fromEntries(signedUrls)}
      />
    </div>
  );
}
