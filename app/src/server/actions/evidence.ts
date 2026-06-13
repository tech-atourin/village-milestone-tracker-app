"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const FILE_TYPE_MAP: Record<string, "image" | "video" | "document" | "audio"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/heic": "image",
  "application/pdf": "document",
  "video/mp4": "video",
  "video/quicktime": "video",
  "audio/mpeg": "audio",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "document",
};

const uploadSchema = z.object({
  project_desa_id: z.string().uuid(),
  checklist_progress_id: z.string().uuid().optional().nullable(),
  filename: z.string().min(1).max(200),
  mime_type: z.string(),
  base64: z.string().min(1),
  caption: z.string().max(500).optional().nullable(),
});

export type UploadEvidenceInput = z.input<typeof uploadSchema>;

export async function uploadEvidence(input: UploadEvidenceInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };

  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Input tidak valid" };
  }

  const fileType = FILE_TYPE_MAP[parsed.data.mime_type] ?? "document";
  const supabase = createClient();

  // Decode base64 → bytes
  const bytes = Buffer.from(parsed.data.base64, "base64");
  if (bytes.byteLength > 50 * 1024 * 1024) {
    return { error: "File terlalu besar (maks 50 MB)" };
  }

  // Path: {project_desa_id}/{user_id}/{ts}-{safe_filename}
  const safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${parsed.data.project_desa_id}/${user.id}/${Date.now()}-${safe}`;

  const { error: uploadErr } = await supabase.storage
    .from("vmt-evidence")
    .upload(path, bytes, {
      contentType: parsed.data.mime_type,
      upsert: false,
    });
  if (uploadErr) {
    console.error("upload:", uploadErr);
    return { error: uploadErr.message };
  }

  // Public URL is gated by storage RLS — we sign a long-lived URL on demand
  const { data: signed } = await supabase.storage
    .from("vmt-evidence")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

  // Insert evidence_files
  const { data: ev, error: insertErr } = await supabase
    .from("evidence_files")
    .insert({
      project_desa_id: parsed.data.project_desa_id,
      uploaded_by: user.id,
      file_url: path, // store storage path; sign when serving
      file_type: fileType,
      file_size_bytes: bytes.byteLength,
      original_filename: parsed.data.filename,
      caption: parsed.data.caption ?? null,
    })
    .select("id")
    .single();
  if (insertErr || !ev) {
    console.error("evidence_files insert:", insertErr);
    // best-effort cleanup
    await supabase.storage.from("vmt-evidence").remove([path]);
    return { error: insertErr?.message ?? "Gagal simpan metadata evidence" };
  }
  const evidenceId = (ev as { id: string }).id;

  // Optionally tag to a checklist_progress
  if (parsed.data.checklist_progress_id) {
    await supabase.from("evidence_tags").insert({
      evidence_id: evidenceId,
      tag_type: "checklist_progress",
      tag_target_id: parsed.data.checklist_progress_id,
      tagged_by: user.id,
    });
  }

  revalidatePath(`/peserta/projects/${parsed.data.project_desa_id}`);
  return {
    ok: true,
    evidence_id: evidenceId,
    signed_url: signed?.signedUrl ?? null,
  };
}

// =====================================================
// List evidence for a checklist_progress (peserta detail view)
// =====================================================
export async function listEvidenceForChecklist(checklistProgressId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evidence_tags")
    .select(
      `
      evidence:evidence_files(
        id, file_url, file_type, original_filename, caption, uploaded_at, uploaded_by
      )
    `,
    )
    .eq("tag_type", "checklist_progress")
    .eq("tag_target_id", checklistProgressId);
  if (error) return [];
  return (data ?? []) as unknown as Array<{
    evidence: {
      id: string;
      file_url: string;
      file_type: string;
      original_filename: string | null;
      caption: string | null;
      uploaded_at: string;
      uploaded_by: string;
    };
  }>;
}

// Sign URLs for a list of storage paths (server-side, anon client OK if RLS
// allows reading the underlying objects — peserta sees own scope, atourin sees all).
export async function signEvidenceUrls(paths: string[]) {
  const supabase = createClient();
  const out = new Map<string, string>();
  for (const p of paths) {
    const { data } = await supabase.storage
      .from("vmt-evidence")
      .createSignedUrl(p, 60 * 60); // 1 hour
    if (data?.signedUrl) out.set(p, data.signedUrl);
  }
  return out;
}
