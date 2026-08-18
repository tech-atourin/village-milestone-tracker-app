"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { canManageProject } from "@/lib/auth/rbac";
import { syncGformLocal } from "@/lib/gform/local-sync";

const addSchema = z.object({
  project_id: z.string().uuid(),
  form_type: z.enum(["pre_test", "post_test", "survey_kepuasan", "survey_lainnya"]),
  form_label: z.string().min(2).max(200).optional().nullable(),
  gform_id: z.string().min(10),
  sheet_id: z.string().min(10),
  identifier_field: z.string().min(1).default("Email Address"),
});

export async function addProjectGform(input: z.input<typeof addSchema>) {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  if (!(await canManageProject(parsed.data.project_id)))
    return { error: "Tidak diizinkan mengelola GForm project ini." };
  const supabase = createAdminClient();
  const { error } = await supabase.from("project_gforms").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}`);
  return { ok: true };
}

export async function triggerGformSync(projectGformId: string) {
  // Resolve project dulu untuk cek kepemilikan (superadmin / mitra pemilik).
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_gforms")
    .select("project_id")
    .eq("id", projectGformId)
    .maybeSingle();
  const projectId = (data as { project_id: string } | null)?.project_id;
  if (!projectId) return { error: "GForm tidak ditemukan" };
  if (!(await canManageProject(projectId)))
    return { error: "Tidak diizinkan menyinkronkan GForm project ini." };
  return syncGformLocal(projectGformId);
}
