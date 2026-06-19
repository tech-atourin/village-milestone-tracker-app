import "server-only";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { BaselineSchemaRow } from "@/lib/baseline/types";

export async function getDefaultBaselineSchema(): Promise<BaselineSchemaRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("baseline_form_schemas")
    .select("id, name, version, fields")
    .is("project_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as BaselineSchemaRow | null;
}

export async function getBaselineData(
  projectDesaId: string,
  opts?: { asAdmin?: boolean },
) {
  const supabase = opts?.asAdmin ? createAdminClient() : createClient();
  const { data } = await supabase
    .from("desa_baseline_data")
    .select("id, schema_version, data, submitted_at, updated_at")
    .eq("project_desa_id", projectDesaId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as unknown as {
    id: string;
    schema_version: string;
    data: Record<string, unknown>;
    submitted_at: string | null;
    updated_at: string;
  } | null;

  // Pre-fill from desa master (vmt.desa) + profile (desa_profile_data) when
  // baseline hasn't captured those keys yet, so peserta sees the same values
  // as atourin/mitra detail. Two-way: saveBaseline writes back on submit.
  const { data: pd } = await supabase
    .from("project_desa")
    .select(
      "desa_id, desa:desa(id, desa_kelurahan, kecamatan, kabupaten, provinsi, lat, lng)",
    )
    .eq("id", projectDesaId)
    .maybeSingle();
  const desaRel =
    (pd as { desa: Record<string, string | number | null> } | null)?.desa ?? null;
  const desaId = (pd as { desa_id: string } | null)?.desa_id ?? null;

  let profile: Record<string, unknown> | null = null;
  if (desaId) {
    const { data: prof } = await supabase
      .from("desa_profile_data")
      .select(
        "alamat, deskripsi, keunikan, pengelola_kontak_person, pengelola_email, pengelola_whatsapp",
      )
      .eq("desa_id", desaId)
      .maybeSingle();
    profile = (prof as Record<string, unknown> | null) ?? null;
  }

  const merged: Record<string, unknown> = { ...(row?.data ?? {}) };
  // Master → baseline
  if (desaRel) {
    for (const k of [
      "desa_kelurahan",
      "kecamatan",
      "kabupaten",
      "provinsi",
      "lat",
      "lng",
    ] as const) {
      if (desaRel[k] != null && (merged[k] === undefined || merged[k] === null || merged[k] === ""))
        merged[k] = desaRel[k];
    }
  }
  // Profile → baseline
  if (profile) {
    const map: Record<string, string> = {
      alamat: "alamat_lengkap",
      deskripsi: "deskripsi",
      keunikan: "keunikan",
      pengelola_kontak_person: "kontak_nama",
      pengelola_email: "kontak_email",
      pengelola_whatsapp: "kontak_hp",
    };
    for (const [src, dest] of Object.entries(map)) {
      const v = profile[src];
      if (v != null && v !== "" && (merged[dest] === undefined || merged[dest] === null || merged[dest] === ""))
        merged[dest] = v;
    }
  }

  if (row) return { ...row, data: merged };
  if (Object.keys(merged).length > 0) {
    return {
      id: "",
      schema_version: "",
      data: merged,
      submitted_at: null,
      updated_at: new Date(0).toISOString(),
    };
  }
  return row;
}
