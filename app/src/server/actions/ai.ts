"use server";

import { requireRole } from "@/lib/auth/rbac";
import { generateDesaSummary } from "@/lib/ai/desa-summary";
import { generateDesaRecommendation } from "@/lib/ai/desa-recommendation";

export async function regenerateDesaSummary(projectDesaId: string) {
  await requireRole("superadmin");
  return generateDesaSummary(projectDesaId);
}

export async function regenerateDesaRecommendation(projectDesaId: string) {
  await requireRole("superadmin");
  return generateDesaRecommendation(projectDesaId);
}
