"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const createDesaSchema = z.object({
  name: z.string().min(2).max(200),
  desa_kelurahan: z.string().max(200).optional().nullable(),
  kecamatan: z.string().max(200).optional().nullable(),
  kabupaten: z.string().max(200).optional().nullable(),
  provinsi: z.string().max(200).optional().nullable(),
});

export type CreateDesaInput = z.input<typeof createDesaSchema>;

export async function createDesaAction(input: CreateDesaInput) {
  await requireRole("superadmin");
  const parsed = createDesaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Input tidak valid", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  // RLS on vmt.desa has no INSERT policy. Role guarded above; use admin client.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desa")
    .insert(parsed.data)
    .select("id, name")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/atourin/desa");
  return { desa: data as { id: string; name: string } };
}

const attachDesaSchema = z.object({
  project_id: z.string().uuid(),
  desa_id: z.string().uuid(),
  classification_at_start: z
    .enum(["rintisan", "berkembang", "maju", "mandiri", "unclassified"])
    .default("unclassified"),
  classification_target: z
    .enum(["rintisan", "berkembang", "maju", "mandiri", "unclassified"])
    .optional()
    .nullable(),
  coordinator_user_id: z.string().uuid().optional().nullable(),
});

export type AttachDesaInput = z.input<typeof attachDesaSchema>;

export async function attachDesaToProject(input: AttachDesaInput) {
  await requireRole("superadmin");
  const parsed = attachDesaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Input tidak valid" };
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("attach_desa_to_project", {
    p_project_id: parsed.data.project_id,
    p_desa_id: parsed.data.desa_id,
    p_classification_at_start: parsed.data.classification_at_start,
    p_classification_target: parsed.data.classification_target ?? null,
    p_coordinator_user_id: parsed.data.coordinator_user_id ?? null,
  });
  if (error) {
    console.error("attachDesaToProject:", error);
    return { error: error.message };
  }
  // Auto-attach all peserta whose representing_desa_id matches this desa
  await autoAttachPesertaByDesa(parsed.data.project_id, parsed.data.desa_id);
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { project_desa_id: data as string };
}

// Helper: find all peserta users whose home desa = desaId, and insert them
// as active project_memberships for the given project. Idempotent via upsert.
async function autoAttachPesertaByDesa(projectId: string, desaId: string) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();
  const { data: peserta } = await admin
    .from("users")
    .select("id")
    .eq("global_role", "peserta")
    .eq("representing_desa_id", desaId)
    .is("deleted_at", null);
  for (const u of ((peserta ?? []) as Array<{ id: string }>)) {
    await admin.from("project_memberships").upsert(
      {
        project_id: projectId,
        user_id: u.id,
        role: "peserta",
        desa_id: desaId,
        status: "active",
      },
      { onConflict: "project_id,user_id,role" },
    );
  }
}
