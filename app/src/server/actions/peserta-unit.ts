"use server";

import { createAdminClient } from "@/lib/supabase/server";

// =====================================================
// Peserta individu (project pelaku_pariwisata) tidak punya desa nyata, tapi
// seluruh mesin checklist/evidence/rencana-aksi digantung ke project_desa.
// Helper ini me-reuse mesin itu: tiap peserta diberi 1 "desa" tersembunyi
// (is_individual_unit = true) sebagai wadah pribadinya, lalu dibuatkan
// project_desa. Idempotent - aman dipanggil tiap halaman training dibuka.
//
// Mengembalikan project_desa_id, atau null bila peserta bukan anggota project.
// =====================================================
export async function ensurePesertaUnit(
  projectId: string,
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();

  // Membership peserta di project ini.
  const { data: mRow } = await admin
    .from("project_memberships")
    .select("id, desa_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "peserta")
    .maybeSingle();
  const membership = mRow as { id: string; desa_id: string | null } | null;
  if (!membership) return null;

  let desaId = membership.desa_id;

  // Belum punya desa: buat unit tersembunyi dari data peserta.
  if (!desaId) {
    const { data: uRow } = await admin
      .from("users")
      .select("full_name, kota, address")
      .eq("id", userId)
      .maybeSingle();
    const u = uRow as {
      full_name: string | null;
      kota: string | null;
      address: string | null;
    } | null;

    const { data: created, error: dErr } = await admin
      .from("desa")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        name: u?.full_name?.trim() || "Peserta",
        kabupaten: u?.kota ?? null,
        desa_kelurahan: u?.address ?? null,
        is_individual_unit: true,
      } as any)
      .select("id")
      .single();
    if (dErr || !created) {
      console.error("ensurePesertaUnit: gagal buat unit desa", dErr);
      return null;
    }
    desaId = (created as { id: string }).id;

    await admin
      .from("project_memberships")
      .update({ desa_id: desaId })
      .eq("id", membership.id);
  }

  // Pastikan project_desa ada.
  const { data: pdRow } = await admin
    .from("project_desa")
    .select("id")
    .eq("project_id", projectId)
    .eq("desa_id", desaId)
    .maybeSingle();
  if (pdRow) return (pdRow as { id: string }).id;

  const { data: pdCreated, error: pdErr } = await admin
    .from("project_desa")
    .insert({ project_id: projectId, desa_id: desaId })
    .select("id")
    .single();
  if (pdErr || !pdCreated) {
    console.error("ensurePesertaUnit: gagal buat project_desa", pdErr);
    return null;
  }
  return (pdCreated as { id: string }).id;
}
