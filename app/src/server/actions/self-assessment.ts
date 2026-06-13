"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const submitSchema = z.object({
  desa_id: z.string().uuid(),
  criteria_item_id: z.string().uuid(),
});

export async function submitCriteriaItem(
  input: z.input<typeof submitSchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase.rpc("submit_criteria_item", {
    p_desa_id: parsed.data.desa_id,
    p_criteria_item_id: parsed.data.criteria_item_id,
  });
  if (error) return { error: error.message };
  revalidatePath("/desa/self-assessment");
  revalidatePath("/desa/dashboard");
  return { ok: true };
}

const verifySchema = z.object({
  progress_id: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
});

export async function verifyCriteriaItem(
  input: z.input<typeof verifySchema>,
) {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase.rpc("verify_criteria_item", {
    p_criteria_progress_id: parsed.data.progress_id,
    p_decision: parsed.data.decision,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
