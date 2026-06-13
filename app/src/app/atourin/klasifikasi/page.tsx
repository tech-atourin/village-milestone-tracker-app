export const metadata = { title: "Verifikasi Klasifikasi" };

import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";
import { VerificationQueue } from "./verification-queue";
import { HubVerifyQueue, type HubSubmissionRow } from "./hub-verify-queue";
import { listCommentsForHubAssessment } from "@/server/queries/assessment-comments";

type QueueItem = {
  progress_id: string;
  status: "submitted";
  submitted_at: string | null;
  desa: { id: string; name: string };
  criteria: { title: string; category: string; tier: string; required: boolean };
};

async function loadV1Queue(): Promise<QueueItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("national_criteria_progress")
    .select(
      `
      id, status, submitted_at,
      desa:desa(id, name),
      criteria:national_criteria_item(title, category, tier, required)
    `,
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    progress_id: r.id,
    status: r.status,
    submitted_at: r.submitted_at,
    desa: { id: r.desa?.id, name: r.desa?.name },
    criteria: {
      title: r.criteria?.title,
      category: r.criteria?.category,
      tier: r.criteria?.tier,
      required: r.criteria?.required,
    },
  })) as QueueItem[];
}

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

export default async function KlasifikasiQueuePage() {
  const user = await requireRole("superadmin");
  const [v1, v2] = await Promise.all([loadV1Queue(), loadV2Queue()]);

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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Verifikasi Klasifikasi
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Self-assessment dari desa wisata yang menunggu verifikasi Atourin.
          Tersedia 2 jenis: V1 Permenparekraf (per kriteria) dan V2 Hub
          (full submission).
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            V2 Hub Submissions ({v2.length})
          </h2>
          {v2.length > 0 && (
            <p className="text-[11px] text-atr-arti">
              ⚡ Approve akan otomatis promote klasifikasi desa
            </p>
          )}
        </div>
        <HubVerifyQueue
          rows={v2}
          commentCountByAssessment={Object.fromEntries(commentCountByAssessment)}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          V1 Per-Kriteria ({v1.length})
        </h2>
        <VerificationQueue items={v1} />
      </section>
    </div>
  );
}
