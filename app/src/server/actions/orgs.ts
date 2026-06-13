"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["atourin", "mitra"]),
  brand_color_primary: z.string().optional().nullable(),
});

export async function createOrg(input: z.input<typeof createSchema>) {
  await requireRole("superadmin");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/atourin/orgs");
  return { id: (data as { id: string }).id };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200),
  brand_color_primary: z.string().optional().nullable(),
  brand_color_secondary: z.string().optional().nullable(),
});

export async function updateOrg(input: z.input<typeof updateSchema>) {
  await requireRole("superadmin");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      brand_color_primary: parsed.data.brand_color_primary ?? null,
      brand_color_secondary: parsed.data.brand_color_secondary ?? null,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath("/atourin/orgs");
  return { ok: true };
}

const uploadLogoSchema = z.object({
  org_id: z.string().uuid(),
  filename: z.string().max(200),
  mime_type: z.string(),
  base64: z.string().min(1),
});

export async function uploadOrgLogo(input: z.input<typeof uploadLogoSchema>) {
  await requireRole("superadmin");
  const parsed = uploadLogoSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const admin = createAdminClient();
  const bytes = Buffer.from(parsed.data.base64, "base64");
  if (bytes.byteLength > 5 * 1024 * 1024) {
    return { error: "Logo terlalu besar (maks 5 MB)" };
  }
  const ext = (parsed.data.filename.split(".").pop() ?? "png").toLowerCase();
  const path = `${parsed.data.org_id}/logo-${Date.now()}.${ext}`;

  const { error: upErr } = await admin.storage
    .from("vmt-org-assets")
    .upload(path, bytes, {
      contentType: parsed.data.mime_type,
      upsert: true,
    });
  if (upErr) return { error: upErr.message };

  const { data: pub } = admin.storage.from("vmt-org-assets").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: dbErr } = await admin
    .from("organizations")
    .update({ logo_url: publicUrl })
    .eq("id", parsed.data.org_id);
  if (dbErr) return { error: dbErr.message };

  revalidatePath("/atourin/orgs");
  return { ok: true, logo_url: publicUrl };
}
