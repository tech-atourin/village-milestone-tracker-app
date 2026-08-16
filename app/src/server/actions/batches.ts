"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

// Mitra hanya boleh mengelola batch di project org-nya.
async function assertProjectAccess(projectId: string) {
  const actor = await requireRole("superadmin", "mitra_admin");
  if (actor.global_role === "mitra_admin") {
    const admin = createAdminClient();
    const { data: proj } = await admin
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .maybeSingle();
    if (!proj || proj.organization_id !== actor.organization_id) {
      return { error: "Project di luar organisasi Anda" as const };
    }
  }
  return { ok: true as const };
}

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  quota: z.number().int().min(0).max(100000).optional().nullable(),
  sort_order: z.number().int().optional().nullable(),
});

export async function saveBatch(input: z.input<typeof upsertSchema>) {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const b = parsed.data;
  const acc = await assertProjectAccess(b.project_id);
  if ("error" in acc) return { error: acc.error };
  const admin = createAdminClient();

  const payload = {
    project_id: b.project_id,
    name: b.name,
    start_date: b.start_date || null,
    end_date: b.end_date || null,
    quota: b.quota ?? null,
    sort_order: b.sort_order ?? 0,
  };

  if (b.id) {
    const { error } = await admin
      .from("project_batches")
      .update(payload)
      .eq("id", b.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("project_batches").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath(`/atourin/projects/${b.project_id}`);
  revalidatePath(`/mitra/projects/${b.project_id}`);
  return { ok: true };
}

export async function deleteBatch(input: { id: string; project_id: string }) {
  const acc = await assertProjectAccess(input.project_id);
  if ("error" in acc) return { error: acc.error };
  const admin = createAdminClient();
  // Peserta ter-set batch_id ini otomatis jadi null (ON DELETE SET NULL).
  const { error } = await admin
    .from("project_batches")
    .delete()
    .eq("id", input.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${input.project_id}`);
  revalidatePath(`/mitra/projects/${input.project_id}`);
  return { ok: true };
}

// Tetapkan/pindahkan peserta ke sebuah batch (atau lepas: batch_id null).
export async function assignPesertaBatch(input: {
  project_id: string;
  user_id: string;
  batch_id: string | null;
}) {
  const acc = await assertProjectAccess(input.project_id);
  if ("error" in acc) return { error: acc.error };
  const admin = createAdminClient();
  const { error } = await admin
    .from("project_memberships")
    .update({ batch_id: input.batch_id })
    .eq("project_id", input.project_id)
    .eq("user_id", input.user_id)
    .eq("role", "peserta");
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${input.project_id}`);
  revalidatePath(`/mitra/projects/${input.project_id}`);
  return { ok: true };
}
