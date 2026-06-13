import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { VerificationQueue } from "./verification-queue";

type QueueItem = {
  progress_id: string;
  status: "submitted";
  submitted_at: string | null;
  desa: { id: string; name: string };
  criteria: { title: string; category: string; tier: string; required: boolean };
};

async function loadQueue(): Promise<QueueItem[]> {
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

export default async function KlasifikasiQueuePage() {
  await requireRole("superadmin");
  const items = await loadQueue();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Verifikasi Klasifikasi
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Self-assessment dari desa wisata yang menunggu verifikasi Atourin.
        </p>
      </header>

      <VerificationQueue items={items} />
    </div>
  );
}
