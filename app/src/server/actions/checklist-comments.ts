"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { notifyMany, projectReviewers } from "@/lib/notify";

export type ChecklistComment = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
};

const addSchema = z.object({
  checklist_progress_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

async function resolveChecklistContext(checklistProgressId: string): Promise<{
  desa_id: string;
  project_id: string;
  project_desa_id: string;
  status: string;
  checklist_title: string | null;
  desa_name: string | null;
} | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("checklist_progress")
    .select(
      "id, status, project_checklist_item:project_checklist_item(title, project_topik:project_topik(project_id)), desa_topik_instance:desa_topik_instance(project_desa:project_desa(id, desa_id, desa:desa(name)))",
    )
    .eq("id", checklistProgressId)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = data as any;
  const projectDesa = c.desa_topik_instance?.project_desa;
  if (!projectDesa?.desa_id) return null;
  return {
    desa_id: projectDesa.desa_id,
    project_desa_id: projectDesa.id,
    project_id: c.project_checklist_item?.project_topik?.project_id ?? "",
    status: c.status ?? "submitted",
    checklist_title: c.project_checklist_item?.title ?? null,
    desa_name: projectDesa.desa?.name ?? null,
  };
}

export async function listChecklistComments(
  checklistProgressId: string,
): Promise<ChecklistComment[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("assessment_comments")
    .select(
      "id, author_id, author_role, body, created_at, author:users!assessment_comments_author_id_fkey(full_name)",
    )
    .eq("target_type", "checklist_progress")
    .eq("target_id", checklistProgressId)
    .order("created_at", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    author_id: r.author_id,
    author_name: r.author?.full_name ?? "Pengguna",
    author_role: r.author_role,
    body: r.body,
    created_at: r.created_at,
  }));
}

export async function addChecklistComment(
  input: z.input<typeof addSchema>,
): Promise<{ ok: true; comment: ChecklistComment } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const ctx = await resolveChecklistContext(parsed.data.checklist_progress_id);
  if (!ctx) return { error: "Checklist tidak ditemukan" };

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("assessment_comments")
    .insert({
      target_type: "checklist_progress",
      target_id: parsed.data.checklist_progress_id,
      desa_id: ctx.desa_id,
      author_id: user.id,
      author_role: user.global_role,
      body: parsed.data.body,
      is_internal: false,
    })
    .select("id, created_at")
    .single();
  if (error || !inserted) return { error: error?.message ?? "Gagal kirim" };

  // Auto-resubmit: peserta/desa replying on rejected item → flip to submitted
  const isPesertaSide =
    user.global_role === "peserta" || user.global_role === "desa_wisata";
  if (isPesertaSide && ctx.status === "rejected") {
    await admin
      .from("checklist_progress")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        submitted_by: user.id,
      })
      .eq("id", parsed.data.checklist_progress_id);
  }

  // Notify the other side
  try {
    const recipients = new Set<string>();
    if (isPesertaSide) {
      // peserta/desa → notify reviewers
      if (ctx.project_id) {
        const reviewers = await projectReviewers(ctx.project_id);
        reviewers.forEach((id) => recipients.add(id));
      }
    } else {
      // reviewer → notify peserta(s) of this project_desa + desa_wisata user(s)
      const { data: members } = await admin
        .from("project_memberships")
        .select("user_id, role")
        .eq("project_id", ctx.project_id)
        .in("role", ["peserta"])
        .eq("desa_id", ctx.desa_id)
        .eq("status", "active");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const m of ((members ?? []) as any[])) recipients.add(m.user_id);
      const { data: desaUsers } = await admin
        .from("users")
        .select("id")
        .eq("representing_desa_id", ctx.desa_id)
        .eq("global_role", "desa_wisata")
        .is("deleted_at", null);
      for (const d of ((desaUsers ?? []) as Array<{ id: string }>))
        recipients.add(d.id);
    }
    recipients.delete(user.id);
    if (recipients.size > 0) {
      await notifyMany({
        user_ids: Array.from(recipients),
        template_key: "comment_added",
        channels: ["in_app"],
        payload: {
          context_title: `Checklist ${ctx.checklist_title ?? ""} (${ctx.desa_name ?? ""})`.trim(),
          author_name: user.full_name,
          body_excerpt:
            parsed.data.body.length > 140
              ? parsed.data.body.slice(0, 140) + "…"
              : parsed.data.body,
          project_id: ctx.project_id,
        },
      });
    }
  } catch {
    // best-effort
  }

  return {
    ok: true,
    comment: {
      id: (inserted as { id: string }).id,
      author_id: user.id,
      author_name: user.full_name,
      author_role: user.global_role,
      body: parsed.data.body,
      created_at: (inserted as { created_at: string }).created_at,
    },
  };
}
