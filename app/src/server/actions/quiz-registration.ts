"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import { sanitizeAuthUser } from "@/lib/auth/sanitize";
import { reconcileAttemptsForUser } from "@/lib/quiz/reconcile";

type Ok<T = object> = { ok: true } & T;
type Err = { error: string };

function randomPassword(): string {
  return randomBytes(12)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 14);
}

// =====================================================
// Public: peserta mengisi data diri sebelum pre-test.
// project_id TIDAK dipercaya dari client, diturunkan dari kuis.
// =====================================================
const submitSchema = z.object({
  slug: z.string().min(4).max(120),
  full_name: z.string().min(2).max(120),
  email: z.string().email("Email tidak valid").max(200),
  phone: z.string().min(6, "No HP tidak valid").max(30),
  nik: z.string().max(32).optional().nullable(),
  gender: z.enum(["L", "P"]).optional().nullable(),
  birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
  desa_id: z.string().uuid().optional().nullable(),
  desa_other: z.string().max(200).optional().nullable(),
  jabatan: z.string().max(120).optional().nullable(),
  instansi: z.string().max(200).optional().nullable(),
  kota: z.string().max(80).optional().nullable(),
});

export async function submitQuizRegistration(
  input: z.input<typeof submitSchema>,
): Promise<Ok<{ registration_id: string }> | Err> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const b = parsed.data;
  const admin = createAdminClient();

  // Kuis harus published DAN meminta pendaftaran.
  const { data: quiz } = await admin
    .from("quizzes")
    .select("id, project_id, is_published, collect_registration")
    .eq("public_slug", b.slug)
    .maybeSingle();
  const q = quiz as {
    id: string;
    project_id: string;
    is_published: boolean;
    collect_registration: boolean;
  } | null;
  if (!q || !q.is_published || !q.collect_registration)
    return { error: "Pendaftaran tidak tersedia untuk kuis ini." };

  const { data: row, error } = await admin
    .from("quiz_registrations")
    .insert({
      quiz_id: q.id,
      project_id: q.project_id,
      full_name: b.full_name.trim(),
      email: b.email.trim().toLowerCase(),
      phone: b.phone.trim(),
      nik: b.nik?.trim() || null,
      gender: b.gender ?? null,
      birthdate: b.birthdate || null,
      desa_id: b.desa_id ?? null,
      desa_other: b.desa_id ? null : b.desa_other?.trim() || null,
      jabatan: b.jabatan?.trim() || null,
      instansi: b.instansi?.trim() || null,
      kota: b.kota?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !row) return { error: error?.message ?? "Gagal menyimpan data" };
  return { ok: true, registration_id: (row as { id: string }).id };
}

// =====================================================
// Staff: buat akun peserta dari satu/beberapa pendaftaran.
// =====================================================
async function assertProjectAccess(
  projectId: string,
): Promise<{ actor: { id: string } } | Err> {
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  if (actor.global_role !== "superadmin" && actor.global_role !== "mitra_admin")
    return { error: "Tidak diizinkan" };
  const admin = createAdminClient();
  const { data: proj } = await admin
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!proj) return { error: "Project tidak ditemukan" };
  if (actor.global_role === "mitra_admin") {
    const orgId = (proj as { organization_id: string | null }).organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda" };
  }
  return { actor: { id: actor.id } };
}

