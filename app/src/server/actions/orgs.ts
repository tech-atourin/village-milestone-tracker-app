"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import { sanitizeAuthUser } from "@/lib/auth/sanitize";

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

// =====================================================
// createOrgWithAdmin - create mitra org + optionally
// generate a mitra_admin user with login credentials
// in one transaction. Returns generated_password so the
// superadmin UI can show it once for hand-off.
// =====================================================

const createWithAdminSchema = z.object({
  name: z.string().min(2).max(200),
  brand_color_primary: z.string().optional().nullable(),
  // Optional admin to generate
  admin_full_name: z.string().min(2).max(120).optional().nullable(),
  admin_email: z.string().email().optional().nullable(),
  admin_phone: z.string().min(6).max(30).optional().nullable(),
});

function cryptoRandomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 14);
}

export async function createOrgWithAdmin(
  input: z.input<typeof createWithAdminSchema>,
): Promise<
  | {
      ok: true;
      org_id: string;
      admin?: { user_id: string; email: string; password: string };
    }
  | { error: string }
> {
  await requireRole("superadmin");
  const parsed = createWithAdminSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Input tidak valid: " + parsed.error.issues[0].message };
  const body = parsed.data;
  const admin = createAdminClient();

  // 1. Create the org
  const { data: orgRow, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name: body.name,
      type: "mitra",
      brand_color_primary: body.brand_color_primary ?? null,
    })
    .select("id")
    .single();
  if (orgErr) return { error: orgErr.message };
  const orgId = (orgRow as { id: string }).id;

  // 2. Optionally create admin user
  let adminInfo:
    | { user_id: string; email: string; password: string }
    | undefined;
  if (body.admin_full_name && body.admin_email) {
    // Email collision check
    const { data: dup } = await admin
      .from("users")
      .select("id")
      .eq("email", body.admin_email)
      .is("deleted_at", null)
      .maybeSingle();
    if (dup) {
      // Org already created - return success but flag the issue. We don't
      // tear down the org; superadmin can pick a different email and add
      // the admin via single-user form.
      return {
        ok: true,
        org_id: orgId,
        // No admin returned - caller will show a warning.
      };
    }
    const password = cryptoRandomPassword();
    const { data: authResult, error: authErr } =
      await admin.auth.admin.createUser({
        email: body.admin_email,
        email_confirm: true,
        password,
        user_metadata: { full_name: body.admin_full_name },
      });
    if (authErr || !authResult.user) {
      return { error: `Org dibuat tapi gagal generate admin: ${authErr?.message ?? "unknown"}` };
    }
    const userId = authResult.user.id;
    await sanitizeAuthUser(userId);
    const { error: insErr } = await admin.from("users").insert({
      id: userId,
      full_name: body.admin_full_name,
      email: body.admin_email,
      email_artificial: false,
      phone: body.admin_phone ?? null,
      global_role: "mitra_admin",
      organization_id: orgId,
    });
    if (insErr) {
      await admin.auth.admin.deleteUser(userId);
      return { error: `Org dibuat tapi gagal insert user row: ${insErr.message}` };
    }
    adminInfo = { user_id: userId, email: body.admin_email, password };
  }

  revalidatePath("/atourin/orgs");
  return { ok: true, org_id: orgId, admin: adminInfo };
}
