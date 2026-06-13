"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const saveSchema = z.object({
  project_desa_id: z.string().uuid(),
  schema_version: z.string(),
  data: z.record(z.unknown()),
  submit: z.boolean().default(false),
});

export type SaveBaselineInput = z.input<typeof saveSchema>;

export async function saveBaseline(input: SaveBaselineInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();

  // Upsert latest baseline row for this project_desa
  const { data: existing } = await supabase
    .from("desa_baseline_data")
    .select("id")
    .eq("project_desa_id", parsed.data.project_desa_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    project_desa_id: parsed.data.project_desa_id,
    schema_version: parsed.data.schema_version,
    data: parsed.data.data,
    submitted_at: parsed.data.submit ? new Date().toISOString() : null,
    submitted_by: parsed.data.submit ? user.id : null,
  };

  if (existing) {
    const { error } = await supabase
      .from("desa_baseline_data")
      .update(payload)
      .eq("id", (existing as { id: string }).id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("desa_baseline_data")
      .insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath(`/peserta/projects/${parsed.data.project_desa_id}`);
  return { ok: true };
}
