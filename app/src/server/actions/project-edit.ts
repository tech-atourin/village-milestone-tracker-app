"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const DateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .nullable()
  .or(z.literal(""));

const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  period_start: DateStr,
  period_end: DateStr,
  // Fase pelatihan
  pelatihan_start: DateStr,
  pelatihan_end: DateStr,
  total_pelatihan_days: z.number().int().min(1).max(60).optional().nullable(),
  // Fase pendampingan
  pendampingan_start: DateStr,
  pendampingan_end: DateStr,
  total_pendampingan_days: z.number().int().min(1).max(60).optional().nullable(),
  status: z.enum(["draft", "active", "completed", "archived"]),
  enabled_modules: z.object({
    desa_baseline: z.boolean(),
    topik_pendampingan: z.boolean(),
    capacity_building: z.boolean(),
    klasifikasi_nasional: z.boolean(),
    public_dashboard: z.boolean(),
  }),
})
  // Validasi tanggal. Ditaruh di server supaya tidak bisa dilangkahi lewat
  // pemanggilan action langsung, bukan hanya lewat form.
  .superRefine((d, ctx) => {
    const at = (v?: string | null) => (v ? v : null);

    const rentang: Array<[string | null, string | null, string]> = [
      [at(d.period_start), at(d.period_end), "Periode program"],
      [at(d.pelatihan_start), at(d.pelatihan_end), "Fase pelatihan"],
      [at(d.pendampingan_start), at(d.pendampingan_end), "Fase pendampingan"],
    ];
    for (const [mulai, selesai, label] of rentang) {
      if (mulai && selesai && selesai < mulai) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}: tanggal selesai tidak boleh mendahului tanggal mulai.`,
        });
      }
    }

    // Tiap fase harus berada di dalam periode program (bila periodenya diisi).
    const pStart = at(d.period_start);
    const pEnd = at(d.period_end);
    const fase: Array<[string | null, string | null, string]> = [
      [at(d.pelatihan_start), at(d.pelatihan_end), "Fase pelatihan"],
      [at(d.pendampingan_start), at(d.pendampingan_end), "Fase pendampingan"],
    ];
    for (const [mulai, selesai, label] of fase) {
      if (pStart && mulai && mulai < pStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}: mulai sebelum periode program dimulai.`,
        });
      }
      if (pEnd && selesai && selesai > pEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}: selesai setelah periode program berakhir.`,
        });
      }
    }
  });

export async function updateProject(input: z.input<typeof updateProjectSchema>) {
  await requireRole("superadmin");
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  const supabase = createClient();
  const d = parsed.data;
  const { error } = await supabase
    .from("projects")
    .update({
      name: d.name,
      description: d.description ?? null,
      period_start: d.period_start || null,
      period_end: d.period_end || null,
      pelatihan_start: d.pelatihan_start || null,
      pelatihan_end: d.pelatihan_end || null,
      total_pelatihan_days: d.total_pelatihan_days ?? null,
      pendampingan_start: d.pendampingan_start || null,
      pendampingan_end: d.pendampingan_end || null,
      total_pendampingan_days: d.total_pendampingan_days ?? null,
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
