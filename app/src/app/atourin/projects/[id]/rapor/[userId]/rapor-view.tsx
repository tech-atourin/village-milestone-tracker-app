import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/ui/print-button";

export async function loadRapor(projectId: string, userId: string) {
  // Admin client so mitra (and any reviewer) can render a peserta's rapor even
  // though RLS would otherwise hide other users' rows. Callers must verify
  // ownership / role before invoking.
  const supabase = createAdminClient();

  const [{ data: project }, { data: user }, { data: rapor }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, name, period_start, period_end, organization_id, organization:organizations(name, logo_url, brand_color_primary)",
        )
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("users")
        .select("id, full_name, email, phone")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("rapor_peserta")
        .select(
          "pre_test_score, post_test_score, improvement_percent, survey_kepuasan, attendance, generated_at",
        )
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const { data: membership } = await supabase
    .from("project_memberships")
    .select("attendance_mode, desa:desa(name, kabupaten, provinsi)")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "peserta")
    .maybeSingle();

  // Per-peserta narasumber engagement: sessions where the peserta's desa was
  // mentored + ratings the peserta gave. Used in the "Sesi & Narasumber"
  // section below the score grid.
  const { data: pesertaDesa } = await supabase
    .from("project_memberships")
    .select("desa_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "peserta")
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const desaId = ((pesertaDesa ?? null) as any)?.desa_id ?? null;

  let attendedNarasumber: Array<{ id: string; name: string; sessions: number }> =
    [];
  if (desaId) {
    const { data: sessRows } = await supabase
      .from("pendampingan_sessions")
      .select(
        "narasumber_id, narasumber:users!pendampingan_sessions_narasumber_id_fkey(full_name), project_desa:project_desa(desa_id)",
      )
      .eq("project_id", projectId);
    const map = new Map<string, { name: string; sessions: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of ((sessRows ?? []) as any[])) {
      if (s.project_desa?.desa_id !== desaId || !s.narasumber_id) continue;
      const cur = map.get(s.narasumber_id) ?? {
        name: s.narasumber?.full_name ?? "Narasumber",
        sessions: 0,
      };
      cur.sessions += 1;
      map.set(s.narasumber_id, cur);
    }
    attendedNarasumber = Array.from(map.entries()).map(([id, v]) => ({
      id,
      ...v,
    }));
  }

  const { data: ratingsGiven } = await supabase
    .from("narasumber_ratings")
    .select("narasumber_id, rating")
    .eq("project_id", projectId)
    .eq("rater_id", userId);
  const ratingByNs = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of ((ratingsGiven ?? []) as any[])) {
    ratingByNs.set(r.narasumber_id, r.rating);
  }
  const narasumber = attendedNarasumber.map((n) => ({
    ...n,
    rating: ratingByNs.get(n.id) ?? null,
  }));

  // Per-materi pre/post breakdown for this peserta (peserta_test_results
  // scoped by user_id + project_topik_id). Shown inside the single rapor.
  const { data: tr } = await supabase
    .from("peserta_test_results")
    .select(
      "score, project_topik:project_topik(id, name, sort_order), gform:project_gforms!inner(form_type, project_id)",
    )
    .eq("user_id", userId)
    .eq("gform.project_id", projectId)
    .not("project_topik_id", "is", null);
  type MatRow = { name: string; sort_order: number; pre: number | null; post: number | null };
  const materiMap = new Map<string, MatRow>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (tr ?? []) as any[]) {
    const id = r.project_topik?.id;
    if (!id) continue;
    const cur =
      materiMap.get(id) ??
      ({
        name: r.project_topik?.name ?? "-",
        sort_order: r.project_topik?.sort_order ?? 0,
        pre: null,
        post: null,
      } as MatRow);
    const score = Number(r.score);
    if (r.gform?.form_type === "pre_test") cur.pre = score;
    else if (r.gform?.form_type === "post_test") cur.post = score;
    materiMap.set(id, cur);
  }
  const materi_scores = Array.from(materiMap.values()).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return { project, user, rapor, membership, narasumber, materi_scores };
}

