"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
  total_pendampingan_days: z.number().int().min(1).max(60).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]),
  enabled_modules: z.object({
    desa_baseline: z.boolean(),
    topik_pendampingan: z.boolean(),
    capacity_building: z.boolean(),
    klasifikasi_nasional: z.boolean(),
    public_dashboard: z.boolean(),
  }),
});

export async function updateProject(input: z.input<typeof updateProjectSchema>) {
  await requireRole("superadmin");
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const d = parsed.data;
  const { error } = await supabase
    .from("projects")
    .update({
      name: d.name,
      description: d.description ?? null,
      period_start: d.period_start || null,
      period_end: d.period_end || null,
      total_pendampingan_days: d.total_pendampingan_days ?? 5,
      status: d.status,
      enabled_modules: d.enabled_modules,
    })
    .eq("id", d.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${d.id}`);
  revalidatePath("/atourin/projects");
  return { ok: true };
}

export async function archiveProject(projectId: string) {
  await requireRole("superadmin");
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${projectId}`);
  revalidatePath("/atourin/projects");
  return { ok: true };
}

export async function deleteProject(projectId: string) {
  await requireRole("superadmin");
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { error: error.message };
  revalidatePath("/atourin/projects");
  return { ok: true };
}
