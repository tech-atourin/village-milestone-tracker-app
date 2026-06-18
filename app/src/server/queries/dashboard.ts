import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type AttentionItem = {
  id: string;
  kind: "review" | "criteria" | "stagnant" | "low_progress" | "no_baseline";
  title: string;
  subtitle: string;
  href: string;
  count?: number;
};

const STAGNANT_DAYS = 14;

export async function getAttentionItems(): Promise<AttentionItem[]> {
  // Caller is /atourin/dashboard which already requires superadmin; admin
  // client avoids the RLS-on-helper-functions trap that returned 0 items.
  const supabase = createAdminClient();
  const items: AttentionItem[] = [];

  // 1. Pending checklist review
  const { count: pendingReview } = await supabase
    .from("checklist_progress")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");
  if ((pendingReview ?? 0) > 0) {
    items.push({
      id: "review-queue",
      kind: "review",
      title: `${pendingReview} checklist menunggu review`,
      subtitle: "Peserta sudah submit, waktu Anda untuk approve/reject.",
      href: "/atourin/projects",
      count: pendingReview ?? 0,
    });
  }

  // 2. Pending criteria verification (V1 Permenpar per-kriteria) — show both
  // the kriteria count AND the desa count so reviewer knows the granularity.
  const { data: ncpRows } = await supabase
    .from("national_criteria_progress")
    .select("desa_id")
    .eq("status", "submitted");
  const ncpItems = (ncpRows ?? []) as Array<{ desa_id: string }>;
  const desaWithPending = new Set(ncpItems.map((r) => r.desa_id)).size;
  if (ncpItems.length > 0) {
    items.push({
      id: "criteria-queue",
      kind: "criteria",
      title: `${ncpItems.length} klaim kriteria dari ${desaWithPending} desa wisata`,
      subtitle: "Desa wisata sudah klaim kriteria V1 Permenpar, perlu verifikasi per kriteria.",
      href: "/atourin/klasifikasi",
      count: ncpItems.length,
    });
  }

  // 2b. Pending V2 hub_assessment submissions (whole-assessment, not per-question)
  const { count: hubSubmitted } = await supabase
    .from("hub_assessment")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");
  if ((hubSubmitted ?? 0) > 0) {
    items.push({
      id: "hub-assessment-queue",
      kind: "criteria",
      title: `${hubSubmitted} assessment V2 Hub menunggu verifikasi`,
      subtitle: "Desa wisata sudah submit assessment V2, perlu approve/tolak.",
      href: "/atourin/klasifikasi",
      count: hubSubmitted ?? 0,
    });
  }

  // 3. Stagnant desa: project_desa where last checklist submission > STAGNANT_DAYS days ago
  const cutoff = new Date(Date.now() - STAGNANT_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();
  const { data: stagnantRaw } = await supabase
    .from("project_desa")
    .select(
      `id, project_id, desa:desa(name),
       desa_topik_instance!inner(
         checklist_progress(submitted_at)
       )`,
    )
    .limit(500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stagnant = ((stagnantRaw ?? []) as any[]).filter((pd) => {
    const submissions = (pd.desa_topik_instance ?? [])
      .flatMap((dti: { checklist_progress?: { submitted_at: string | null }[] }) =>
        (dti.checklist_progress ?? []).map((cp) => cp.submitted_at),
      )
      .filter(Boolean) as string[];
    if (submissions.length === 0) return false;
    const latest = submissions.sort().reverse()[0];
    return latest < cutoff;
  });
  if (stagnant.length > 0) {
    items.push({
      id: "stagnant-desa",
      kind: "stagnant",
      title: `${stagnant.length} desa stagnan > ${STAGNANT_DAYS} hari`,
      subtitle: "Tidak ada submission baru. Pertimbangkan intervensi.",
      href: "/atourin/projects",
      count: stagnant.length,
    });
  }

  // 4. Active projects with low overall progress (<25%)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status")
    .eq("status", "active")
    .is("deleted_at", null);
  if (projects) {
    for (const p of projects as Array<{ id: string; name: string }>) {
      const { data: instances } = await supabase
        .from("desa_topik_instance")
        .select(
          "completion_percent, project_desa!inner(project_id)",
        )
        .eq("project_desa.project_id", p.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr = (instances ?? []) as any[];
      if (arr.length === 0) continue;
      const avg = arr.reduce((a, i) => a + Number(i.completion_percent), 0) / arr.length;
      if (avg < 25) {
        items.push({
          id: `low-progress-${p.id}`,
          kind: "low_progress",
          title: `${p.name} progress baru ${Math.round(avg)}%`,
          subtitle: "Project aktif tapi progress di bawah 25%.",
          href: `/atourin/projects/${p.id}`,
        });
      }
    }
  }

  return items;
}
