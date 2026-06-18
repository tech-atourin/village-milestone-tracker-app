"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { notifyMany, projectReviewers } from "@/lib/notify";

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

  // Notify project reviewers (superadmin + mitra_admin of org + narasumber)
  // best-effort. Don't block the submit on notification failure.
  try {
    const cpId = cp as string;
    const admin = createAdminClient();
    const { data: ctx } = await admin
      .from("checklist_progress")
      .select(
        "id, project_checklist_item:project_checklist_item(title, project_topik:project_topik(name, project_id)), desa_topik_instance:desa_topik_instance(project_desa:project_desa(project_id, desa:desa(name)))",
      )
      .eq("id", cpId)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = ctx as any;
    const projectId =
      c?.project_checklist_item?.project_topik?.project_id ??
      c?.desa_topik_instance?.project_desa?.project_id;
    if (projectId) {
      const reviewers = await projectReviewers(projectId);
      const filtered = reviewers.filter((id) => id !== user.id);
      await notifyMany({
        user_ids: filtered,
        template_key: "checklist_submitted",
        payload: {
          checklist_title: c?.project_checklist_item?.title,
          topik_name: c?.project_checklist_item?.project_topik?.name,
          desa_name: c?.desa_topik_instance?.project_desa?.desa?.name,
          peserta_name: user.full_name,
          project_id: projectId,
        },
      });
    }
  } catch (e) {
    console.warn("submitChecklistItem notify failed:", e);
  }

  revalidatePath(`/peserta/projects/${parsed.data.project_desa_id}`);
  revalidatePath(
    `/peserta/projects/${parsed.data.project_desa_id}/topik/${parsed.data.project_topik_id}`,
  );
  return { ok: true, checklist_progress_id: cp as string };
}
