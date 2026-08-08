"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const schema = z.object({
  project_id: z.string().uuid(),
  project_topik_id: z.string().uuid(),
});

/**
 * Peserta self check-in for a training topik. Guards:
 *  - authenticated
 *  - caller is an active member of the project
 *  - the topik belongs to the project
 * Idempotent (unique constraint on topik+user; conflict = already checked in).
 */
export async function checkInTopik(
  input: z.input<typeof schema>,
): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const { project_id, project_topik_id } = parsed.data;

  const admin = createAdminClient();

  // Membership guard: active member of the project.
  const { data: member } = await admin
    .from("project_memberships")
    .select("id")
    .eq("project_id", project_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  if (!member || member.length === 0)
    return { error: "Anda bukan peserta project ini" };

  // Topik must belong to the project + jendela check-in harus terbuka.
  const { data: topik } = await admin
    .from("project_topik")
    .select("id, checkin_open, checkin_closes_at")
    .eq("id", project_topik_id)
    .eq("project_id", project_id)
    .maybeSingle();
  if (!topik) return { error: "Topik tidak ditemukan pada project ini" };
  const tk = topik as {
    id: string;
    checkin_open: boolean | null;
    checkin_closes_at: string | null;
  };
  const nowMs = Date.now();
  const isOpen =
    !!tk.checkin_open &&
    (!tk.checkin_closes_at || nowMs < new Date(tk.checkin_closes_at).getTime());
  if (!isOpen)
    return {
      error: "Check-in untuk modul ini sedang ditutup. Tunggu dibuka panitia.",
    };

  const { error } = await admin
    .from("topik_check_ins")
    .upsert(
      {
        project_id,
        project_topik_id,
        user_id: user.id,
        checked_in_at: new Date().toISOString(),
      },
      { onConflict: "project_topik_id,user_id", ignoreDuplicates: true },
    );
  if (error) return { error: error.message };

  revalidatePath(`/peserta/training/${project_id}`);
  revalidatePath(`/atourin/projects/${project_id}`);
  revalidatePath(`/mitra/projects/${project_id}`);
  return { ok: true };
}

// =====================================================
// Admin: buka/tutup jendela check-in per modul.
// open=true  -> peserta bisa check-in (opsional isi closes_at untuk auto-tutup)
// open=false -> tombol check-in disembunyikan lagi
// =====================================================
const windowSchema = z.object({
  project_id: z.string().uuid(),
  project_topik_id: z.string().uuid(),
  open: z.boolean(),
  // ISO datetime lokal dari input; boleh kosong (tanpa auto-tutup).
  closes_at: z.string().min(1).optional().nullable(),
});

export async function setTopikCheckinWindow(
  input: z.input<typeof windowSchema>,
): Promise<{ ok: true } | { error: string }> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };
  const parsed = windowSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const { project_id, project_topik_id, open, closes_at } = parsed.data;

  const admin = createAdminClient();

  // Guard kepemilikan mitra.
  if (actor.global_role === "mitra_admin") {
    const { data: proj } = await admin
      .from("projects")
      .select("organization_id")
      .eq("id", project_id)
      .maybeSingle();
    const orgId = (proj as { organization_id: string | null } | null)
      ?.organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda." };
  }

  let closesIso: string | null = null;
  if (open && closes_at) {
    const d = new Date(closes_at);
    if (isNaN(d.getTime())) return { error: "Waktu tutup tidak valid" };
    closesIso = d.toISOString();
  }

  const { error } = await admin
    .from("project_topik")
    .update({
      checkin_open: open,
      checkin_opened_at: open ? new Date().toISOString() : null,
      checkin_closes_at: closesIso,
    })
    .eq("id", project_topik_id)
    .eq("project_id", project_id);
  if (error) return { error: error.message };

  revalidatePath(`/peserta/training/${project_id}`);
  revalidatePath(`/atourin/projects/${project_id}`);
  revalidatePath(`/mitra/projects/${project_id}`);
  return { ok: true };
}
