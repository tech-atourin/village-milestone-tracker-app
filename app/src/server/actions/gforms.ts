"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

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
  // Invoke the Edge Function
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { error: "SUPABASE env vars missing" };
  }
  const res = await fetch(`${url}/functions/v1/sync-gform`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project_gform_id: projectGformId }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: `Sync failed: ${text}` };
  }
  const data = await res.json();
  return { ok: true, data };
}
