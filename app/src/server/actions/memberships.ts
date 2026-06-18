"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";

const addMemberSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["peserta", "pendamping", "narasumber", "mitra_admin"]),
  desa_id: z.string().uuid().optional().nullable(),
});

export type AddMemberInput = z.input<typeof addMemberSchema>;

export async function addProjectMember(input: AddMemberInput) {
  await requireRole("superadmin");
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Input tidak valid" };
  }
  const supabase = createClient();
  const { error } = await supabase.from("project_memberships").insert({
    project_id: parsed.data.project_id,
    user_id: parsed.data.user_id,
    role: parsed.data.role,
    desa_id: parsed.data.desa_id ?? null,
    status: "active",
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "User sudah punya role tersebut di project ini." };
    }
    return { error: error.message };
  }
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

const removeMemberSchema = z.object({
  membership_id: z.string().uuid(),
  project_id: z.string().uuid(),
});

export async function removeProjectMember(
  input: z.input<typeof removeMemberSchema>,
) {
  await requireRole("superadmin");
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase
    .from("project_memberships")
    .update({ status: "removed" })
    .eq("id", parsed.data.membership_id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

// =====================================================
// Narasumber per-desa assignment
// Replaces ALL active narasumber memberships for (project, user) with one
// row per selected desa_id. Empty list = remove narasumber from project.
// =====================================================
const setNarasumberDesaSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  desa_ids: z.array(z.string().uuid()).default([]),
});

export async function setNarasumberDesa(
  input: z.input<typeof setNarasumberDesaSchema>,
): Promise<{ ok: true } | { error: string }> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };
  const parsed = setNarasumberDesaSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const admin = createAdminClient();

  // Mitra ownership guard
  if (actor.global_role === "mitra_admin") {
    const { data: proj } = await admin
      .from("projects")
      .select("organization_id")
      .eq("id", parsed.data.project_id)
      .maybeSingle();
    const orgId = (proj as { organization_id: string | null } | null)
      ?.organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda." };
  }

  // Validate desa_ids are in this project
  if (parsed.data.desa_ids.length > 0) {
    const { data: pdRows } = await admin
      .from("project_desa")
      .select("desa_id")
      .eq("project_id", parsed.data.project_id)
      .in("desa_id", parsed.data.desa_ids);
    const validIds = new Set(
      ((pdRows ?? []) as Array<{ desa_id: string }>).map((r) => r.desa_id),
    );
    for (const id of parsed.data.desa_ids) {
      if (!validIds.has(id))
        return { error: "Salah satu desa tidak terdaftar di project ini." };
    }
  }

  // Replace: delete all existing rows for (project, user, role=narasumber),
  // then insert new ones.
  const { error: delErr } = await admin
    .from("project_memberships")
    .delete()
    .eq("project_id", parsed.data.project_id)
    .eq("user_id", parsed.data.user_id)
    .eq("role", "narasumber");
  if (delErr) return { error: delErr.message };

  if (parsed.data.desa_ids.length > 0) {
    const rows = parsed.data.desa_ids.map((desa_id) => ({
      project_id: parsed.data.project_id,
      user_id: parsed.data.user_id,
      role: "narasumber" as const,
      desa_id,
      status: "active",
    }));
    const { error: insErr } = await admin
      .from("project_memberships")
      .insert(rows);
    if (insErr) return { error: insErr.message };
  }

  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}`);
  return { ok: true };
}
