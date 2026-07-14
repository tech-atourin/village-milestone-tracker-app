"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole, getCurrentUser } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";
import { sanitizeAuthUser } from "@/lib/auth/sanitize";

// =====================================================
// Single-user CRUD - superadmin + mitra_admin can create
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
  representing_desa_id: z.string().uuid().optional().nullable(),
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
    // Mitra_admin scope: only users inside their own organization,
    // and never target a superadmin. This applies to every target role
    // (peserta/narasumber/desa_wisata/mitra_admin) so cross-org account
    // takeover via reset/update/delete is not possible.
    if (roleToTouch === "superadmin")
      return { error: "Tidak diizinkan menyentuh akun superadmin" } as const;
    if (!user.organization_id)
      return { error: "Akun mitra Anda belum di-attach ke organisasi" } as const;
    if (orgIdToTouch !== user.organization_id)
      return { error: "User bukan bagian dari organisasi Anda" } as const;
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
    return { error: `Input tidak valid: ${issue.path.join(".") || "field"} - ${issue.message}` };
  }
  const body = parsed.data;
  // Force mitra_admin insert/update to always target their own organization.
  // Prevents crafting a request that lands a user in another org.
  const caller = await getCurrentUser();
  const effectiveOrgId =
    caller?.global_role === "mitra_admin"
      ? caller.organization_id
      : body.organization_id ?? null;
  const access = await ensureAccess(body.global_role, effectiveOrgId);
  if ("error" in access) return { error: access.error ?? "Tidak diizinkan" };

  const admin = createAdminClient();

  // Build profile row payload
  const profile: Record<string, unknown> = {
    full_name: body.full_name,
    email: body.email ?? null,
    email_artificial: !body.email,
    phone: body.phone ?? null,
    global_role: body.global_role,
    organization_id: effectiveOrgId,
  };
  // representing_desa_id used by:
  // - desa_wisata: the desa they represent on the platform
  // - peserta: their "home" desa, used for auto-assign to project_memberships
  //   when that desa joins a project
  if (body.global_role === "peserta" || body.global_role === "desa_wisata") {
    profile.representing_desa_id = body.representing_desa_id ?? null;
  }
  if (body.global_role === "narasumber") {
    profile.kategori_narasumber = body.kategori_narasumber ?? null;
    profile.kompetensi = body.kompetensi ?? null;
    profile.jabatan = body.jabatan ?? null;
    profile.instansi = body.instansi ?? null;
    profile.kota = body.kota ?? null;
  }

  if (body.id) {
    // ----- Update existing -----
    // For mitra_admin, verify target user is actually in caller's org
    // (effectiveOrgId gave the *intended* org; without this check a mitra
    // could pull a peserta out of another org into theirs.)
    if (caller?.global_role === "mitra_admin") {
      const { data: existing } = await admin
        .from("users")
        .select("organization_id, global_role")
        .eq("id", body.id)
        .maybeSingle();
      const cur = existing as {
        organization_id: string | null;
        global_role: string;
      } | null;
      if (!cur) return { error: "User tidak ditemukan" };
      if (cur.organization_id !== caller.organization_id)
        return { error: "User bukan bagian dari organisasi Anda" };
      if (cur.global_role === "superadmin")
        return { error: "Tidak diizinkan menyentuh akun superadmin" };
    }
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
    await sanitizeAuthUser(userId);
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

  // Auto-attach peserta to existing projects whose project_desa includes the
  // user's representing_desa_id. This way a peserta added later still lands
  // in every relevant project automatically.
  if (
    body.global_role === "peserta" &&
    body.representing_desa_id
  ) {
    try {
      const { data: pdRows } = await admin
        .from("project_desa")
        .select("project_id, desa_id")
        .eq("desa_id", body.representing_desa_id);
      for (const pd of ((pdRows ?? []) as Array<{
        project_id: string;
        desa_id: string;
      }>)) {
        await admin.from("project_memberships").upsert(
          {
            project_id: pd.project_id,
            user_id: userId,
            role: "peserta",
            desa_id: pd.desa_id,
            status: "active",
          },
          { onConflict: "project_id,user_id,role" },
        );
      }
    } catch (e) {
      console.warn("auto-attach peserta failed:", e);
    }
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

// =====================================================
// updateUserEmail - change a user's email (auth + vmt.users)
// =====================================================
const updateEmailSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

export async function updateUserEmail(
  input: z.input<typeof updateEmailSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = updateEmailSchema.safeParse(input);
  if (!parsed.success) return { error: "Email tidak valid" };
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, global_role, organization_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!target) return { error: "User tidak ditemukan" };
  const t = target as {
    id: string;
    global_role: string;
    organization_id: string | null;
  };
  const access = await ensureAccess(t.global_role, t.organization_id);
  if ("error" in access) return { error: access.error ?? "Tidak diizinkan" };

  // Check duplicate email
  const { data: dup } = await admin
    .from("users")
    .select("id")
    .eq("email", parsed.data.email)
    .neq("id", parsed.data.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (dup) return { error: "Email sudah dipakai user lain" };

  // Update auth user email — also confirm immediately so login works
  const { error: authErr } = await admin.auth.admin.updateUserById(
    parsed.data.id,
    { email: parsed.data.email, email_confirm: true },
  );
  if (authErr) return { error: authErr.message };

  // Sync to vmt.users
  const { error: profErr } = await admin
    .from("users")
    .update({ email: parsed.data.email, email_artificial: false })
    .eq("id", parsed.data.id);
  if (profErr) return { error: profErr.message };

  await audit({
    actor_id: access.user.id,
    action: "member.added",
    entity_type: "user.email_changed",
    entity_id: parsed.data.id,
    after: { email: parsed.data.email },
  });
  revalidatePath(`/atourin/users/${parsed.data.id}`);
  revalidatePath(`/mitra/users/${parsed.data.id}`);
  revalidatePath("/atourin/users");
  revalidatePath("/mitra/users");
  return { ok: true };
}

// =====================================================
// resetUserPassword - generate new password + return it
// =====================================================
export async function resetUserPassword(
  id: string,
): Promise<{ ok: true; password: string } | { error: string }> {
  if (!id) return { error: "User ID required" };
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, global_role, organization_id, email")
    .eq("id", id)
    .maybeSingle();
  if (!target) return { error: "User tidak ditemukan" };
  const t = target as {
    id: string;
    global_role: string;
    organization_id: string | null;
    email: string | null;
  };
  if (!t.email) return { error: "User belum punya email — tidak bisa reset password" };
  const access = await ensureAccess(t.global_role, t.organization_id);
  if ("error" in access) return { error: access.error ?? "Tidak diizinkan" };

  const password = cryptoRandomPassword();
  const { error: authErr } = await admin.auth.admin.updateUserById(id, {
    password,
  });
  if (authErr) return { error: authErr.message };

  await audit({
    actor_id: access.user.id,
    action: "member.added",
    entity_type: "user.password_reset",
    entity_id: id,
  });
  return { ok: true, password };
}

// =====================================================
// sendCredentialsEmail - email login credentials to a user
// (used by bulk import after-table per-row "Kirim email" button)
// =====================================================
const sendCredsSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(1).max(128),
});

