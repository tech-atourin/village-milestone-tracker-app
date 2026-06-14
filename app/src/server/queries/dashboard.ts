import "server-only";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = createClient();
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

  // 2. Pending criteria verification
  const { count: pendingCriteria } = await supabase
    .from("national_criteria_progress")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");
  if ((pendingCriteria ?? 0) > 0) {
    items.push({
      id: "criteria-queue",
      kind: "criteria",
      title: `${pendingCriteria} self-assessment desa wisata menunggu verifikasi`,
      subtitle: "Desa wisata sudah klaim kriteria, perlu Anda verifikasi.",
      href: "/atourin/klasifikasi",
      count: pendingCriteria ?? 0,
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
