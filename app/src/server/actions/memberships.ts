"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

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
