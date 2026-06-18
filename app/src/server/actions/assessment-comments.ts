"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { notifyMany } from "@/lib/notify";

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

  // In-app notification (skip for internal admin notes). Notify all
  // stakeholders of this assessment thread *except* the author:
  //   - the desa_wisata user(s) representing this desa
  //   - all superadmins
  //   - mitra_admin(s) whose org runs a project that includes this desa
  // so the conversation reaches every relevant role.
  if (!parsed.data.is_internal) {
    try {
      const admin = createAdminClient();
      const recipients = new Set<string>();

      // Desa representatives
      const { data: desaUsers } = await admin
        .from("users")
        .select("id")
        .eq("representing_desa_id", parsed.data.desa_id)
        .eq("global_role", "desa_wisata")
        .is("deleted_at", null);
      for (const d of (desaUsers ?? []) as Array<{ id: string }>)
        recipients.add(d.id);

      // Superadmins
      const { data: admins } = await admin
        .from("users")
        .select("id")
        .eq("global_role", "superadmin")
        .is("deleted_at", null);
      for (const a of (admins ?? []) as Array<{ id: string }>)
        recipients.add(a.id);

      // Mitra admins of orgs whose project includes this desa
      const { data: pd } = await admin
        .from("project_desa")
        .select("project:projects(organization_id)")
        .eq("desa_id", parsed.data.desa_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orgIds = Array.from(
        new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((pd ?? []) as any[])
            .map((r) => r.project?.organization_id)
            .filter(Boolean),
        ),
      );
      if (orgIds.length > 0) {
        const { data: mitras } = await admin
          .from("users")
          .select("id")
          .eq("global_role", "mitra_admin")
          .in("organization_id", orgIds as string[])
          .is("deleted_at", null);
        for (const m of (mitras ?? []) as Array<{ id: string }>)
          recipients.add(m.id);
      }

      recipients.delete(user.id); // don't notify the author

      // Resolve desa name for context
      const { data: desaRow } = await admin
        .from("desa")
        .select("name")
        .eq("id", parsed.data.desa_id)
        .maybeSingle();
      const desaName = (desaRow as { name: string } | null)?.name ?? "desa";

      await notifyMany({
        user_ids: Array.from(recipients),
        template_key: "comment_added",
        channels: ["in_app"],
        payload: {
          context_title: `Self-Assessment ${desaName}`,
          author_name: user.full_name,
          body_excerpt:
            parsed.data.body.length > 140
              ? parsed.data.body.slice(0, 140) + "…"
              : parsed.data.body,
          desa_id: parsed.data.desa_id,
        },
      });
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