function fmtDateIdn(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function avg(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => typeof n === "number");
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export function RaporView({
  data,
  scope = "atourin",
}: {
  scope?: "atourin" | "mitra" | "narasumber";
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    project: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rapor: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    membership: any;
    narasumber: Array<{
      id: string;
      name: string;
      sessions: number;
      rating: number | null;
    }>;
    materi_scores: Array<{
      name: string;
      pre: number | null;
      post: number | null;
    }>;
  };
}) {
  const { project, user, rapor, membership, narasumber, materi_scores } = data;
  const attendanceMode: "offline" | "online" =
    membership?.attendance_mode === "online" ? "online" : "offline";
  const isOnline = attendanceMode === "online";

  // Fall back to per-materi averages when the aggregate is not stored.
  const pre =
    rapor?.pre_test_score ?? avg(materi_scores.map((m) => m.pre));
  const post =
    rapor?.post_test_score ?? avg(materi_scores.map((m) => m.post));
  const delta =
    pre !== null && post !== null
      ? Math.round(((post - pre) / Math.max(pre, 1)) * 100)
      : null;

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4; margin: 18mm; }
              .no-print { display: none !important; }
            }
          `,
        }}
      />

      {isOnline && (
        <section className="mb-4 flex items-start gap-2.5 rounded-lg border border-atr-yellow/40 bg-atr-yellow/15 p-3 text-xs text-atr-fg">
          <span className="text-base leading-none">🟡</span>
          <div>
            <div className="font-bold">Peserta Online</div>
            <div className="mt-0.5 text-atr-fg-muted">
              Peserta mengikuti pelatihan via online. Hasil rapor mencakup
              pre-test, materi, dan post-test saja. Implementasi rencana aksi
              dan sesi pendampingan lapangan tidak diikuti, sehingga bagian
              tersebut ditampilkan dengan keterangan N/A.
            </div>
          </div>
        </section>
      )}

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
        <a
          href={`/${scope}/projects/${project.id}/rapor`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
        >
          ← Kembali
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          <a
            href={`/${scope}/projects/${project.id}/rapor/${user.id}/sertifikat`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600"
          >
            🏆 Buka Sertifikat
          </a>
        </div>
      </div>

      {/* Header */}
      <header className="mb-8 flex items-start justify-between border-b border-atr-outline pb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-purple">
            Rapor Peserta Pendampingan
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-atr-fg">{user.full_name}</h1>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isOnline
                  ? "border-atr-yellow/40 bg-atr-yellow/20 text-atr-fg"
                  : "border-atr-arti/30 bg-atr-arti/15 text-atr-arti"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <p className="mt-1 text-sm text-atr-fg-muted">
            {membership?.desa?.name ??
              (isOnline ? "Peserta personal (online)" : "Peserta personal")}
            {membership?.desa?.kabupaten || membership?.desa?.provinsi ? (
              <>
                {" · "}
                {[membership?.desa?.kabupaten, membership?.desa?.provinsi]
                  .filter(Boolean)
                  .join(", ")}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {project.organization?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.organization.logo_url}
              alt={project.organization.name}
              className="h-14 w-auto"
            />
          ) : (
            <div className="text-right text-xs text-atr-fg-muted">
              <div className="font-bold text-atr-fg">
                {project.organization?.name ?? "-"}
              </div>
              <div>powered by Atourin</div>
            </div>
          )}
        </div>
      </header>

      {/* Project meta */}
      <section className="mb-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Project
          </div>
          <div className="mt-1 font-bold text-atr-fg">{project.name}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Periode
          </div>
          <div className="mt-1 font-bold text-atr-fg">
            {fmtDateIdn(project.period_start)} – {fmtDateIdn(project.period_end)}
          </div>
        </div>
      </section>

      {/* Scores */}
      <section className="mb-8 rounded-2xl border border-atr-outline p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Hasil Capacity Building
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <ScoreCard label="Pre-test" value={pre} max={100} />
          <ScoreCard label="Post-test" value={post} max={100} />
          <div className="rounded-xl border border-atr-purple/30 bg-atr-purple-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Improvement
            </div>
            <div
              className={`mt-2 text-3xl font-bold ${
                delta == null
                  ? "text-atr-fg"
                  : delta > 0
                    ? "text-atr-arti"
                    : delta < 0
                      ? "text-atr-red"
                      : "text-atr-fg"
              }`}
            >
              {delta !== null ? `${delta > 0 ? "+" : ""}${delta}%` : "-"}
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-atr-fg-muted">
          Kehadiran: {rapor?.attendance != null ? `${rapor.attendance}%` : "-"}
        </div>
      </section>

      {/* Nilai per materi - data-driven dari peserta_test_results */}
      <section className="mb-8 rounded-2xl border border-atr-outline p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Hasil Capacity Building per Materi
        </h2>
        {materi_scores.length === 0 ? (
          <p className="text-sm italic text-atr-fg-muted">
            Belum ada hasil pre/post test per materi untuk peserta ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atr-outline text-xs text-atr-fg-muted">
                <th className="py-2 text-left">Materi</th>
                <th className="py-2 text-right">Pre-test</th>
                <th className="py-2 text-right">Post-test</th>
                <th className="py-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {materi_scores.map((m) => {
                const delta =
                  m.pre != null && m.post != null ? m.post - m.pre : null;
                return (
                  <tr key={m.name} className="border-b border-atr-outline/50">
                    <td className="py-2 font-bold text-atr-fg">{m.name}</td>
                    <td className="py-2 text-right text-atr-fg">
                      {m.pre ?? "-"}
                    </td>
                    <td className="py-2 text-right text-atr-fg">
                      {m.post ?? "-"}
                    </td>
                    <td className="py-2 text-right">
                      {delta != null ? (
                        <span
                          className={`font-bold ${delta >= 0 ? "text-atr-arti" : "text-atr-red"}`}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </section>

      {/* Sesi Pendampingan section: untuk peserta Online cukup tampilkan
          banner N/A, karena mereka tidak ikut sesi lapangan. */}
      {isOnline && (
        <section className="mb-8 rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/50 p-6 text-sm text-atr-fg-muted">
          <div className="font-bold text-atr-fg">
            Sesi Pendampingan &amp; Narasumber
          </div>
          <p className="mt-1">
            N/A — peserta mengikuti pelatihan via online dan tidak hadir di
            sesi pendampingan lapangan.
          </p>
        </section>
      )}
      {/* Sesi & Narasumber yang mendampingi peserta ini (offline only) */}
      {!isOnline && narasumber.length > 0 && (
        <section className="mb-8 rounded-2xl border border-atr-outline p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            Sesi Pendampingan &amp; Narasumber
          </h2>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atr-outline text-xs text-atr-fg-muted">
                <th className="py-2 text-left">Narasumber</th>
                <th className="py-2 text-right">Sesi</th>
                <th className="py-2 text-right">Penilaian Anda</th>
              </tr>
            </thead>
            <tbody>
              {narasumber.map((n) => (
                <tr key={n.id} className="border-b border-atr-outline/50">
                  <td className="py-2 font-bold text-atr-fg">{n.name}</td>
                  <td className="py-2 text-right text-atr-fg-muted">
                    {n.sessions}
                  </td>
                  <td className="py-2 text-right font-bold text-atr-fg">
                    {n.rating != null ? `★ ${n.rating}` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}

      {/* Sertifikat note */}
      {delta !== null && delta >= 20 && (
        <section className="mb-8 rounded-2xl border-2 border-atr-yellow bg-atr-yellow/10 p-6">
          <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
            Pencapaian
          </div>
          <div className="mt-1 text-lg font-bold text-atr-fg">
            🏆 Peningkatan signifikan &mdash; berhak atas sertifikat kelulusan
          </div>
        </section>
      )}

      {/* Footer signatures */}
      <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-atr-outline pt-8 text-xs">
        <div className="text-center">
          <div className="text-atr-fg-muted">Mengetahui,</div>
          <div className="mt-16 border-t border-atr-fg pt-1 font-bold text-atr-fg">
            {project.organization?.name ?? "Mitra"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-atr-fg-muted">Atourin Mentor</div>
          <div className="mt-16 border-t border-atr-fg pt-1 font-bold text-atr-fg">
            Tim Atourin
          </div>
        </div>
      </footer>

      <div className="mt-8 flex items-center justify-between text-[10px] text-atr-fg-muted">
        <span>
          Rapor Peserta -{" "}
          {new Date(rapor?.generated_at ?? Date.now()).toLocaleDateString(
            "id-ID",
            { day: "numeric", month: "long", year: "numeric" },
          )}
        </span>
        <div className="flex items-center gap-2">
          <Image src="/logo/vmt/vmt-mark.svg" alt="VMT" width={20} height={20} />
          <span className="font-bold">Village Milestone Tracker</span>
        </div>
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  value,
  max,
}: {
  label: string;
  value: number | null;
  max: number;
}) {
  return (
    <div className="rounded-xl border border-atr-outline p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-atr-fg">{value ?? "-"}</div>
      <div className="text-xs text-atr-fg-muted">/ {max}</div>
    </div>
  );
}
