"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";
import { sanitizeAuthUser } from "@/lib/auth/sanitize";

// =====================================================
// Admin: tambah personil ke project (buat akun + rentang kerja).
// =====================================================
const addSchema = z.object({
  project_id: z.string().uuid(),
  full_name: z.string().min(2).max(200),
  email: z.string().email(),
  position: z.string().min(2).max(200),
  phone: z.string().max(40).optional().nullable(),
  work_start: z.string().optional().nullable(),
  work_end: z.string().optional().nullable(),
});

export async function addPersonnel(input: z.input<typeof addSchema>) {
  const actor = await requireRole("superadmin", "mitra_admin");
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const body = parsed.data;
  const admin = createAdminClient();

  // Mitra hanya boleh menambah personil di project org-nya.
  if (actor.global_role === "mitra_admin") {
    const { data: proj } = await admin
      .from("projects")
      .select("organization_id")
      .eq("id", body.project_id)
      .maybeSingle();
    if (!proj || proj.organization_id !== actor.organization_id) {
      return { error: "Project di luar organisasi Anda" };
    }
  }

  // Sudah ada user dengan email ini? Pakai ulang; jika belum, buat akun.
  const { data: existing } = await admin
    .from("users")
    .select("id, global_role")
    .eq("email", body.email)
    .is("deleted_at", null)
    .maybeSingle();

  let userId: string;
  let generatedPassword: string | null = null;

  if (existing) {
    userId = existing.id as string;
  } else {
    generatedPassword = "bakti2026";
    const { data: authRes, error: authErr } =
      await admin.auth.admin.createUser({
        email: body.email,
        email_confirm: true,
        password: generatedPassword,
        user_metadata: { full_name: body.full_name },
      });
    if (authErr || !authRes.user) {
      return { error: `Gagal buat akun: ${authErr?.message ?? "unknown"}` };
    }
    userId = authRes.user.id;
    await sanitizeAuthUser(userId);
    const { error: insErr } = await admin.from("users").insert({
      id: userId,
      full_name: body.full_name,
      email: body.email,
      email_artificial: false,
      phone: body.phone ?? null,
      global_role: "personil",
    });
    if (insErr) {
      await admin.auth.admin.deleteUser(userId);
      return { error: `Gagal insert user: ${insErr.message}` };
    }
  }

  const { error: ppErr } = await admin.from("project_personnel").insert({
    project_id: body.project_id,
    user_id: userId,
    position: body.position,
    phone: body.phone ?? null,
    work_start: body.work_start || null,
    work_end: body.work_end || null,
  });
  if (ppErr) {
    if (ppErr.code === "23505") {
      return { error: "Personil ini sudah terdaftar di project" };
    }
    return { error: ppErr.message };
  }

  revalidatePath(`/atourin/projects/${body.project_id}`);
  revalidatePath(`/mitra/projects/${body.project_id}`);
  return { ok: true, password: generatedPassword };
}

// =====================================================
// Admin: ubah data personil (posisi/telepon/rentang kerja).
// =====================================================
const updateSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  position: z.string().min(2).max(200),
  phone: z.string().max(40).optional().nullable(),
  work_start: z.string().optional().nullable(),
  work_end: z.string().optional().nullable(),
});

export async function updatePersonnel(input: z.input<typeof updateSchema>) {
  await requireRole("superadmin", "mitra_admin");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const b = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin
    .from("project_personnel")
    .update({
      position: b.position,
      phone: b.phone ?? null,
      work_start: b.work_start || null,
      work_end: b.work_end || null,
    })
    .eq("id", b.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${b.project_id}`);
  revalidatePath(`/mitra/projects/${b.project_id}`);
  return { ok: true };
}

// =====================================================
// Admin: keluarkan personil dari project (log book ikut terhapus
// via cascade). Akun user tidak dihapus.
// =====================================================
export async function removePersonnel(input: {
  id: string;
  project_id: string;
}) {
  await requireRole("superadmin", "mitra_admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("project_personnel")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${input.project_id}`);
  revalidatePath(`/mitra/projects/${input.project_id}`);
  return { ok: true };
}

// =====================================================
// Personil: verifikasi kepemilikan project_personnel + rentang.
// =====================================================
async function loadOwnedPersonnel(projectPersonnelId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak login" as const };
  const supabase = createClient();
  const { data } = await supabase
    .from("project_personnel")
    .select("id, user_id, work_start, work_end")
    .eq("id", projectPersonnelId)
    .maybeSingle();
  if (!data || data.user_id !== user.id) {
    return { error: "Bukan log book Anda" as const };
  }
  return { pp: data };
}

