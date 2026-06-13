"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const createProjectSchema = z.object({
  name: z.string().min(2, "Nama project minimal 2 karakter").max(200),
  description: z.string().max(2000).optional().nullable(),
  organization_id: z.string().uuid("Pilih organisasi mitra"),
  template_id: z.string().uuid().optional().nullable(),
  period_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid (YYYY-MM-DD)")
    .optional()
    .nullable(),
  period_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid (YYYY-MM-DD)")
    .optional()
    .nullable(),
  enabled_modules: z
    .object({
      desa_baseline: z.boolean().default(true),
      topik_pendampingan: z.boolean().default(true),
      capacity_building: z.boolean().default(true),
      klasifikasi_nasional: z.boolean().default(false),
      public_dashboard: z.boolean().default(false),
    })
    .default({
      desa_baseline: true,
      topik_pendampingan: true,
      capacity_building: true,
      klasifikasi_nasional: false,
      public_dashboard: false,
    }),
  publish: z.boolean().default(false),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProjectResult = {
  error?: string;
  fieldErrors?: Record<string, string>;
  projectId?: string;
};

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  await requireRole("superadmin");

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(f)) {
      if (v?.[0]) fieldErrors[k] = v[0];
    }
    return { error: "Periksa kembali input form.", fieldErrors };
  }

  const data = parsed.data;
  const supabase = createClient();

  const { data: projectId, error } = await supabase.rpc(
    "create_project_from_template",
    {
      p_organization_id: data.organization_id,
      p_template_id: data.template_id ?? null,
      p_name: data.name,
      p_description: data.description ?? null,
      p_period_start: data.period_start ?? null,
      p_period_end: data.period_end ?? null,
      p_enabled_modules: data.enabled_modules,
      p_status: data.publish ? "active" : "draft",
    },
  );

  if (error) {
    console.error("createProject RPC error:", error);
    return { error: error.message };
  }

  revalidatePath("/atourin/projects");
  return { projectId: projectId as string };
}

export async function createProjectAndRedirect(input: CreateProjectInput) {
  const result = await createProjectAction(input);
  if (result.projectId) {
    redirect(`/atourin/projects/${result.projectId}`);
  }
  return result;
}
