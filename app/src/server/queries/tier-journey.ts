import "server-only";

import { createClient } from "@/lib/supabase/server";

const TIER_ORDER = [
  "unclassified",
  "rintisan",
  "berkembang",
  "maju",
  "mandiri",
] as const;
type Tier = (typeof TIER_ORDER)[number];

const TIER_LABEL: Record<Tier, string> = {
  unclassified: "Belum Diklasifikasi",
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};

export type TierJourney = {
  current_tier: Tier;
  current_label: string;
  next_tier: Tier | null;
  next_label: string | null;
  total_criteria_next: number;
  approved_count: number;
  submitted_count: number;
  not_started_count: number;
  progress_pct: number;
  missing_criteria: Array<{
    id: string;
    title: string;
    description: string | null;
    category: string;
    weight: number;
  }>;
};

/**
 * Gap analysis: what criteria does this desa still need to satisfy in order
 * to advance to the next national classification tier? Used by the
 * Self-Improvement Journey block on profil desa.
 *
 * Algorithm:
 *  1. Get the desa's current_classification (default 'rintisan' if null/unclassified).
 *  2. Determine the next tier - if Mandiri already, return null.
 *  3. Pull all criteria at next tier from national_criteria_item.
 *  4. Pull this desa's national_criteria_progress, group by criteria_item_id.
 *  5. Anything not 'approved' is part of the gap. Sort by weight desc, take top 6.
 */
export async function getDesaTierJourney(
  desaId: string,
): Promise<TierJourney | null> {
  const supabase = createClient();

  const { data: desa } = await supabase
    .from("desa")
    .select("current_classification")
    .eq("id", desaId)
    .maybeSingle();
  if (!desa) return null;
  const current = ((desa as { current_classification: string | null })
    .current_classification ?? "unclassified") as Tier;

  const idx = TIER_ORDER.indexOf(current);
  const next: Tier | null =
    idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
  // For unclassified desa, "next" is rintisan (the entry tier).
  const effectiveNext: Tier | null =
    current === "unclassified" ? "rintisan" : next;

  if (!effectiveNext) {
    return {
      current_tier: current,
      current_label: TIER_LABEL[current],
      next_tier: null,
      next_label: null,
      total_criteria_next: 0,
      approved_count: 0,
      submitted_count: 0,
      not_started_count: 0,
      progress_pct: 100,
      missing_criteria: [],
    };
  }

  // Criteria at the next tier
  const { data: criteriaItems } = await supabase
    .from("national_criteria_item")
    .select("id, title, description, category, weight")
    .eq("tier", effectiveNext);
  const items = (criteriaItems ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    category: string;
    weight: number;
  }>;
  const totalNext = items.length;

  // Progress rows for this desa, only those tied to next-tier criteria
  const itemIds = items.map((i) => i.id);
  const { data: progress } =
    itemIds.length > 0
      ? await supabase
          .from("national_criteria_progress")
          .select("criteria_item_id, status")
          .eq("desa_id", desaId)
          .in("criteria_item_id", itemIds)
      : { data: [] as Array<{ criteria_item_id: string; status: string }> };
  const byId = new Map<string, string>();
  for (const p of (progress ?? []) as Array<{
    criteria_item_id: string;
    status: string;
  }>) {
    byId.set(p.criteria_item_id, p.status);
  }

  let approved = 0;
  let submitted = 0;
  let notStarted = 0;
  const missing: TierJourney["missing_criteria"] = [];
  for (const it of items) {
    const status = byId.get(it.id);
    if (status === "approved") approved += 1;
    else if (status === "submitted") submitted += 1;
    else notStarted += 1;
    if (status !== "approved") missing.push(it);
  }
  missing.sort((a, b) => b.weight - a.weight);

  return {
    current_tier: current,
    current_label: TIER_LABEL[current],
    next_tier: effectiveNext,
    next_label: TIER_LABEL[effectiveNext],
    total_criteria_next: totalNext,
    approved_count: approved,
    submitted_count: submitted,
    not_started_count: notStarted,
    progress_pct: totalNext > 0 ? Math.round((approved / totalNext) * 100) : 0,
    missing_criteria: missing.slice(0, 6),
  };
}
