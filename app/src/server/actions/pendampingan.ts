"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";

const createSchema = z.object({
  project_id: z.string().uuid(),
  project_desa_id: z.string().uuid(),
  day_number: z.number().int().min(1).max(60),
  session_date: z.string().min(8),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  materi: z.string().max(2000).optional().nullable(),
});

export async function createSession(input: z.input<typeof createSchema>) {
  const user = await requireRole("narasumber", "superadmin");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("pendampingan_sessions")
    .insert({ ...parsed.data, narasumber_id: user.id, status: "draft" })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/narasumber/sesi");
  return { ok: true, id: (data as { id: string }).id };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  materi: z.string().max(5000).optional().nullable(),
  maksud_tujuan: z.string().max(5000).optional().nullable(),
  aktivitas: z.string().max(5000).optional().nullable(),
  output_sesi: z.string().max(5000).optional().nullable(),
  tindak_lanjut: z.string().max(5000).optional().nullable(),
  kondisi_sebelum: z.array(z.string()).optional().nullable(),
  kondisi_setelah: z.array(z.string()).optional().nullable(),
  rekomendasi: z.string().max(5000).optional().nullable(),
});

export async function updateSession(input: z.input<typeof updateSchema>) {
  await requireRole("narasumber", "superadmin");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const { id, ...rest } = parsed.data;
  const supabase = createClient();
  const { error } = await supabase
    .from("pendampingan_sessions")
    .update(rest)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/narasumber/sesi/${id}`);
  return { ok: true };
}

export async function submitSession(sessionId: string) {
  await requireRole("narasumber", "superadmin");
  const supabase = createClient();
  const { error } = await supabase
    .from("pendampingan_sessions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return { error: error.message };
  revalidatePath(`/narasumber/sesi/${sessionId}`);
  return { ok: true };
}

const attendanceSchema = z.object({
  session_id: z.string().uuid(),
  entries: z.array(
    z.object({
      user_id: z.string().uuid(),
      status: z.enum(["hadir", "izin", "sakit", "tidak_hadir"]),
      note: z.string().max(500).optional().nullable(),
    }),
  ),
});

export async function setAttendance(input: z.input<typeof attendanceSchema>) {
  await requireRole("narasumber", "superadmin");
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  // Wipe + insert (simple replace strategy)
  await supabase
    .from("pendampingan_attendance")
    .delete()
    .eq("session_id", parsed.data.session_id);
  if (parsed.data.entries.length > 0) {
    const rows = parsed.data.entries.map((e) => ({
      session_id: parsed.data.session_id,
      user_id: e.user_id,
      status: e.status,
      note: e.note ?? null,
    }));
    const { error } = await supabase
      .from("pendampingan_attendance")
      .insert(rows);
    if (error) return { error: error.message };
  }
  revalidatePath(`/narasumber/sesi/${parsed.data.session_id}`);
  return { ok: true };
}

const evidenceSchema = z.object({
  session_id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  mime_type: z.string().min(1).max(100),
  base64: z.string().min(1),
  caption: z.string().max(500).optional().nullable(),
});

export async function uploadSessionEvidence(
  input: z.input<typeof evidenceSchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();

  const bytes = Buffer.from(parsed.data.base64, "base64");
  if (bytes.byteLength > 20 * 1024 * 1024) {
    return { error: "File terlalu besar (maks 20 MB)" };
  }
  const safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `pendampingan/${parsed.data.session_id}/${Date.now()}-${safe}`;
  const { error: upErr } = await supabase.storage
    .from("vmt-evidence")
    .upload(path, bytes, {
      contentType: parsed.data.mime_type,
      upsert: false,
    });
  if (upErr) return { error: upErr.message };

  // Look up project_desa_id from session
  const { data: ses } = await supabase
    .from("pendampingan_sessions")
    .select("project_desa_id")
    .eq("id", parsed.data.session_id)
    .maybeSingle();
  const projectDesaId = (ses as { project_desa_id: string } | null)
    ?.project_desa_id;

  const { data: ev, error: insErr } = await supabase
    .from("evidence_files")
    .insert({
      project_desa_id: projectDesaId,
      uploaded_by: user.id,
      file_url: path,
      file_type:
        parsed.data.mime_type.startsWith("image/") ? "image" : "document",
      file_size_bytes: bytes.byteLength,
      original_filename: parsed.data.filename,
      caption: parsed.data.caption ?? null,
    })
    .select("id")
    .single();
  if (insErr || !ev) {
    await supabase.storage.from("vmt-evidence").remove([path]);
    return { error: insErr?.message ?? "Gagal simpan metadata" };
  }
  await supabase.from("evidence_tags").insert({
    evidence_id: (ev as { id: string }).id,
    tag_type: "pendampingan_session",
    tag_target_id: parsed.data.session_id,
    tagged_by: user.id,
  });
  revalidatePath(`/narasumber/sesi/${parsed.data.session_id}`);
  return { ok: true };
}
