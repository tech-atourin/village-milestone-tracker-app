"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const submitSchema = z.object({
  desa_id: z.string().uuid(),
  criteria_item_id: z.string().uuid(),
  evidence_filename: z.string().min(1).max(200),
  evidence_mime: z.string().min(1).max(100),
  evidence_base64: z.string().min(1),
  evidence_note: z.string().max(1000).optional().nullable(),
});

export async function submitCriteriaItem(
  input: z.input<typeof submitSchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Wajib upload evidence + isi catatan singkat" };
  }

  const supabase = createClient();

  // 1. Upload evidence to storage
  const bytes = Buffer.from(parsed.data.evidence_base64, "base64");
  if (bytes.byteLength > 50 * 1024 * 1024) {
    return { error: "File terlalu besar (maks 50 MB)" };
  }
  const safe = parsed.data.evidence_filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `criteria/${parsed.data.desa_id}/${parsed.data.criteria_item_id}/${Date.now()}-${safe}`;

  const { error: uploadErr } = await supabase.storage
    .from("vmt-evidence")
    .upload(path, bytes, {
      contentType: parsed.data.evidence_mime,
      upsert: false,
    });
  if (uploadErr) {
    return { error: `Upload gagal: ${uploadErr.message}` };
  }

  // 2. Submit via RPC (with evidence_path + note)
  const { error } = await supabase.rpc("submit_criteria_item", {
    p_desa_id: parsed.data.desa_id,
    p_criteria_item_id: parsed.data.criteria_item_id,
    p_evidence_path: path,
    p_evidence_note: parsed.data.evidence_note ?? null,
  });
  if (error) {
    // best-effort cleanup
    await supabase.storage.from("vmt-evidence").remove([path]);
    return { error: error.message };
  }
  revalidatePath("/desa/self-assessment");
  revalidatePath("/desa/dashboard");
  return { ok: true };
}

const verifySchema = z.object({
  progress_id: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
});

export async function verifyCriteriaItem(
  input: z.input<typeof verifySchema>,
) {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase.rpc("verify_criteria_item", {
    p_criteria_progress_id: parsed.data.progress_id,
    p_decision: parsed.data.decision,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

// Sign evidence storage path for display (server-side).
export async function signCriteriaEvidence(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("vmt-evidence")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
