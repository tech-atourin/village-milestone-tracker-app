"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";

// =====================================================
// Narasumber CRUD — for superadmin + mitra_admin
// Narasumber records are stored in the `users` table with
// global_role='narasumber' plus extended profile columns.
// =====================================================

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  full_name: z.string().min(2).max(120),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(6).max(30).optional().nullable(),
  jabatan: z.string().max(120).optional().nullable(),
  instansi: z.string().max(200).optional().nullable(),
  kota: z.string().max(80).optional().nullable(),
  gender: z.enum(["L", "P"]).optional().nullable(),
  kategori_narasumber: z.string().max(40).optional().nullable(),
  kompetensi: z.string().max(500).optional().nullable(),
});

function cryptoRandomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 14);
}

async function ensureAccess() {
  const user = await getCurrentUser();
  if (!user)
    return { error: "Tidak terautentikasi" } as const;
  if (user.global_role !== "superadmin" && user.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" } as const;
  return { user } as const;
}

export async function upsertNarasumber(
  input: z.input<typeof upsertSchema>,
): Promise<
  | { ok: true; id: string; generated_password?: string }
  | { error: string }
> {
  const access = await ensureAccess();
  if ("error" in access) return { error: access.error ?? "Tidak diizinkan" };
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) return { error: "Data tidak valid: " + parsed.error.issues[0].message };
  const body = parsed.data;
  const admin = createAdminClient();

  const payload: Record<string, unknown> = {
    full_name: body.full_name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    jabatan: body.jabatan ?? null,
    instansi: body.instansi ?? null,
    kota: body.kota ?? null,
    gender: body.gender ?? null,
    kategori_narasumber: body.kategori_narasumber ?? null,
    kompetensi: body.kompetensi ?? null,
    global_role: "narasumber",
    email_artificial: !body.email,
  };

  if (body.id) {
    const { error } = await admin
      .from("users")
      .update(payload)
      .eq("id", body.id);
    if (error) return { error: error.message };
    await audit({
      actor_id: access.user.id,
      action: "member.added",
      entity_type: "narasumber",
      entity_id: body.id,
      after: { full_name: body.full_name },
    });
    revalidatePath("/atourin/narasumber");
    revalidatePath("/mitra/narasumber");
    return { ok: true, id: body.id };
  }

  // Insert: ensure unique-ish email if provided
  if (body.email) {
    const { data: dup } = await admin
      .from("users")
      .select("id")
      .eq("email", body.email)
      .is("deleted_at", null)
      .maybeSingle();
    if (dup) return { error: "Email sudah dipakai user lain" };
  }

  // If email provided, create auth user too so narasumber can login.
  let newId: string | null = null;
  let generatedPassword: string | undefined;
  if (body.email) {
    const password = cryptoRandomPassword();
    const { data: authResult, error: authError } =
      await admin.auth.admin.createUser({
        email: body.email,
        email_confirm: true,
        password,
        user_metadata: { full_name: body.full_name },
      });
    if (authError || !authResult.user)
      return { error: authError?.message ?? "Gagal buat akun login" };
    newId = authResult.user.id;
    generatedPassword = password;
    const { error: insErr } = await admin
      .from("users")
      .insert({ id: newId, ...payload });
    if (insErr) {
      await admin.auth.admin.deleteUser(newId);
      return { error: insErr.message };
    }
  } else {
    const { data, error } = await admin
      .from("users")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: error.message };
    newId = (data as { id: string }).id;
  }

  await audit({
    actor_id: access.user.id,
    action: "member.added",
    entity_type: "narasumber",
    entity_id: newId,
    after: { full_name: body.full_name },
  });
  revalidatePath("/atourin/narasumber");
  revalidatePath("/mitra/narasumber");
  return { ok: true, id: newId, generated_password: generatedPassword };
}

export async function deleteNarasumber(id: string) {
  const access = await ensureAccess();
  if ("error" in access) return access;
  const admin = createAdminClient();
  // Soft-delete via deleted_at column
  const { error } = await admin
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("global_role", "narasumber");
  if (error) return { error: error.message };
  await audit({
    actor_id: access.user.id,
    action: "member.removed",
    entity_type: "narasumber",
    entity_id: id,
  });
  revalidatePath("/atourin/narasumber");
  revalidatePath("/mitra/narasumber");
  return { ok: true };
}

/**
 * Return distinct existing kategori + kompetensi values across all
 * narasumber records so admin UIs can offer them as suggestions.
 */
export async function listNarasumberTaxonomies(): Promise<{
  kategori: string[];
  kompetensi: string[];
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("kategori_narasumber, kompetensi")
    .eq("global_role", "narasumber")
    .is("deleted_at", null);
  const kat = new Set<string>();
  const komp = new Set<string>();
  for (const r of ((data ?? []) as Array<{
    kategori_narasumber: string | null;
    kompetensi: string | null;
  }>)) {
    if (r.kategori_narasumber) kat.add(r.kategori_narasumber);
    if (r.kompetensi) komp.add(r.kompetensi);
  }
  // Seed with standard categories if empty
  if (kat.size === 0) {
    ["praktisi", "akademisi", "profesional", "pns", "lainnya"].forEach((k) =>
      kat.add(k),
    );
  }
  return {
    kategori: Array.from(kat).sort(),
    kompetensi: Array.from(komp).sort(),
  };
}
