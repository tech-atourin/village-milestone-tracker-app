"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
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
  await requireRole("superadmin");
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase.from("project_gforms").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

export async function triggerGformSync(projectGformId: string) {
  await requireRole("superadmin");
  return syncGformLocal(projectGformId);
}
