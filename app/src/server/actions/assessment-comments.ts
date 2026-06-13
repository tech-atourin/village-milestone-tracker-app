"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const schema = z.object({
  target_type: z.enum(["criteria_progress", "criteria_item", "hub_question"]),
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

  // In-app notification (skip for internal admin notes)
  if (!parsed.data.is_internal) {
    try {
      if (user.global_role === "superadmin") {
        // Admin → notify desa_wisata user who represents this desa
        const { data: desaUser } = await supabase
          .from("users")
          .select("id")
          .eq("representing_desa_id", parsed.data.desa_id)
          .eq("global_role", "desa_wisata")
          .maybeSingle();
        const target = (desaUser as { id: string } | null)?.id;
        if (target) {
          await supabase.from("notifications").insert({
            user_id: target,
            channel: "in_app",
            template_key: "assessment_comment",
            payload: {
              _rendered: {
                subject: "Tanggapan dari Atourin",
                inAppText: `${user.full_name} memberi tanggapan pada self-assessment Anda`,
                html: "",
              },
            },
            status: "pending",
          });
        }
      } else if (user.global_role === "desa_wisata") {
        // Desa → notify all superadmins
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .eq("global_role", "superadmin");
        for (const a of (admins ?? []) as Array<{ id: string }>) {
          await supabase.from("notifications").insert({
            user_id: a.id,
            channel: "in_app",
            template_key: "assessment_comment",
            payload: {
              _rendered: {
                subject: "Pertanyaan dari desa wisata",
                inAppText: `${user.full_name} bertanya/berbalas pada self-assessment`,
                html: "",
              },
            },
            status: "pending",
          });
        }
      }
    } catch {
      // best-effort; ignore notif errors
    }
  }

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
