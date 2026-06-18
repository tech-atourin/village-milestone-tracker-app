export const metadata = { title: "Detail Project" };

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  ListChecks,
  Star,
  Target,
} from "lucide-react";
import { notFound } from "next/navigation";
import { listPesertaTopik } from "@/server/queries/peserta";
import { createClient } from "@/lib/supabase/server";
import { listNarasumberToRate } from "@/server/actions/narasumber-rating";
import { NarasumberRatingSection } from "./narasumber-rating-section";

const STATUS_STYLE: Record<
  "not_started" | "in_progress" | "completed" | "needs_revision",
  string
> = {
  not_started: "bg-atr-bg-soft text-atr-fg-muted",
  in_progress: "bg-atr-yellow/25 text-atr-fg",
  completed: "bg-atr-arti/15 text-atr-arti",
  needs_revision: "bg-atr-red/15 text-atr-red",
};

const STATUS_LABEL: Record<
  "not_started" | "in_progress" | "completed" | "needs_revision",
  string
> = {
  not_started: "Belum mulai",
  in_progress: "Berjalan",
  completed: "Selesai",
  needs_revision: "Perlu revisi",
};

async function fetchHeader(projectDesaId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_desa")
    .select(
      `id, project:projects(id, name), desa:desa(id, name, kabupaten, provinsi)`,
    )
    .eq("id", projectDesaId)
    .maybeSingle();
  return data as unknown as {
    id: string;
    project: { id: string; name: string };
    desa: {
      id: string;
      name: string;
      kabupaten: string | null;
      provinsi: string | null;
    };
  } | null;
}

export default async function PesertaProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const header = await fetchHeader(params.id);
  if (!header) notFound();

  const topik = await listPesertaTopik(params.id);
  const narasumberToRate = await listNarasumberToRate(header.project.id);
  const overall =
    topik.length > 0
      ? topik.reduce((acc, t) => acc + t.completion_percent, 0) / topik.length
      : 0;

  return (
    <div className="space-y-5">
      <Link
        href="/peserta/home"
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <header>
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          {header.desa.name}
        </h1>
        <p className="text-sm text-atr-fg-muted">{header.project.name}</p>
        {(header.desa.kabupaten || header.desa.provinsi) && (
          <p className="mt-0.5 text-xs text-atr-fg-muted">
            {[header.desa.kabupaten, header.desa.provinsi]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </header>

      <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-atr-fg">Progress pendampingan</span>
          <span className="font-bold text-atr-purple-600">
            {Math.round(overall)}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-atr-bg-soft">
          <div
            className="h-full bg-atr-purple transition-all"
            style={{ width: `${Math.round(overall)}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/peserta/projects/${params.id}/baseline`}
          className="flex items-center justify-between rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1 transition hover:bg-atr-bg-soft"
        >
          <div>
            <div className="text-sm font-bold text-atr-fg">Data Baseline</div>
            <div className="text-xs text-atr-fg-muted">
              Isi profil lengkap desa Anda.
            </div>
          </div>
          <span className="text-xs font-bold text-atr-purple-600">Isi →</span>
        </Link>
        <Link
          href={`/peserta/projects/${params.id}/evidence`}
          className="flex items-center justify-between rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1 transition hover:bg-atr-bg-soft"
        >
          <div>
            <div className="text-sm font-bold text-atr-fg">
              Kumpulan Bukti Pendukung
            </div>
            <div className="text-xs text-atr-fg-muted">
              Lihat semua dokumen diunggah.
            </div>
          </div>
          <span className="text-xs font-bold text-atr-purple-600">Buka →</span>
        </Link>
        <Link
          href={`/peserta/projects/${params.id}/rencana-aksi`}
          className="flex items-center justify-between rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1 transition hover:bg-atr-bg-soft sm:col-span-2"
        >
          <div>
            <div className="text-sm font-bold text-atr-fg">Rencana Aksi</div>
            <div className="text-xs text-atr-fg-muted">
              Rencana tindak lanjut yang disusun bersama narasumber.
            </div>
          </div>
          <span className="text-xs font-bold text-atr-purple-600">Buka →</span>
        </Link>
      </div>

      {/* Quick anchor nav */}
      <nav className="flex flex-wrap gap-2 rounded-2xl border border-atr-outline bg-white p-2 shadow-atr-1">
        <a
          href="#topik"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-bg-soft px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-purple-50"
        >
          <ListChecks className="h-3.5 w-3.5" />
          Topik
        </a>
        <a
          href="#penilaian-narasumber"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-bg-soft px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-purple-50"
        >
          <Star className="h-3.5 w-3.5" />
          Penilaian Narasumber
        </a>
        <Link
          href={`/peserta/projects/${params.id}/rencana-aksi`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-bg-soft px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-purple-50"
        >
          <Target className="h-3.5 w-3.5" />
          Rencana Aksi
        </Link>
      </nav>

      <section id="topik" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
          Topik
        </h2>
        <ul className="space-y-3">
          {topik.map((t) => (
            <li
              key={t.project_topik_id}
              className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
            >
              <Link
                href={`/peserta/projects/${params.id}/topik/${t.project_topik_id}`}
                className="block transition hover:bg-atr-bg-soft"
              >
                <div className="flex items-start gap-3 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-atr-purple-50 text-xs font-bold text-atr-purple">
                    {t.sort_order || "•"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-atr-fg">
                        {t.name}
                      </h3>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status]}`}
                      >
                        {STATUS_LABEL[t.status]}
                      </span>
                      {t.unanswered_review_count > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-atr-red/15 px-2 py-0.5 text-[10px] font-bold text-atr-red"
                          title="Ada catatan reviewer yang belum direspons"
                        >
                          <MessageSquare className="h-3 w-3" />
                          {t.unanswered_review_count} perlu respons
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-atr-fg-muted">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-atr-arti" />
                        {t.approved_items}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-atr-yellow" />
                        {t.pending_items}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-atr-fg-muted" />
                        {t.total_items} item
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-atr-fg">
                    {Math.round(t.completion_percent)}%
                  </div>
                </div>
                <div className="h-1.5 bg-atr-bg-soft">
                  <div
                    className="h-full bg-atr-purple transition-all"
                    style={{ width: `${Math.round(t.completion_percent)}%` }}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <NarasumberRatingSection
        projectId={header.project.id}
        narasumber={narasumberToRate}
      />
    </div>
  );
}
