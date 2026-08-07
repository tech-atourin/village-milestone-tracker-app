import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export type QuizRegistrationRow = {
  id: string;
  quiz_id: string;
  quiz_title: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  desa_name: string | null;
  desa_other: string | null;
  jabatan: string | null;
  instansi: string | null;
  kota: string | null;
  status: "pending" | "converted";
  created_at: string;
};

// Admin/staff: semua pendaftaran pra-pretest sebuah project.
export async function listProjectRegistrations(
  projectId: string,
): Promise<QuizRegistrationRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("quiz_registrations")
    .select(
      "id, quiz_id, full_name, email, phone, gender, desa_other, jabatan, instansi, kota, status, created_at, quiz:quizzes(title), desa:desa(name)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    quiz_id: r.quiz_id,
    quiz_title: r.quiz?.title ?? null,
    full_name: r.full_name,
    email: r.email,
    phone: r.phone ?? null,
    gender: r.gender ?? null,
    desa_name: r.desa?.name ?? null,
    desa_other: r.desa_other ?? null,
    jabatan: r.jabatan ?? null,
    instansi: r.instansi ?? null,
    kota: r.kota ?? null,
    status: r.status,
    created_at: r.created_at,
  }));
}

// Publik: identitas untuk prefill halaman pengerjaan setelah mendaftar.
// Hanya mengembalikan nama + email (dipakai untuk mengunci identitas attempt).
export async function getRegistrationIdentity(
  registrationId: string,
  slug: string,
): Promise<{ name: string; email: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("quiz_registrations")
    .select("full_name, email, quiz:quizzes(public_slug)")
    .eq("id", registrationId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  if (!r || r.quiz?.public_slug !== slug) return null;
  return { name: r.full_name as string, email: r.email as string };
}
