"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";

// =====================================================
// Single-user CRUD — superadmin + mitra_admin can create
// peserta / narasumber / mitra_admin individually
// without going through bulk import.
// =====================================================

const ROLES = [
  "superadmin",
  "mitra_admin",
  "peserta",
  "narasumber",
  "desa_wisata",
] as const;

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  full_name: z.string().min(2).max(120),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(6).max(30).optional().nullable(),
  global_role: z.enum(ROLES),
  organization_id: z.string().uuid().optional().nullable(),
  // Narasumber-specific extras (ignored for other roles)
  kategori_narasumber: z.string().max(40).optional().nullable(),
  kompetensi: z.string().max(500).optional().nullable(),
  jabatan: z.string().max(120).optional().nullable(),
  instansi: z.string().max(200).optional().nullable(),
  kota: z.string().max(80).optional().nullable(),
  // Auth: create login account
  create_auth: z.boolean().optional(),
  password: z.string().min(8).max(64).optional().nullable(),
});

function cryptoRandomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 14);
}

async function ensureAccess(roleToTouch: string, orgIdToTouch: string | null) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" } as const;
  if (user.global_role === "superadmin") return { user } as const;
  if (user.global_role === "mitra_admin") {
    // Mitra can only manage peserta, narasumber within their own org
    if (roleToTouch === "superadmin") return { error: "Tidak diizinkan membuat superadmin" } as const;
    if (roleToTouch === "mitra_admin" && orgIdToTouch !== user.organization_id)
      return { error: "Mitra hanya bisa kelola org sendiri" } as const;
    return { user } as const;
  }
  return { error: "Tidak diizinkan" } as const;
}

export async function upsertUser(input: z.input<typeof upsertSchema>): Promise<
  | { ok: true; id: string; generated_password?: string }
  | { error: string }
> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Input tidak valid: ${issue.path.join(".") || "field"} — ${issue.message}` };
  }
  const body = parsed.data;
  const access = await ensureAccess(body.global_role, body.organization_id ?? null);
  if ("error" in access) return { error: access.error ?? "Tidak diizinkan" };

  const admin = createAdminClient();

  // Build profile row payload
  const profile: Record<string, unknown> = {
    full_name: body.full_name,
    email: body.email ?? null,
    email_artificial: !body.email,
    phone: body.phone ?? null,
    global_role: body.global_role,
    organization_id: body.organization_id ?? null,
  };
  if (body.global_role === "narasumber") {
    profile.kategori_narasumber = body.kategori_narasumber ?? null;
    profile.kompetensi = body.kompetensi ?? null;
    profile.jabatan = body.jabatan ?? null;
    profile.instansi = body.instansi ?? null;
    profile.kota = body.kota ?? null;
  }

  if (body.id) {
    // ----- Update existing -----
    const { error } = await admin.from("users").update(profile).eq("id", body.id);
    if (error) return { error: error.message };
    await audit({
      actor_id: access.user.id,
      action: "member.added",
      entity_type: `user.${body.global_role}`,
      entity_id: body.id,
      after: { full_name: body.full_name },
    });
    revalidatePath("/atourin/users");
    revalidatePath("/atourin/narasumber");
    revalidatePath("/mitra/peserta");
    revalidatePath("/mitra/narasumber");
    return { ok: true, id: body.id };
  }

  // ----- Insert: dup check -----
  if (body.email) {
    const { data: dup } = await admin
      .from("users")
      .select("id")
      .eq("email", body.email)
      .is("deleted_at", null)
      .maybeSingle();
    if (dup) return { error: "Email sudah dipakai user lain" };
  }

  let userId: string;
  let generatedPassword: string | undefined;
  const wantsAuth = body.create_auth ?? Boolean(body.email);

  if (wantsAuth && body.email) {
    const password = body.password ?? cryptoRandomPassword();
    const { data: authResult, error: authError } =
      await admin.auth.admin.createUser({
        email: body.email,
        email_confirm: true,
        password,
        user_metadata: { full_name: body.full_name },
      });
    if (authError || !authResult.user)
      return { error: authError?.message ?? "Gagal buat akun auth" };
    userId = authResult.user.id;
    if (!body.password) generatedPassword = password;
    const { error: insErr } = await admin
      .from("users")
      .insert({ id: userId, ...profile });
    if (insErr) {
      await admin.auth.admin.deleteUser(userId);
      return { error: insErr.message };
    }
  } else {
    // No-auth profile-only (e.g. narasumber tanpa login akses)
    const { data, error } = await admin
      .from("users")
      .insert(profile)
      .select("id")
      .single();
    if (error) return { error: error.message };
    userId = (data as { id: string }).id;
  }

  await audit({
    actor_id: access.user.id,
    action: "member.added",
    entity_type: `user.${body.global_role}`,
    entity_id: userId,
    after: { full_name: body.full_name },
  });
  revalidatePath("/atourin/users");
  revalidatePath("/atourin/narasumber");
  revalidatePath("/mitra/peserta");
  revalidatePath("/mitra/narasumber");
  return { ok: true, id: userId, generated_password: generatedPassword };
}

export async function deleteUser(id: string) {
  const user = await requireRole("superadmin");
  const admin = createAdminClient();
  // Soft-delete the profile only; auth user kept so audit trail survives
  const { error } = await admin
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  await audit({
    actor_id: user.id,
    action: "member.removed",
    entity_type: "user",
    entity_id: id,
  });
  revalidatePath("/atourin/users");
  return { ok: true };
}
