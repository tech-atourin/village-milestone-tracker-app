"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(500).optional(),
  all: z.boolean().optional(),
});

export async function markNotificationsRead(
  input: z.input<typeof markReadSchema>,
): Promise<{ ok: true; count: number } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const admin = createAdminClient();
  const now = new Date().toISOString();
  let count = 0;
  if (parsed.data.all) {
    const { data, error } = await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null)
      .select("id");
    if (error) return { error: error.message };
    count = (data ?? []).length;
  } else if (parsed.data.ids && parsed.data.ids.length > 0) {
    const { data, error } = await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .in("id", parsed.data.ids)
      .is("read_at", null)
      .select("id");
    if (error) return { error: error.message };
    count = (data ?? []).length;
  }
  revalidatePath("/notifications");
  return { ok: true, count };
}
