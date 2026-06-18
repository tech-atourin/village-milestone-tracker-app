export const metadata = { title: "Verifikasi Klasifikasi" };

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { HubVerifyQueue, type HubSubmissionRow } from "./hub-verify-queue";
import { listCommentsForHubAssessment } from "@/server/queries/assessment-comments";
import { listV1QueueByDesa } from "@/server/queries/self-assessment";
import { V1DesaList } from "./v1-desa-list";
import { KlasifikasiChipNav } from "./klasifikasi-chip-nav";

async function loadV2Queue(): Promise<HubSubmissionRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hub_assessment")
    .select(
      "id, desa_id, level_hasil, skor_total, status, submitted_at, desa:desa(name)",
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    desa_id: r.desa_id,
    desa_name: r.desa?.name ?? "—",
    level_hasil: r.level_hasil,
    skor_total: r.skor_total,
    status: r.status,
    submitted_at: r.submitted_at,
  }));
}

export default async function KlasifikasiQueuePage({
  searchParams,
}: {
  searchParams: { v?: string };
}) {
  const user = await requireRole("superadmin");
  const [v1Desa, v2] = await Promise.all([listV1QueueByDesa(), loadV2Queue()]);
  const v1PendingTotal = v1Desa.reduce((sum, r) => sum + r.pending_count, 0);

  // Preload comments map for all submitted V2 assessments (one Map per assessment)
  const commentsByAssessment = new Map<
    string,
    Map<string, Awaited<ReturnType<typeof listCommentsForHubAssessment>> extends Map<string, infer V> ? V : never>
  >();
  for (const r of v2) {
    const m = await listCommentsForHubAssessment(r.desa_id, r.id);
    commentsByAssessment.set(r.id, m);
  }

  // Flatten total comment count per assessment
  const commentCountByAssessment = new Map<string, number>();
  commentsByAssessment.forEach((map, assessmentId) => {
    let total = 0;
    map.forEach((arr) => {
      total += arr.length;
    });
    commentCountByAssessment.set(assessmentId, total);
  });
  void user;

  // Default to whichever side has data; otherwise V1.
  const initial: "v1" | "v2" =
    searchParams.v === "v2" || searchParams.v === "v1"
      ? (searchParams.v as "v1" | "v2")
      : v2.length > 0
        ? "v2"
        : "v1";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Verifikasi Klasifikasi
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Self-assessment dari desa wisata yang menunggu verifikasi Atourin.
          Tersedia 2 jenis: V1 (ADWI) per kriteria Permenpar dan V2 (Atourin)
          full submission format Hub.
        </p>
      </header>

      <KlasifikasiChipNav
        initial={initial}
        v1Count={v1Desa.length}
        v1Pending={v1PendingTotal}
        v2Count={v2.length}
      >
        {{
          v1: (
            <V1DesaList rows={v1Desa} />
          ),
          v2: (
            <HubVerifyQueue
              rows={v2}
              commentCountByAssessment={Object.fromEntries(
                commentCountByAssessment,
              )}
            />
          ),
        }}
      </KlasifikasiChipNav>
    </div>
  );
}
