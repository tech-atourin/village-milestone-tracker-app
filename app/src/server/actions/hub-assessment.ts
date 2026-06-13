"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { getActiveHubTemplate } from "@/server/queries/hub-assessment";
import { computeScore } from "@/lib/hub-assessment/scoring";

// =====================================================
// Save / Submit
// =====================================================
const saveSchema = z.object({
  desa_id: z.string().uuid(),
  template_id: z.string().uuid(),
  jawaban: z.record(z.unknown()),
  submit: z.boolean().default(false),
});

export async function saveHubAssessment(
  input: z.input<typeof saveSchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const tmpl = await getActiveHubTemplate();
  if (!tmpl || tmpl.id !== parsed.data.template_id)
    return { error: "Template Jadesta tidak ditemukan" };

  const scored = computeScore(tmpl.definisi, parsed.data.jawaban);
  const supabase = createClient();

  const row = {
    desa_id: parsed.data.desa_id,
    template_id: parsed.data.template_id,
    filled_by: user.id,
    jawaban: parsed.data.jawaban,
    skor_pilar: scored.skor_pilar,
    skor_total: scored.skor_total,
    level_hasil: scored.level_hasil,
    status: parsed.data.submit ? "submitted" : "draft",
    submitted_at: parsed.data.submit ? new Date().toISOString() : null,
  };

  // upsert by (desa_id, template_id)
  const { data: existing } = await supabase
    .from("hub_assessment")
    .select("id")
    .eq("desa_id", parsed.data.desa_id)
    .eq("template_id", parsed.data.template_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("hub_assessment")
      .update(row)
      .eq("id", (existing as { id: string }).id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("hub_assessment").insert(row);
    if (error) return { error: error.message };
  }

  revalidatePath("/desa/self-assessment");
  revalidatePath("/desa/dashboard");
  return {
    ok: true,
    skor_total: scored.skor_total,
    level_hasil: scored.level_hasil,
  };
}
