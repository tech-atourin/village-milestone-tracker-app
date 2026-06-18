"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/rbac";

/**
 * Project checklist review is open to:
 *   - superadmin (Atourin global)
 *   - mitra_admin whose organization owns the project
 *   - narasumber who is a member of the project
 * Returns the actor or an error.
 */
async function ensureCanReviewProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" } as const;
  if (user.global_role === "superadmin") return { user } as const;
  const admin = createAdminClient();
  if (user.global_role === "mitra_admin") {
    const { data: proj } = await admin
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .maybeSingle();
    const orgId = (proj as { organization_id: string | null } | null)
      ?.organization_id;
    if (orgId && orgId === user.organization_id) return { user } as const;
    return { error: "Project bukan milik organisasi Anda" } as const;
  }
  if (user.global_role === "narasumber") {
    const { data: m } = await admin
      .from("project_memberships")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("role", "narasumber")
      .eq("status", "active")
      .maybeSingle();
    if (m) return { user } as const;
    return { error: "Anda bukan narasumber project ini" } as const;
  }
  return { error: "Tidak diizinkan" } as const;
}

const reviewSchema = z.object({
  checklist_progress_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).optional().nullable(),
  project_id: z.string().uuid(),
});

// Bulk approve: serial loop calling the same RPC.
const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).optional().nullable(),
  project_id: z.string().uuid(),
});

export async function bulkReviewChecklistItems(
  input: z.input<typeof bulkSchema>,
) {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const guard = await ensureCanReviewProject(parsed.data.project_id);
  if ("error" in guard) return { error: guard.error };
  // Use admin client so narasumber/mitra (who lack RPC grants under RLS)
  // can still execute the review RPC. Ownership already verified above.
  const supabase = createAdminClient();
  let approved = 0;
  let failed = 0;
  for (const id of parsed.data.ids) {
    const { error } = await supabase.rpc("review_checklist_item", {
      p_checklist_progress_id: id,
      p_decision: parsed.data.decision,
      p_note: parsed.data.note ?? null,
      p_reviewer_id: guard.user.id,
    });
    if (error) failed++;
    else approved++;
  }
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}`);
  revalidatePath(`/narasumber/projects/${parsed.data.project_id}`);
  revalidatePath(`/peserta/projects/${parsed.data.project_id}`, "layout");
  revalidatePath(`/desa`, "layout");
  return { ok: true, approved, failed };
}

export async function reviewChecklistItem(input: z.input<typeof reviewSchema>) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const guard = await ensureCanReviewProject(parsed.data.project_id);
  if ("error" in guard) return { error: guard.error };
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("review_checklist_item", {
    p_checklist_progress_id: parsed.data.checklist_progress_id,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note ?? null,
    p_reviewer_id: guard.user.id,
  });
  if (error) return { error: error.message };

  // Audit trail
  const actor = await getCurrentUser();
  await audit({
    actor_id: actor?.id ?? null,
    action:
      parsed.data.decision === "approved"
        ? "checklist.approved"
        : "checklist.rejected",
    entity_type: "checklist_progress",
    entity_id: parsed.data.checklist_progress_id,
    after: { note: parsed.data.note },
  });

  // Notify peserta (best-effort).
  try {
    const admin = createAdminClient();
    const { data: cp } = await admin
      .from("checklist_progress")
      .select(
        "submitted_by, project_checklist_item:project_checklist_item(title, project_topik:project_topik(name))",
      )
      .eq("id", parsed.data.checklist_progress_id)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = cp as any;
    if (c?.submitted_by) {
      await notify({
        user_id: c.submitted_by,
        template_key:
          parsed.data.decision === "approved"
            ? "checklist_approved"
            : "checklist_rejected",
        channel: "email",
        payload: {
          checklist_title: c.project_checklist_item?.title,
          topik_name: c.project_checklist_item?.project_topik?.name,
          note: parsed.data.note,
        },
      });
    }
  } catch (e) {
    console.warn("notify failed:", e);
  }

  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}`);
  revalidatePath(`/narasumber/projects/${parsed.data.project_id}`);
  revalidatePath(`/peserta/projects/${parsed.data.project_id}`, "layout");
  revalidatePath(`/desa`, "layout");
  return { ok: true };
}
