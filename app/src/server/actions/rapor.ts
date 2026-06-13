"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const saveSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  pre_test_score: z.coerce.number().min(0).max(100).nullable().optional(),
  post_test_score: z.coerce.number().min(0).max(100).nullable().optional(),
  attendance: z.coerce.number().min(0).max(100).nullable().optional(),
  survey_kepuasan: z
    .record(z.union([z.string(), z.number()]))
    .nullable()
    .optional(),
});

export async function saveRapor(input: z.input<typeof saveSchema>) {
  await requireRole("superadmin");
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Input tidak valid" };
  }
  const supabase = createClient();
  const pre = parsed.data.pre_test_score ?? null;
  const post = parsed.data.post_test_score ?? null;
  const improvement =
    pre != null && post != null && pre > 0
      ? Math.round(((post - pre) / pre) * 100)
      : null;

  const { error } = await supabase
    .from("rapor_peserta")
    .upsert(
      {
        project_id: parsed.data.project_id,
        user_id: parsed.data.user_id,
        pre_test_score: pre,
        post_test_score: post,
        attendance: parsed.data.attendance ?? null,
        improvement_percent: improvement,
        survey_kepuasan: parsed.data.survey_kepuasan ?? null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,project_id" },
    );
  if (error) return { error: error.message };

  revalidatePath(`/atourin/projects/${parsed.data.project_id}/rapor`);
  revalidatePath(`/atourin/projects/${parsed.data.project_id}/rapor/${parsed.data.user_id}`);
  return { ok: true };
}
