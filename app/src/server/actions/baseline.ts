"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const saveSchema = z.object({
  project_desa_id: z.string().uuid(),
  schema_version: z.string(),
  data: z.record(z.unknown()),
  submit: z.boolean().default(false),
});

export type SaveBaselineInput = z.input<typeof saveSchema>;

export async function saveBaseline(input: SaveBaselineInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();

  // Upsert latest baseline row for this project_desa
  const { data: existing } = await supabase
    .from("desa_baseline_data")
    .select("id")
    .eq("project_desa_id", parsed.data.project_desa_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    project_desa_id: parsed.data.project_desa_id,
    schema_version: parsed.data.schema_version,
    data: parsed.data.data,
    submitted_at: parsed.data.submit ? new Date().toISOString() : null,
    submitted_by: parsed.data.submit ? user.id : null,
  };

  if (existing) {
    const { error } = await supabase
      .from("desa_baseline_data")
      .update(payload)
      .eq("id", (existing as { id: string }).id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("desa_baseline_data")
      .insert(payload);
    if (error) return { error: error.message };
  }

  // Two-way sync: write baseline keys back to vmt.desa master + desa_profile_data
  // so atourin/mitra detail stays in sync. Peserta has no RLS write on those
  // tables → use admin client. (membership already checked via baseline write above)
  const data = parsed.data.data as Record<string, unknown>;
  const strVal = (k: string): string | null => {
    const v = data[k];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const numVal = (k: string): number | null => {
    const v = data[k];
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const masterPatch: Record<string, string | number | null> = {};
  for (const k of ["desa_kelurahan", "kecamatan", "kabupaten", "provinsi"] as const) {
    const v = strVal(k);
    if (v !== null) masterPatch[k] = v;
  }
  const lat = numVal("lat");
  const lng = numVal("lng");
  if (lat !== null) masterPatch.lat = lat;
  if (lng !== null) masterPatch.lng = lng;

  const profilePatch: Record<string, string | null> = {};
  const profileMap: Array<[string, string]> = [
    ["alamat_lengkap", "alamat"],
    ["deskripsi", "deskripsi"],
    ["keunikan", "keunikan"],
    ["kontak_nama", "pengelola_kontak_person"],
    ["kontak_email", "pengelola_email"],
    ["kontak_hp", "pengelola_whatsapp"],
  ];
  for (const [src, dest] of profileMap) {
    const v = strVal(src);
    if (v !== null) profilePatch[dest] = v;
  }

  if (
    Object.keys(masterPatch).length > 0 ||
    Object.keys(profilePatch).length > 0
  ) {
    const admin = createAdminClient();
    const { data: pd } = await admin
      .from("project_desa")
      .select("desa_id")
      .eq("id", parsed.data.project_desa_id)
      .maybeSingle();
    const desaId = (pd as { desa_id: string } | null)?.desa_id;
    if (desaId) {
      if (Object.keys(masterPatch).length > 0)
        await admin.from("desa").update(masterPatch).eq("id", desaId);
      if (Object.keys(profilePatch).length > 0)
        await admin
          .from("desa_profile_data")
          .upsert({ desa_id: desaId, ...profilePatch }, { onConflict: "desa_id" });
    }
  }

  revalidatePath(`/peserta/projects/${parsed.data.project_desa_id}`);
  return { ok: true };
}
