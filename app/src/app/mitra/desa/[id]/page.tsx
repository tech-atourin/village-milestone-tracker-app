export const metadata = { title: "Detail Desa" };

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";
import { getDesaDetail } from "@/server/queries/desa-master";
import { getDesaTierJourney } from "@/server/queries/tier-journey";
import { DesaDetailSections } from "@/components/desa/desa-detail-sections";
import { createClient } from "@/lib/supabase/server";
import {
  listCommentsForCriteriaItem,
  listCommentsForHubAssessment,
} from "@/server/queries/assessment-comments";

export default async function MitraDesaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("mitra_admin");
  const user = await getCurrentUser();
  const [data, journey] = await Promise.all([
    getDesaDetail(params.id),
    getDesaTierJourney(params.id),
  ]);
  if (!data || !user) notFound();

  // Hub assessment id for this desa (if any) - to fetch thread counts
  const supabase = createClient();
  const { data: hubA } = await supabase
    .from("hub_assessment")
    .select("id")
    .eq("desa_id", params.id)
    .maybeSingle();
  const hubAssessmentId = (hubA as { id: string } | null)?.id ?? null;

  const [criteriaMap, hubMap] = await Promise.all([
    listCommentsForCriteriaItem(params.id),
    hubAssessmentId
      ? listCommentsForHubAssessment(params.id, hubAssessmentId)
      : Promise.resolve(new Map<string, []>()),
  ]);

  let criteriaCount = 0;
  criteriaMap.forEach((arr) => {
    criteriaCount += arr.length;
  });
  let hubCount = 0;
  hubMap.forEach((arr) => {
    hubCount += arr.length;
  });

  return (
    <div className="space-y-6">
      <Link
        href="/mitra/desa"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar desa
      </Link>
      <DesaDetailSections data={data} viewerRole="mitra" journey={journey} />
      {(criteriaCount > 0 || hubCount > 0) && (
        <article className="rounded-2xl border border-atr-purple/30 bg-atr-purple-50/30 p-5 shadow-atr-1">
          <header className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-atr-purple" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Diskusi Self-Assessment
            </h3>
          </header>
          <p className="text-xs text-atr-fg-muted">
            Komunikasi antara desa wisata dan tim Atourin terkait
            self-assessment desa ini.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat label="V1 Per-Kriteria" value={criteriaCount} />
            <Stat label="V2 Per-Question" value={hubCount} />
          </div>
          <p className="mt-3 text-[11px] italic text-atr-fg-muted">
            Mitra bisa melihat thread non-internal. Untuk balas, login
            sebagai admin Atourin.
          </p>
        </article>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-atr-outline bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-bold text-atr-fg">{value}</div>
      <div className="text-[10px] text-atr-fg-muted">komentar</div>
    </div>
  );
}