// =====================================================
// Personil: tambah agenda harian.
// =====================================================
const addEntrySchema = z.object({
  project_personnel_id: z.string().uuid(),
  entry_date: z.string().min(8),
  agenda: z.string().min(1).max(5000),
});

export async function addLogbookEntry(input: z.input<typeof addEntrySchema>) {
  const parsed = addEntrySchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const b = parsed.data;
  const owned = await loadOwnedPersonnel(b.project_personnel_id);
  if ("error" in owned) return { error: owned.error };
  const { work_start, work_end } = owned.pp;
  if (work_start && b.entry_date < work_start) {
    return { error: "Tanggal di luar rentang kerja Anda" };
  }
  if (work_end && b.entry_date > work_end) {
    return { error: "Tanggal di luar rentang kerja Anda" };
  }

  const supabase = createClient();
  // sort_order = jumlah entri di tanggal yang sama.
  const { count } = await supabase
    .from("personnel_logbook")
    .select("id", { count: "exact", head: true })
    .eq("project_personnel_id", b.project_personnel_id)
    .eq("entry_date", b.entry_date);

  const { data, error } = await supabase
    .from("personnel_logbook")
    .insert({
      project_personnel_id: b.project_personnel_id,
      entry_date: b.entry_date,
      agenda: b.agenda,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/personil/logbook");
  return { ok: true, id: data.id as string };
}

// =====================================================
// Personil: edit agenda.
// =====================================================
export async function updateLogbookEntry(input: {
  id: string;
  agenda: string;
}) {
  const agenda = input.agenda?.trim();
  if (!agenda) return { error: "Agenda kosong" };
  const supabase = createClient();
  const { error } = await supabase
    .from("personnel_logbook")
    .update({ agenda, updated_at: new Date().toISOString() })
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/personil/logbook");
  return { ok: true };
}

// =====================================================
// Personil: hapus agenda (media ikut cascade).
// =====================================================
export async function deleteLogbookEntry(input: { id: string }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("personnel_logbook")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath("/personil/logbook");
  return { ok: true };
}

// =====================================================
// Personil: upload gambar untuk satu agenda.
// =====================================================
const mediaSchema = z.object({
  logbook_id: z.string().uuid(),
  base64: z.string().min(1),
  filename: z.string().min(1),
  mime_type: z.string().min(1),
});

export async function uploadLogbookMedia(input: z.input<typeof mediaSchema>) {
  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const b = parsed.data;
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak login" };

  const supabase = createClient();
  // Pastikan entri ini milik user (RLS lb_self sudah menjaga, tapi cek eksplisit).
  const { data: entry } = await supabase
    .from("personnel_logbook")
    .select("id")
    .eq("id", b.logbook_id)
    .maybeSingle();
  if (!entry) return { error: "Agenda tidak ditemukan" };

  const bytes = Buffer.from(b.base64, "base64");
  if (bytes.byteLength > 8 * 1024 * 1024) {
    return { error: "Gambar terlalu besar (maks 8 MB)" };
  }
  const ext = (b.filename.split(".").pop() ?? "jpg").toLowerCase();
  const path = `logbook/${b.logbook_id}/${user.id}-${bytes.byteLength}.${ext}`;

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from("vmt-evidence")
    .upload(path, bytes, { contentType: b.mime_type, upsert: true });
  if (upErr) return { error: upErr.message };

  const { error: dbErr } = await supabase
    .from("personnel_logbook_media")
    .insert({
      logbook_id: b.logbook_id,
      file_url: path,
      original_filename: b.filename,
    });
  if (dbErr) return { error: dbErr.message };
  revalidatePath("/personil/logbook");
  return { ok: true };
}

// =====================================================
// Personil: hapus gambar.
// =====================================================
export async function deleteLogbookMedia(input: { id: string }) {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("personnel_logbook_media")
    .select("file_url")
    .eq("id", input.id)
    .maybeSingle();
  const { error } = await supabase
    .from("personnel_logbook_media")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  if (row?.file_url) {
    const admin = createAdminClient();
    await admin.storage.from("vmt-evidence").remove([row.file_url as string]);
  }
  revalidatePath("/personil/logbook");
  return { ok: true };
}
