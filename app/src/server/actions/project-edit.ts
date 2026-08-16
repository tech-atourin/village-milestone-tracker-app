"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";

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
  // Record modul generik (key -> aktif). Definisi ada di lib/modules.ts.
  enabled_modules: z.record(z.string(), z.boolean()),
  // Konfigurasi penilaian per project. Bobot dalam persen (0..100), disimpan
  // sebagai fraksi. Opsional: kalau tidak dikirim, config lama dipertahankan.
  grading_config: z
    .object({
      weights: z.object({
        pre_test: z.number().min(0).max(100),
        post_test: z.number().min(0).max(100),
        tugas: z.number().min(0).max(100),
        keaktifan: z.number().min(0).max(100),
      }),
      passing_score: z.number().min(0).max(100),
    })
    .optional(),
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

    // Bobot penilaian harus berjumlah 100%.
    if (d.grading_config) {
      const w = d.grading_config.weights;
      const total = w.pre_test + w.post_test + w.tugas + w.keaktifan;
      if (Math.round(total) !== 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bobot penilaian harus berjumlah 100% (sekarang ${Math.round(total)}%).`,
        });
      }
    }
  });

export async function updateProject(input: z.input<typeof updateProjectSchema>) {
  // Superadmin bebas; mitra_admin hanya boleh mengubah project milik
  // organisasinya sendiri (mis. mengatur skema penilaian program mereka).
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };

  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  const d = parsed.data;

  // Mitra pakai admin client + guard kepemilikan (RLS project update hanya
  // untuk superadmin). Superadmin tetap lewat client RLS biasa.
  const supabase =
    actor.global_role === "superadmin" ? createClient() : createAdminClient();
  if (actor.global_role === "mitra_admin") {
    const { data: proj } = await supabase
      .from("projects")
      .select("organization_id")
      .eq("id", d.id)
      .maybeSingle();
    const orgId = (proj as { organization_id: string | null } | null)
      ?.organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda" };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
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
  };
  if (d.grading_config) {
    const w = d.grading_config.weights;
    // Simpan bobot sebagai fraksi 0..1.
    payload.grading_config = {
      weights: {
        pre_test: w.pre_test / 100,
        post_test: w.post_test / 100,
        tugas: w.tugas / 100,
        keaktifan: w.keaktifan / 100,
      },
      passing_score: d.grading_config.passing_score,
    };
  }
  const { error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", d.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${d.id}`);
  revalidatePath("/atourin/projects");
  revalidatePath(`/mitra/projects/${d.id}`);
  revalidatePath("/mitra/projects");
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
