import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type BatchRow = {
  id: string;
  project_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  quota: number | null;
  sort_order: number;
  peserta_count: number;
};

// Daftar batch sebuah project + jumlah peserta per batch. Admin/staff pakai
// admin client (mitra_admin tidak punya RLS read di project_batches lintas).
export async function listProjectBatches(
  projectId: string,
): Promise<BatchRow[]> {
  const admin = createAdminClient();
  const { data: batches } = await admin
    .from("project_batches")
    .select("id, project_id, name, start_date, end_date, quota, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!batches?.length) return [];

  // Hitung peserta per batch (role peserta, aktif).
  const { data: members } = await admin
    .from("project_memberships")
    .select("batch_id")
    .eq("project_id", projectId)
    .eq("role", "peserta")
    .eq("status", "active")
    .not("batch_id", "is", null);
  const countMap = new Map<string, number>();
  for (const m of members ?? []) {
    const k = m.batch_id as string;
    countMap.set(k, (countMap.get(k) ?? 0) + 1);
  }

  return batches.map((b) => ({
    id: b.id as string,
    project_id: b.project_id as string,
    name: b.name as string,
    start_date: (b.start_date as string | null) ?? null,
    end_date: (b.end_date as string | null) ?? null,
    quota: (b.quota as number | null) ?? null,
    sort_order: (b.sort_order as number) ?? 0,
    peserta_count: countMap.get(b.id as string) ?? 0,
  }));
}
