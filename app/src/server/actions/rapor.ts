"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { hitungNilaiAkhir } from "@/lib/rapor/scoring";

const saveSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  pre_test_score: z.coerce.number().min(0).max(100).nullable().optional(),
  post_test_score: z.coerce.number().min(0).max(100).nullable().optional(),
  tugas_score: z.coerce.number().min(0).max(100).nullable().optional(),
  keaktifan_score: z.coerce.number().min(0).max(100).nullable().optional(),
  survey_kepuasan: z
    .record(z.union([z.string(), z.number()]))
    .nullable()
    .optional(),
});

/**
 * Input nilai rapor peserta oleh superadmin atau mitra_admin (dibatasi ke
 * project milik organisasinya). Nilai Akhir dihitung server-side dari
 * komposisi bobot di lib/rapor/scoring.
 */
export async function saveRapor(input: z.input<typeof saveSchema>) {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const admin = createAdminClient();

  // Mitra hanya boleh menilai peserta pada project milik organisasinya.
  const { data: proj } = await admin
    .from("projects")
    .select("organization_id")
    .eq("id", parsed.data.project_id)
    .maybeSingle();
  if (!proj) return { error: "Project tidak ditemukan" };
  if (actor.global_role === "mitra_admin") {
    const orgId = (proj as { organization_id: string | null }).organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda" };
  }

  const pre = parsed.data.pre_test_score ?? null;
  const post = parsed.data.post_test_score ?? null;
  const tugas = parsed.data.tugas_score ?? null;
  const keaktifan = parsed.data.keaktifan_score ?? null;

  const improvement =
    pre != null && post != null && pre > 0
      ? Math.round(((post - pre) / pre) * 100)
      : null;

  const finalScore = hitungNilaiAkhir({
    pre_test_score: pre,
    post_test_score: post,
    tugas_score: tugas,
    keaktifan_score: keaktifan,
  });

  const { error } = await admin.from("rapor_peserta").upsert(
    {
      project_id: parsed.data.project_id,
      user_id: parsed.data.user_id,
      pre_test_score: pre,
      post_test_score: post,
      tugas_score: tugas,
      keaktifan_score: keaktifan,
      final_score: finalScore,
      improvement_percent: improvement,
      survey_kepuasan: parsed.data.survey_kepuasan ?? null,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,project_id" },
  );
  if (error) return { error: error.message };

  const p = parsed.data.project_id;
  const u = parsed.data.user_id;
  for (const scope of ["atourin", "mitra"]) {
    revalidatePath(`/${scope}/projects/${p}/rapor`);
    revalidatePath(`/${scope}/projects/${p}/rapor/${u}`);
  }
  revalidatePath(`/peserta/training/${p}`);
  return { ok: true };
}
