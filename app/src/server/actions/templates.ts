"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

// =====================================================
// Template CRUD - superadmin only
// Templates are a name + description + default_modules
// + ordered list of topik, each with ordered checklist items.
//
// Projects snapshot topik + checklist at create-time, so
// editing a template never disturbs existing projects.
// =====================================================

const checklistItemSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  reference_url: z.string().url().optional().nullable().or(z.literal("")),
  required: z.boolean().default(true),
});

const topikSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  items: z.array(checklistItemSchema).default([]),
});

const upsertTemplateSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  default_modules: z
    .record(z.boolean())
    .default({
      baseline: true,
      capacity_building: true,
      pendampingan: true,
      klasifikasi: false,
    }),
  topik: z.array(topikSchema).default([]),
});

export type UpsertTemplateInput = z.input<typeof upsertTemplateSchema>;

export async function upsertTemplate(
  input: UpsertTemplateInput,
): Promise<{ ok: true; id: string } | { error: string }> {
  const user = await requireRole("superadmin");
  const parsed = upsertTemplateSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: `Input tidak valid: ${issue.path.join(".") || "field"} - ${issue.message}`,
    };
  }
  const body = parsed.data;
  const admin = createAdminClient();

  // 1. Upsert template row
  let templateId = body.id ?? null;
  if (templateId) {
    const { error } = await admin
      .from("project_templates")
      .update({
        name: body.name,
        description: body.description ?? null,
        default_modules: body.default_modules,
      })
      .eq("id", templateId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await admin
      .from("project_templates")
      .insert({
        name: body.name,
        description: body.description ?? null,
        default_modules: body.default_modules,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    templateId = (data as { id: string }).id;
  }

  // 2. Replace topik + items.
  //    Simpler & atomic enough for templates: delete-then-insert. The
  //    cascade on template_topik → template_checklist_item handles items.
  if (body.id) {
    const { error: delErr } = await admin
      .from("template_topik")
      .delete()
      .eq("template_id", templateId);
    if (delErr) return { error: delErr.message };
  }

  for (let i = 0; i < body.topik.length; i++) {
    const t = body.topik[i];
    const { data: topRow, error: topErr } = await admin
      .from("template_topik")
      .insert({
        template_id: templateId,
        name: t.name,
        description: t.description ?? null,
        sort_order: i,
      })
      .select("id")
      .single();
    if (topErr) return { error: topErr.message };
    const topikId = (topRow as { id: string }).id;

    if (t.items.length > 0) {
      const itemsPayload = t.items.map((it, idx) => ({
        template_topik_id: topikId,
        title: it.title,
        description: it.description ?? null,
        reference_url: it.reference_url ? it.reference_url : null,
        required: it.required,
        sort_order: idx,
      }));
      const { error: insErr } = await admin
        .from("template_checklist_item")
        .insert(itemsPayload);
      if (insErr) return { error: insErr.message };
    }
  }

  revalidatePath("/atourin/templates");
  revalidatePath(`/atourin/templates/${templateId}/edit`);
  return { ok: true, id: templateId! };
}

export async function deleteTemplate(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  await requireRole("superadmin");
  const admin = createAdminClient();
  // Refuse if any project uses this template
  const { count } = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("template_id", id);
  if ((count ?? 0) > 0)
    return {
      error: `Tidak bisa hapus: template masih dipakai oleh ${count} project.`,
    };
  const { error } = await admin
    .from("project_templates")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/atourin/templates");
  return { ok: true };
}
