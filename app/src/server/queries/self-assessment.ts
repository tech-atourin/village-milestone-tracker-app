import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Tier = "rintisan" | "berkembang" | "maju" | "mandiri";

export type CriteriaItemRow = {
  id: string;
  tier: Tier;
  category: string;
  title: string;
  description: string | null;
  weight: number;
  required: boolean;
  sort_order: number;
  status: "not_started" | "submitted" | "verified" | "rejected";
  progress_id: string | null;
  evidence_path: string | null;
  evidence_note: string | null;
};

export async function getRepresentingDesa(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select(
      `representing_desa_id, desa:desa!users_representing_desa_id_fkey(id, name, kabupaten, provinsi, current_classification)`,
    )
    .eq("id", userId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (!d?.desa) return null;
  return {
    desa_id: d.desa.id as string,
    name: d.desa.name as string,
    kabupaten: d.desa.kabupaten as string | null,
    provinsi: d.desa.provinsi as string | null,
    current_classification: d.desa.current_classification as Tier | "unclassified",
  };
}

export async function getActiveMaster() {
  const supabase = createClient();
  const { data } = await supabase
    .from("national_criteria_master")
    .select("id, version, effective_from, source_url")
    .lte("effective_from", new Date().toISOString().slice(0, 10))
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as {
    id: string;
    version: string;
    effective_from: string | null;
    source_url: string | null;
  } | null;
}

export async function listCriteriaForDesa(
  desaId: string,
  masterId: string,
): Promise<CriteriaItemRow[]> {
  const supabase = createClient();
  const [{ data: items }, { data: progress }] = await Promise.all([
    supabase
      .from("national_criteria_item")
      .select("id, tier, category, title, description, weight, required, sort_order")
      .eq("master_id", masterId)
      .order("tier")
      .order("category")
      .order("sort_order"),
    supabase
      .from("national_criteria_progress")
      .select("id, criteria_item_id, status, evidence_path, evidence_note")
      .eq("desa_id", desaId),
  ]);

  const progressMap = new Map<
    string,
    {
      id: string;
      status: CriteriaItemRow["status"];
      evidence_path: string | null;
      evidence_note: string | null;
    }
  >();
  for (const p of (progress ?? []) as Array<{
    id: string;
    criteria_item_id: string;
    status: CriteriaItemRow["status"];
    evidence_path: string | null;
    evidence_note: string | null;
  }>) {
    progressMap.set(p.criteria_item_id, {
      id: p.id,
      status: p.status,
      evidence_path: p.evidence_path,
      evidence_note: p.evidence_note,
    });
  }

  return ((items ?? []) as unknown as Array<{
    id: string;
    tier: Tier;
    category: string;
    title: string;
    description: string | null;
    weight: number;
    required: boolean;
    sort_order: number;
  }>).map((it) => {
    const p = progressMap.get(it.id);
    return {
      ...it,
      status: p?.status ?? "not_started",
      progress_id: p?.id ?? null,
      evidence_path: p?.evidence_path ?? null,
      evidence_note: p?.evidence_note ?? null,
    };
  });
}

export type V1DesaQueueRow = {
  desa_id: string;
  desa_name: string;
  kabupaten: string | null;
  provinsi: string | null;
  current_classification: Tier | "unclassified";
  pending_count: number;
  verified_count: number;
  rejected_count: number;
  last_submitted_at: string | null;
};

/**
 * List V1 self-assessment queue grouped by desa.
 * Returns one row per desa that has at least one criteria progress entry
 * (any status), ordered so desa with most pending reviews bubble up first.
 */
export async function listV1QueueByDesa(): Promise<V1DesaQueueRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("national_criteria_progress")
    .select(
      "desa_id, status, submitted_at, desa:desa(id, name, kabupaten, provinsi, current_classification)",
    )
    .limit(2000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  const byDesa = new Map<string, V1DesaQueueRow>();
  for (const r of rows) {
    if (!r.desa) continue;
    const key = r.desa_id as string;
    const existing =
      byDesa.get(key) ??
      ({
        desa_id: key,
        desa_name: r.desa.name as string,
        kabupaten: (r.desa.kabupaten as string) ?? null,
        provinsi: (r.desa.provinsi as string) ?? null,
        current_classification:
          (r.desa.current_classification as Tier) ?? "unclassified",
        pending_count: 0,
        verified_count: 0,
        rejected_count: 0,
        last_submitted_at: null,
      } as V1DesaQueueRow);
    if (r.status === "submitted") existing.pending_count += 1;
    else if (r.status === "verified") existing.verified_count += 1;
    else if (r.status === "rejected") existing.rejected_count += 1;
    if (
      r.submitted_at &&
      (!existing.last_submitted_at || r.submitted_at > existing.last_submitted_at)
    ) {
      existing.last_submitted_at = r.submitted_at as string;
    }
    byDesa.set(key, existing);
  }
  return Array.from(byDesa.values()).sort((a, b) => {
    // pending desc, then last_submitted_at desc
    if (a.pending_count !== b.pending_count)
      return b.pending_count - a.pending_count;
    const aT = a.last_submitted_at ?? "";
    const bT = b.last_submitted_at ?? "";
    return bT.localeCompare(aT);
  });
}

export async function computeClassification(desaId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("compute_desa_classification", {
    p_desa_id: desaId,
  });
  if (error) return null;
  return data as {
    tier: Tier | "unclassified";
    score: number;
    criteria_version: string | null;
    per_tier: Record<
      string,
      { required_total: number; required_verified: number; score: number; pass: boolean }
    >;
    next_gap: Array<{
      criteria_item_id: string;
      title: string;
      category: string;
      weight: number;
      required: boolean;
    }>;
    note?: string;
  };
}
