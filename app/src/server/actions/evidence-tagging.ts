"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const toggleSchema = z.object({
  evidence_id: z.string().uuid(),
  project_desa_id: z.string().uuid(),
  desa_topik_instance_id: z.string().uuid().optional().nullable(),
  project_topik_id: z.string().uuid(),
  project_checklist_item_id: z.string().uuid(),
  want_tagged: z.boolean(),
});

export async function toggleEvidenceTag(
  input: z.input<typeof toggleSchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();

  // Ensure desa_topik_instance exists for this (project_desa, project_topik)
  let instanceId = parsed.data.desa_topik_instance_id;
  if (!instanceId) {
    const { data: instance } = await supabase
      .from("desa_topik_instance")
      .select("id")
      .eq("project_desa_id", parsed.data.project_desa_id)
      .eq("project_topik_id", parsed.data.project_topik_id)
      .maybeSingle();
    if (instance) {
      instanceId = (instance as { id: string }).id;
    } else {
      const { data: created, error } = await supabase
        .from("desa_topik_instance")
        .insert({
          project_desa_id: parsed.data.project_desa_id,
          project_topik_id: parsed.data.project_topik_id,
        })
        .select("id")
        .single();
      if (error || !created) return { error: error?.message ?? "Failed" };
      instanceId = (created as { id: string }).id;
    }
  }

  // Ensure checklist_progress exists (status='submitted' via RPC)
  const { data: cp, error: cpErr } = await supabase.rpc(
    "submit_checklist_item",
    {
      p_desa_topik_instance_id: instanceId,
      p_project_checklist_item_id: parsed.data.project_checklist_item_id,
    },
  );
  if (cpErr) return { error: cpErr.message };
  const cpId = cp as string;

  if (parsed.data.want_tagged) {
    const { error } = await supabase.from("evidence_tags").insert({
      evidence_id: parsed.data.evidence_id,
      tag_type: "checklist_progress",
      tag_target_id: cpId,
      tagged_by: user.id,
    });
    if (error && !error.message.includes("duplicate")) {
      return { error: error.message };
    }
  } else {
    await supabase
      .from("evidence_tags")
      .delete()
      .eq("evidence_id", parsed.data.evidence_id)
      .eq("tag_type", "checklist_progress")
      .eq("tag_target_id", cpId);
  }

  revalidatePath(`/peserta/projects/${parsed.data.project_desa_id}/evidence`);
  return { ok: true };
}
