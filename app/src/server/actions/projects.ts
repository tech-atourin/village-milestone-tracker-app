"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";

const createProjectSchema = z.object({
  name: z.string().min(2, "Nama project minimal 2 karakter").max(200),
  description: z.string().max(2000).optional().nullable(),
  program_type: z
    .enum(["desa_based", "pelaku_pariwisata"])
    .default("desa_based"),
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
  total_pendampingan_days: z
    .number()
    .int()
    .min(1, "Minimal 1 hari")
    .max(60, "Maksimal 60 hari")
    .default(5),
  participant_mode: z.enum(["offline", "online", "both"]).default("offline"),
  target_online: z.number().int().min(0).max(100000).default(0),
  target_offline: z.number().int().min(0).max(100000).default(0),
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
  const user = await requireRole("superadmin", "mitra_admin");

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

  // Mitra can only create projects under their own organization
  if (
    user.global_role === "mitra_admin" &&
    data.organization_id !== user.organization_id
  ) {
    return { error: "Mitra hanya bisa buat project untuk organisasinya sendiri" };
  }

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

  // RPC tidak punya parameter total_pendampingan_days + program_type →
  // patch via UPDATE setelah project dibuat.
  if (projectId) {
    const patch: Record<string, unknown> = {};
    if (data.total_pendampingan_days)
      patch.total_pendampingan_days = data.total_pendampingan_days;
    if (data.program_type) patch.program_type = data.program_type;
    patch.participant_mode = data.participant_mode;
    // Only the counts relevant to the chosen mode; others stay 0.
    patch.target_online =
      data.participant_mode === "offline" ? 0 : data.target_online;
    patch.target_offline =
      data.participant_mode === "online" ? 0 : data.target_offline;
    if (Object.keys(patch).length > 0) {
      await supabase
        .from("projects")
        .update(patch)
        .eq("id", projectId as string);
    }
  }

  revalidatePath("/atourin/projects");
  revalidatePath("/mitra/projects");
  return { projectId: projectId as string };
}

export async function createProjectAndRedirect(input: CreateProjectInput) {
  const result = await createProjectAction(input);
  if (result.projectId) {
    redirect(`/atourin/projects/${result.projectId}`);
  }
  return result;
}
