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
      .select("id, criteria_item_id, status")
      .eq("desa_id", desaId),
  ]);

  const progressMap = new Map<
    string,
    { id: string; status: CriteriaItemRow["status"] }
  >();
  for (const p of (progress ?? []) as Array<{
    id: string;
    criteria_item_id: string;
    status: CriteriaItemRow["status"];
  }>) {
    progressMap.set(p.criteria_item_id, { id: p.id, status: p.status });
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
    };
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