export async function createAccountFromRegistration(
  registrationId: string,
): Promise<Ok<{ password?: string; already?: boolean }> | Err> {
  const admin = createAdminClient();
  const { data: regRow } = await admin
    .from("quiz_registrations")
    .select(
      "id, project_id, full_name, email, phone, gender, desa_id, jabatan, instansi, kota, status, created_user_id",
    )
    .eq("id", registrationId)
    .maybeSingle();
  const reg = regRow as {
    id: string;
    project_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    gender: string | null;
    desa_id: string | null;
    jabatan: string | null;
    instansi: string | null;
    kota: string | null;
    status: string;
    created_user_id: string | null;
  } | null;
  if (!reg) return { error: "Pendaftaran tidak ditemukan" };

  const access = await assertProjectAccess(reg.project_id);
  if ("error" in access) return access;

  if (reg.status === "converted" && reg.created_user_id)
    return { ok: true, already: true };

  // Kalau email sudah punya akun, pakai akun itu (jangan buat duplikat).
  const emailNorm = reg.email.trim().toLowerCase();
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("email", emailNorm)
    .is("deleted_at", null)
    .maybeSingle();

  let userId: string;
  let password: string | undefined;

  if (existing) {
    userId = (existing as { id: string }).id;
  } else {
    const pwd = randomPassword();
    const { data: authRes, error: authErr } = await admin.auth.admin.createUser({
      email: emailNorm,
      email_confirm: true,
      password: pwd,
      user_metadata: { full_name: reg.full_name },
    });
    if (authErr || !authRes.user)
      return { error: authErr?.message ?? "Gagal membuat akun auth" };
    userId = authRes.user.id;
    await sanitizeAuthUser(userId);
    password = pwd;
    const { error: insErr } = await admin.from("users").insert({
      id: userId,
      full_name: reg.full_name,
      email: emailNorm,
      email_artificial: false,
      phone: reg.phone,
      gender: reg.gender,
      global_role: "peserta",
      representing_desa_id: reg.desa_id,
      jabatan: reg.jabatan,
      instansi: reg.instansi,
      kota: reg.kota,
    });
    if (insErr) {
      await admin.auth.admin.deleteUser(userId);
      return { error: insErr.message };
    }
  }

  // Daftarkan ke project (idempotent). Unique constraint-nya mencakup
  // (project_id, user_id, role, desa_id), jadi cek dulu supaya tidak dobel
  // dan tidak gagal diam-diam kalau sudah terdaftar.
  const { data: existingMember } = await admin
    .from("project_memberships")
    .select("id")
    .eq("project_id", reg.project_id)
    .eq("user_id", userId)
    .eq("role", "peserta")
    .maybeSingle();
  if (!existingMember) {
    const { error: memErr } = await admin.from("project_memberships").insert({
      project_id: reg.project_id,
      user_id: userId,
      role: "peserta",
      desa_id: reg.desa_id,
      status: "active",
    });
    if (memErr) return { error: `Gagal daftarkan ke project: ${memErr.message}` };
  }

  // Sambungkan attempt pre-test (yang diisi lewat email ini sebelum punya
  // akun) ke akun baru supaya nilainya masuk ke rapor peserta.
  await reconcileAttemptsForUser(userId, emailNorm);

  await admin
    .from("quiz_registrations")
    .update({
      status: "converted",
      created_user_id: userId,
      converted_at: new Date().toISOString(),
    })
    .eq("id", reg.id);

  revalidatePath(`/atourin/projects/${reg.project_id}`);
  revalidatePath(`/mitra/projects/${reg.project_id}`);
  return { ok: true, password };
}

// Buat akun untuk beberapa pendaftaran sekaligus. Mengembalikan kredensial
// baru per registration_id (hanya untuk akun yang benar-benar baru dibuat).
export async function createAccountsFromRegistrations(
  registrationIds: string[],
): Promise<
  Ok<{
    created: number;
    reused: number;
    failed: number;
    credentials: Array<{ registration_id: string; email: string; password: string }>;
    errors: Array<{ registration_id: string; error: string }>;
  }>
> {
  const credentials: Array<{
    registration_id: string;
    email: string;
    password: string;
  }> = [];
  const errors: Array<{ registration_id: string; error: string }> = [];
  let created = 0;
  let reused = 0;

  // Serial: pembuatan auth user + reconcile per orang, hindari balapan.
  for (const id of registrationIds) {
    const r = await createAccountFromRegistration(id);
    if ("error" in r) {
      errors.push({ registration_id: id, error: r.error });
      continue;
    }
    if (r.already) {
      reused += 1;
      continue;
    }
    if (r.password) {
      created += 1;
      const admin = createAdminClient();
      const { data } = await admin
        .from("quiz_registrations")
        .select("email")
        .eq("id", id)
        .maybeSingle();
      credentials.push({
        registration_id: id,
        email: (data as { email: string } | null)?.email ?? "",
        password: r.password,
      });
    } else {
      // akun sudah ada sebelumnya (email terpakai), dipakai ulang.
      reused += 1;
    }
  }

  return {
    ok: true,
    created,
    reused,
    failed: errors.length,
    credentials,
    errors,
  };
}
