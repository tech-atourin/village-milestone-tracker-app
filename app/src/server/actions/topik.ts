"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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
