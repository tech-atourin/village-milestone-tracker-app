export const metadata = { title: "Profil" };

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Folder,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";
import { getCurrentUser, scopeHomePath } from "@/lib/auth/rbac";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ChangePasswordCard } from "./change-password";
import { CountBadge } from "@/components/ui/count-badge";

async function fetchProjectsAndRapor(userId: string) {
  const supabase = createClient();

  // All project memberships
  const { data: memberships } = await supabase
    .from("project_memberships")
    .select(
      `role, status, invited_at,
       project:projects(id, name, status, period_start, period_end,
         organization:organizations(name)),
       desa:desa(name)`,
    )
    .eq("user_id", userId)
    .order("invited_at", { ascending: false });

  // Rapor history per project.
  // rapor_peserta hanya punya policy RLS untuk desa_wisata, jadi peserta tidak
  // bisa membaca rapornya sendiri lewat client biasa. Dibaca lewat admin
  // client, dikunci ke userId, dan kolomnya dibatasi: tugas_score/
  // keaktifan_score sengaja TIDAK diambil supaya rincian penilaian tidak
  // pernah sampai ke peserta.
  const { data: rapors } = await createAdminClient()
    .from("rapor_peserta")
    .select(
      "project_id, pre_test_score, post_test_score, improvement_percent, attendance, generated_at",
    )
    .eq("user_id", userId);

  const raporByProject = new Map<
    string,
    {
      pre: number | null;
      post: number | null;
      improvement: number | null;
      attendance: number | null;
    }
  >();
  for (const r of (rapors ?? []) as Array<{
    project_id: string;
    pre_test_score: number | null;
    post_test_score: number | null;
    improvement_percent: number | null;
    attendance: number | null;
  }>) {
    raporByProject.set(r.project_id, {
      pre: r.pre_test_score,
      post: r.post_test_score,
      improvement: r.improvement_percent,
      attendance: r.attendance,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((memberships ?? []) as any[]).map((m) => ({
    role: m.role as string,
    status: m.status as string,
    invited_at: m.invited_at as string,
    project: m.project,
    desa: m.desa,
    rapor: m.project?.id ? raporByProject.get(m.project.id) ?? null : null,
  }));
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const history = await fetchProjectsAndRapor(user.id);
  const backHref = scopeHomePath(user.global_role);

  return (
    <main className="min-h-screen bg-atr-bg-soft p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>

        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-atr-purple-50 text-atr-purple">
              <User className="h-8 w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-atr-fg">
                {user.full_name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-atr-fg-muted">
                {user.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </span>
                )}
              </div>
              <div className="mt-2 inline-flex rounded-full bg-atr-purple-50 px-2.5 py-0.5 text-xs font-bold text-atr-purple-600">
                {user.global_role}
              </div>
            </div>
          </div>
        </section>

        <ChangePasswordCard />

        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-atr-fg">
            <Folder className="h-4 w-4 text-atr-purple" />
            Riwayat project
            <CountBadge n={history.length} />
          </h2>

          {history.length === 0 ? (
            <p className="text-sm italic text-atr-fg-muted">
              Belum ada project.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((h, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-atr-outline p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-atr-fg">
                        {h.project?.name ?? "-"}
                      </div>
                      <div className="text-xs text-atr-fg-muted">
                        {h.project?.organization?.name ?? "-"} ·{" "}
                        <span className="capitalize">{h.role}</span>
                        {h.desa?.name && ` · ${h.desa.name}`}
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        h.project?.status === "active"
                          ? "bg-atr-arti/15 text-atr-arti"
                          : h.project?.status === "completed"
                            ? "bg-atr-purple-50 text-atr-purple-600"
                            : "bg-atr-bg-soft text-atr-fg-muted"
                      }`}
                    >
                      {h.project?.status ?? "-"}
                    </span>
                  </div>
                  {h.rapor && (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-atr-bg-soft p-3 text-center text-xs">
                      <div>
                        <div className="text-atr-fg-muted">Pre</div>
                        <div className="font-bold text-atr-fg">
                          {h.rapor.pre ?? "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-atr-fg-muted">Post</div>
                        <div className="font-bold text-atr-fg">
                          {h.rapor.post ?? "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-atr-fg-muted">Δ</div>
                        <div
                          className={`font-bold ${
                            (h.rapor.improvement ?? 0) > 0
                              ? "text-atr-arti"
                              : (h.rapor.improvement ?? 0) < 0
                                ? "text-atr-red"
                                : "text-atr-fg-muted"
                          }`}
                        >
                          {h.rapor.improvement != null
                            ? `${h.rapor.improvement > 0 ? "+" : ""}${h.rapor.improvement}%`
                            : "-"}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {user.global_role === "peserta" && history.some((h) => h.rapor) && (
          <p className="rounded-lg border border-atr-purple/20 bg-atr-purple-50/50 p-3 text-xs text-atr-fg-muted">
            <GraduationCap className="mr-1 inline h-3 w-3 text-atr-purple" />
            RAPOR Anda akan auto-generate dari pre/post test + attendance yang
            di-input Atourin. Pre-test ≥ 50 di bawah Post-test ≥ 70 berhak atas
            sertifikat kelulusan.
          </p>
        )}
      </div>
    </main>
  );
}
