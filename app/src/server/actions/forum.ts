"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const postSchema = z.object({
  project_id: z.string().uuid(),
  body: z.string().min(2).max(2000),
});

export async function postForumMessage(input: z.input<typeof postSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: "Pesan terlalu pendek atau panjang" };
  const supabase = createClient();
  const { error } = await supabase.from("feedback").insert({
    target_type: "other",
    target_id: parsed.data.project_id,
    author_id: user.id,
    body: parsed.data.body,
    visibility:
      user.global_role === "peserta" ? "peserta" : "internal_atourin",
  });
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}/diskusi`);
  revalidatePath(`/peserta/projects/${parsed.data.project_id}/diskusi`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}/diskusi`);
  return { ok: true };
}
