"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const schema = z.object({
  target_type: z.enum(["criteria_progress", "hub_question"]),
  target_id: z.string().min(1).max(200),
  desa_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  is_internal: z.boolean().default(false),
});

export async function addAssessmentComment(input: z.input<typeof schema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  // Non-superadmin cannot post internal
  if (parsed.data.is_internal && user.global_role !== "superadmin") {
    return { error: "Hanya admin yang boleh comment internal" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("assessment_comments").insert({
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    desa_id: parsed.data.desa_id,
    author_id: user.id,
    author_role: user.global_role,
    body: parsed.data.body,
    is_internal: parsed.data.is_internal,
  });
  if (error) return { error: error.message };
  revalidatePath("/desa/self-assessment");
  revalidatePath("/atourin/klasifikasi");
  return { ok: true };
}

export async function deleteAssessmentComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const supabase = createClient();
  const { error } = await supabase
    .from("assessment_comments")
    .delete()
    .eq("id", commentId);
  if (error) return { error: error.message };
  revalidatePath("/desa/self-assessment");
  return { ok: true };
}
