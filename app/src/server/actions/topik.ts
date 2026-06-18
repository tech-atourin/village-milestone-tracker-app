"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

// =====================================================
// Topik CRUD
// =====================================================
const addTopikSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
});

export async function addTopik(input: z.input<typeof addTopikSchema>) {
  await requireRole("superadmin");
  const parsed = addTopikSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();

  // Compute next sort_order
  const { data: existing } = await supabase
    .from("project_topik")
    .select("sort_order")
    .eq("project_id", parsed.data.project_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort =
    ((existing as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("project_topik").insert({
    project_id: parsed.data.project_id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    sort_order: nextSort,
  });
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

const renameTopikSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
});

export async function renameTopik(input: z.input<typeof renameTopikSchema>) {
  await requireRole("superadmin");
  const parsed = renameTopikSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase
    .from("project_topik")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

const deleteTopikSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
});

export async function deleteTopik(input: z.input<typeof deleteTopikSchema>) {
  await requireRole("superadmin");
  const parsed = deleteTopikSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  // CASCADE handles project_checklist_item + desa_topik_instance + checklist_progress
  const { error } = await supabase
    .from("project_topik")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

// =====================================================
// Checklist item CRUD
// =====================================================
const addItemSchema = z.object({
  project_topik_id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(2).max(500),
  description: z.string().max(2000).optional().nullable(),
  required: z.boolean().default(true),
});

export async function addChecklistItem(input: z.input<typeof addItemSchema>) {
  await requireRole("superadmin");
  const parsed = addItemSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("project_checklist_item")
    .select("sort_order")
    .eq("project_topik_id", parsed.data.project_topik_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort =
    ((existing as { sort_order: number } | null)?.sort_order ?? 0) + 1;
  const { error } = await supabase.from("project_checklist_item").insert({
    project_topik_id: parsed.data.project_topik_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    required: parsed.data.required,
    sort_order: nextSort,
  });
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

const updateItemSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(2).max(500),
  description: z.string().max(2000).optional().nullable(),
  required: z.boolean(),
});

export async function updateChecklistItem(
  input: z.input<typeof updateItemSchema>,
) {
  await requireRole("superadmin");
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase
    .from("project_checklist_item")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      required: parsed.data.required,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

const deleteItemSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
});

export async function deleteChecklistItem(
  input: z.input<typeof deleteItemSchema>,
) {
  await requireRole("superadmin");
  const parsed = deleteItemSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase
    .from("project_checklist_item")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  return { ok: true };
}

// =====================================================
// Apply template - clone template_topik + items into a project that has
// no topiks yet. Mirrors the cloning inside the create_project_from_template
// RPC so it can be invoked after project creation.
// =====================================================
const applyTemplateSchema = z.object({
  project_id: z.string().uuid(),
  template_id: z.string().uuid(),
});

export async function applyTemplateToProject(
  input: z.input<typeof applyTemplateSchema>,
) {
  await requireRole("superadmin", "mitra_admin");
  const parsed = applyTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createAdminClient();

  // Refuse if project already has topiks - prevents accidental duplication.
  const { count: existingTopik } = await supabase
    .from("project_topik")
    .select("id", { count: "exact", head: true })
    .eq("project_id", parsed.data.project_id);
  if ((existingTopik ?? 0) > 0) {
    return {
      error:
        "Project sudah punya topik. Hapus topik dulu kalau mau apply template baru.",
    };
  }

  // Pull template topiks + their items.
  const { data: tmplTopik } = await supabase
    .from("template_topik")
    .select("id, name, description, sort_order")
    .eq("template_id", parsed.data.template_id)
    .order("sort_order");
  const topiks = ((tmplTopik ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    sort_order: number;
  }>);
  if (topiks.length === 0) return { error: "Template kosong (tidak ada topik)." };

  const { data: tmplItems } = await supabase
    .from("template_checklist_item")
    .select(
      "template_topik_id, title, description, reference_url, required, sort_order",
    )
    .in(
      "template_topik_id",
      topiks.map((t) => t.id),
    )
    .order("sort_order");
  const itemsByTopik = new Map<
    string,
    Array<{
      title: string;
      description: string | null;
      reference_url: string | null;
      required: boolean;
      sort_order: number;
    }>
  >();
  for (const it of (tmplItems ?? []) as Array<{
    template_topik_id: string;
    title: string;
    description: string | null;
    reference_url: string | null;
    required: boolean;
    sort_order: number;
  }>) {
    const arr = itemsByTopik.get(it.template_topik_id) ?? [];
    arr.push({
      title: it.title,
      description: it.description,
      reference_url: it.reference_url,
      required: it.required,
      sort_order: it.sort_order,
    });
    itemsByTopik.set(it.template_topik_id, arr);
  }

  // Insert project_topik rows + their items.
  for (const t of topiks) {
    const { data: created, error: ptErr } = await supabase
      .from("project_topik")
      .insert({
        project_id: parsed.data.project_id,
        name: t.name,
        description: t.description,
        source_template_topik_id: t.id,
        sort_order: t.sort_order,
      })
      .select("id")
      .single();
    if (ptErr || !created) return { error: ptErr?.message ?? "Gagal apply topik" };
    const newTopikId = (created as { id: string }).id;

    const items = itemsByTopik.get(t.id) ?? [];
    if (items.length > 0) {
      const { error: ciErr } = await supabase
        .from("project_checklist_item")
        .insert(
          items.map((it) => ({
            project_topik_id: newTopikId,
            title: it.title,
            description: it.description,
            reference_url: it.reference_url,
            required: it.required,
            sort_order: it.sort_order,
          })),
        );
      if (ciErr) return { error: ciErr.message };
    }
  }

  // Materialize desa_topik_instance for each project_desa already attached.
  const { data: pdRows } = await supabase
    .from("project_desa")
    .select("id")
    .eq("project_id", parsed.data.project_id);
  const { data: newTopikRows } = await supabase
    .from("project_topik")
    .select("id")
    .eq("project_id", parsed.data.project_id);
  const pdIds = ((pdRows ?? []) as Array<{ id: string }>).map((r) => r.id);
  const newTopikIds = ((newTopikRows ?? []) as Array<{ id: string }>).map(
    (r) => r.id,
  );
  if (pdIds.length > 0 && newTopikIds.length > 0) {
    const rows = pdIds.flatMap((pdId) =>
      newTopikIds.map((tid) => ({
        project_desa_id: pdId,
        project_topik_id: tid,
      })),
    );
    await supabase
      .from("desa_topik_instance")
      .upsert(rows, { onConflict: "project_desa_id,project_topik_id" });
  }

  revalidatePath(`/atourin/projects/${parsed.data.project_id}`);
  revalidatePath(`/mitra/projects/${parsed.data.project_id}`);
  return { ok: true, topikCount: topiks.length };
}
