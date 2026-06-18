"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

// =====================================================
// V1 — national_criteria_item CRUD (per kriteria Permenpar)
// =====================================================

const itemSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  master_id: z.string().uuid(),
  title: z.string().min(2).max(500),
  description: z.string().max(4000).optional().nullable(),
  category: z.string().max(120).optional().nullable(),
  tier: z.enum(["rintisan", "berkembang", "maju", "mandiri"]),
  sort_order: z.number().int().optional().nullable(),
  weight: z.number().optional().nullable(),
  required: z.boolean().optional().nullable(),
});

export async function upsertCriteriaItem(input: z.input<typeof itemSchema>) {
  await requireRole("superadmin");
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const admin = createAdminClient();
  const payload = {
    master_id: parsed.data.master_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    category: parsed.data.category ?? null,
    tier: parsed.data.tier,
    sort_order: parsed.data.sort_order ?? 0,
    weight: parsed.data.weight ?? 1,
    required: parsed.data.required ?? false,
  };
  if (parsed.data.id) {
    const { error } = await admin
      .from("national_criteria_item")
      .update(payload)
      .eq("id", parsed.data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin
      .from("national_criteria_item")
      .insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/atourin/klasifikasi/master/v1");
  return { ok: true };
}

export async function deleteCriteriaItem(id: string) {
  await requireRole("superadmin");
  const admin = createAdminClient();
  const { error } = await admin.from("national_criteria_item").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/atourin/klasifikasi/master/v1");
  return { ok: true };
}

// =====================================================
// V2 — hub_assessment_template definisi JSON
// =====================================================

const templateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(500),
  versi: z.string().min(1).max(50),
  description: z.string().max(4000).optional().nullable(),
  definisi: z.unknown(),
});

export async function updateHubTemplate(input: z.input<typeof templateSchema>) {
  await requireRole("superadmin");
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("hub_assessment_template")
    .update({
      name: parsed.data.name,
      versi: parsed.data.versi,
      description: parsed.data.description ?? null,
      definisi: parsed.data.definisi,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath("/atourin/klasifikasi/master/v2");
  return { ok: true };
}
