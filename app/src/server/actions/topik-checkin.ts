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

  // Topik must belong to the project.
  const { data: topik } = await admin
    .from("project_topik")
    .select("id")
    .eq("id", project_topik_id)
    .eq("project_id", project_id)
    .maybeSingle();
  if (!topik) return { error: "Topik tidak ditemukan pada project ini" };

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
