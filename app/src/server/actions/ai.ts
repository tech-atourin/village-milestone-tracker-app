"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { generateDesaSummary } from "@/lib/ai/desa-summary";
import { generateDesaRecommendation } from "@/lib/ai/desa-recommendation";
import { generateDesaSwot } from "@/lib/ai/desa-swot";

// Atourin + mitra can regenerate. We invalidate the cached insight first so
// the AI prompt actually re-runs against fresh context.
async function invalidateInsight(
  projectDesaId: string,
  insightType: "summary" | "recommendation" | "swot",
) {
  const supabase = createClient();
  await supabase
    .from("ai_insights")
    .update({ valid_until: new Date(Date.now() - 1000).toISOString() })
    .eq("target_type", "project_desa")
    .eq("target_id", projectDesaId)
    .eq("insight_type", insightType);
}

async function guard() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Tidak terautentikasi");
  if (user.global_role !== "superadmin" && user.global_role !== "mitra_admin") {
    throw new Error("Hanya superadmin atau mitra yang bisa regenerasi AI");
  }
}

export async function regenerateDesaSummary(projectDesaId: string) {
  await guard();
  await invalidateInsight(projectDesaId, "summary");
  const r = await generateDesaSummary(projectDesaId);
  revalidatePath(`/atourin/projects`);
  return r;
}

export async function regenerateDesaRecommendation(projectDesaId: string) {
  await guard();
  await invalidateInsight(projectDesaId, "recommendation");
  const r = await generateDesaRecommendation(projectDesaId);
  revalidatePath(`/atourin/projects`);
  return r;
}

export async function regenerateDesaSwot(projectDesaId: string) {
  await guard();
  await invalidateInsight(projectDesaId, "swot");
  const r = await generateDesaSwot(projectDesaId);
  revalidatePath(`/atourin/projects`);
  return r;
}
