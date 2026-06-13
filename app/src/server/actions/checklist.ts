"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

// =====================================================
// Peserta submits a checklist item (creates desa_topik_instance
// if missing, upserts checklist_progress → submitted).
// Wraps the SQL RPC + ensures desa_topik_instance exists.
// =====================================================
const submitSchema = z.object({
  project_desa_id: z.string().uuid(),
  project_topik_id: z.string().uuid(),
  project_checklist_item_id: z.string().uuid(),
});

export type SubmitChecklistInput = z.input<typeof submitSchema>;

export async function submitChecklistItem(
  input: SubmitChecklistInput,
): Promise<{ ok?: true; checklist_progress_id?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();

  // Ensure instance exists
  let { data: instance } = await supabase
    .from("desa_topik_instance")
    .select("id")
    .eq("project_desa_id", parsed.data.project_desa_id)
    .eq("project_topik_id", parsed.data.project_topik_id)
    .maybeSingle();

  if (!instance) {
    const { data: created, error: instErr } = await supabase
      .from("desa_topik_instance")
      .insert({
        project_desa_id: parsed.data.project_desa_id,
        project_topik_id: parsed.data.project_topik_id,
      })
      .select("id")
      .single();
    if (instErr || !created) return { error: instErr?.message ?? "Gagal create topik instance" };
    instance = created;
  }

  const instanceId = (instance as { id: string }).id;

  const { data: cp, error } = await supabase.rpc("submit_checklist_item", {
    p_desa_topik_instance_id: instanceId,
    p_project_checklist_item_id: parsed.data.project_checklist_item_id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/peserta/projects/${parsed.data.project_desa_id}`);
  revalidatePath(
    `/peserta/projects/${parsed.data.project_desa_id}/topik/${parsed.data.project_topik_id}`,
  );
  return { ok: true, checklist_progress_id: cp as string };
}