export async function sendCredentialsEmail(
  input: z.input<typeof sendCredsSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = sendCredsSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, full_name, email, global_role, organization_id")
    .eq("id", parsed.data.user_id)
    .maybeSingle();
  if (!target) return { error: "User tidak ditemukan" };
  const t = target as {
    id: string;
    full_name: string;
    email: string | null;
    global_role: string;
    organization_id: string | null;
  };
  if (!t.email) return { error: "User belum punya email" };
  const access = await ensureAccess(t.global_role, t.organization_id);
  if ("error" in access) return { error: access.error ?? "Tidak diizinkan" };

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
  const fromName = process.env.SMTP_FROM_NAME ?? "Atourin Milestone Tracker";
  const appName =
    process.env.NEXT_PUBLIC_APP_NAME ?? "Atourin Milestone Tracker";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!smtpUser || !smtpPass || !fromEmail)
    return { error: "SMTP belum dikonfigurasi" };

  const nodemailer = await import("nodemailer");
  const { invitationHtml } = await import("@/lib/email/invitation-template");
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: { user: smtpUser, pass: smtpPass },
  });
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: t.email,
      subject: `Akun login Anda di ${appName}`,
      html: invitationHtml(
        t.full_name,
        t.email,
        parsed.data.password,
        appName,
        appUrl,
      ),
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  await audit({
    actor_id: access.user.id,
    action: "member.added",
    entity_type: "user.credentials_emailed",
    entity_id: t.id,
  });
  return { ok: true };
}

// =====================================================
// Bulk operations - hapus & kirim ulang email kredensial
// =====================================================
export async function bulkDeleteUsers(
  ids: string[],
): Promise<{ ok: number; failed: Array<{ id: string; error: string }> }> {
  const failed: Array<{ id: string; error: string }> = [];
  let ok = 0;
  for (const id of ids) {
    const r = await deleteUser(id);
    if ("error" in r) failed.push({ id, error: r.error });
    else ok++;
  }
  return { ok, failed };
}

export async function bulkResendCredentials(
  ids: string[],
): Promise<{ ok: number; failed: Array<{ id: string; error: string }> }> {
  const failed: Array<{ id: string; error: string }> = [];
  let ok = 0;
  for (const id of ids) {
    const r = await resetUserPassword(id);
    if ("error" in r) {
      failed.push({ id, error: r.error });
      continue;
    }
    const s = await sendCredentialsEmail({ user_id: id, password: r.password });
    if ("error" in s) failed.push({ id, error: s.error });
    else ok++;
  }
  return { ok, failed };
}

export async function deleteUser(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  if (!id) return { error: "User ID required" };
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, global_role, organization_id")
    .eq("id", id)
    .maybeSingle();
  if (!target) return { error: "User tidak ditemukan" };
  const t = target as {
    id: string;
    global_role: string;
    organization_id: string | null;
  };
  const access = await ensureAccess(t.global_role, t.organization_id);
  if ("error" in access) return { error: access.error ?? "Tidak diizinkan" };
  // Soft-delete the profile only; auth user kept so audit trail survives
  const { error } = await admin
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  await audit({
    actor_id: access.user.id,
    action: "member.removed",
    entity_type: "user",
    entity_id: id,
  });
  revalidatePath("/atourin/users");
  revalidatePath("/mitra/users");
  return { ok: true };
}
