"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const TIMEFRAME = z.enum([
  "jangka_pendek",
  "jangka_menengah",
  "jangka_panjang",
]);
const STATUS = z.enum(["rencana", "on_track", "selesai", "ditunda"]);

const createSchema = z.object({
  project_id: z.string().uuid(),
  project_desa_id: z.string().uuid(),
  timeframe: TIMEFRAME.default("jangka_pendek"),
  title: z.string().min(3).max(300),
  description: z.string().max(2000).optional().nullable(),
  pihak_terlibat: z.string().max(500).optional().nullable(),
  output_target: z.string().max(500).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: STATUS.default("rencana"),
});

export async function createActionPlan(input: z.input<typeof createSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase
    .from("desa_action_plans")
    .insert({ ...parsed.data, created_by: user.id });
  if (error) return { error: error.message };
  revalidatePath("/narasumber/rencana-aksi");
  revalidatePath(`/atourin/projects/${parsed.data.project_id}/rencana-aksi`);
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  timeframe: TIMEFRAME.optional(),
  title: z.string().min(3).max(300).optional(),
  description: z.string().max(2000).optional().nullable(),
  pihak_terlibat: z.string().max(500).optional().nullable(),
  output_target: z.string().max(500).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: STATUS.optional(),
});

export async function updateActionPlan(input: z.input<typeof updateSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const { id, ...rest } = parsed.data;
  const supabase = createClient();
  const { error } = await supabase
    .from("desa_action_plans")
    .update(rest)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/narasumber/rencana-aksi");
  return { ok: true };
}

export async function deleteActionPlan(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const supabase = createClient();
  const { error } = await supabase
    .from("desa_action_plans")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/narasumber/rencana-aksi");
  return { ok: true };
}

// =====================================================
// Evidence upload for action plan
// =====================================================
const evidenceSchema = z.object({
  action_plan_id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  mime_type: z.string().min(1).max(100),
  base64: z.string().min(1),
});

export async function uploadActionPlanEvidence(
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
  const path = `action-plans/${parsed.data.action_plan_id}/${Date.now()}-${safe}`;
  const { error: upErr } = await supabase.storage
    .from("vmt-evidence")
    .upload(path, bytes, {
      contentType: parsed.data.mime_type,
      upsert: false,
    });
  if (upErr) return { error: upErr.message };

  const { error } = await supabase
    .from("desa_action_plans")
    .update({ evidence_path: path })
    .eq("id", parsed.data.action_plan_id);
  if (error) {
    await supabase.storage.from("vmt-evidence").remove([path]);
    return { error: error.message };
  }
  revalidatePath("/narasumber/rencana-aksi");
  return { ok: true, path };
}
