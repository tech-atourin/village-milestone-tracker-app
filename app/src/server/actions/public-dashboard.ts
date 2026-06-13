"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const schema = z.object({
  project_id: z.string().uuid(),
  enabled: z.boolean(),
});

export async function togglePublicDashboard(input: z.input<typeof schema>) {
  await requireRole("superadmin");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_project_public_slug", {
    p_project_id: parsed.data.project_id,
    p_enabled: parsed.data.enabled,
  });
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { slug: data as string };
}
