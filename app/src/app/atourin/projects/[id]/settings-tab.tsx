"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Archive, Trash2, Loader2, Check } from "lucide-react";
import {
  updateProject,
  archiveProject,
  deleteProject,
} from "@/server/actions/project-edit";
import { startRouteProgress } from "@/components/route-progress";
import {
  ExtraLogosManager,
  type ExtraLogo,
} from "./extra-logos-manager";
import {
  resolveGradingConfig,
  type GradingConfig,
  type BobotKey,
} from "@/lib/rapor/scoring";

type Project = {
  id: string;
  name: string;
  description: string | null;
  period_start: string | null;
  period_end: string | null;
  pelatihan_start: string | null;
  pelatihan_end: string | null;
  total_pelatihan_days: number | null;
  pendampingan_start: string | null;
  pendampingan_end: string | null;
  total_pendampingan_days: number | null;
  status: "draft" | "active" | "completed" | "archived";
  enabled_modules: Record<string, boolean>;
  grading_config?: Partial<GradingConfig> | null;
};

const BOBOT_FIELDS: Array<{ key: BobotKey; label: string }> = [
  { key: "pre_test", label: "Pre-Test" },
  { key: "post_test", label: "Post-Test" },
  { key: "tugas", label: "Tugas" },
  { key: "keaktifan", label: "Keaktifan" },
];

const MODULES = [
  ["desa_baseline", "Desa Baseline"],
  ["topik_pendampingan", "Topik Pendampingan"],
  ["capacity_building", "Capacity Building (RAPOR)"],
  ["klasifikasi_nasional", "Klasifikasi Nasional"],
  ["public_dashboard", "Shareable link (untuk mitra/sponsor)"],
] as const;

export function SettingsTab({
  project,
  extraLogos = [],
  canManageLifecycle = true,
}: {
  project: Project;
  extraLogos?: ExtraLogo[];
  canManageLifecycle?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Kunci per-aksi supaya tombol lain tidak ikut spinner/disabled.
  const [busyAction, setBusyAction] = useState<
    "save" | "archive" | "delete" | null
  >(null);
  const pending = busyAction !== null;
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [periodStart, setPeriodStart] = useState(project.period_start ?? "");
  const [periodEnd, setPeriodEnd] = useState(project.period_end ?? "");
  const [pelatihanStart, setPelatihanStart] = useState(project.pelatihan_start ?? "");
  const [pelatihanEnd, setPelatihanEnd] = useState(project.pelatihan_end ?? "");
  const [totalPelatihanDays, setTotalPelatihanDays] = useState<string>(
    project.total_pelatihan_days?.toString() ?? "",
  );
  const [pendampinganStart, setPendampinganStart] = useState(
    project.pendampingan_start ?? "",
  );
  const [pendampinganEnd, setPendampinganEnd] = useState(
    project.pendampingan_end ?? "",
  );
  const [totalDays, setTotalDays] = useState<string>(
    project.total_pendampingan_days?.toString() ?? "",
  );
  const [status, setStatus] = useState(project.status);
  const [modules, setModules] = useState<Record<string, boolean>>(() => ({
    desa_baseline: project.enabled_modules.desa_baseline ?? true,
    topik_pendampingan: project.enabled_modules.topik_pendampingan ?? true,
    capacity_building: project.enabled_modules.capacity_building ?? true,
    klasifikasi_nasional:
      project.enabled_modules.klasifikasi_nasional ?? false,
    public_dashboard: project.enabled_modules.public_dashboard ?? false,
  }));

  // Bobot penilaian dalam PERSEN (0..100) untuk input; disimpan sbg fraksi.
  const initialGrading = resolveGradingConfig(project.grading_config);
  const [weights, setWeights] = useState<Record<BobotKey, string>>(() => ({
    pre_test: String(Math.round(initialGrading.weights.pre_test * 100)),
    post_test: String(Math.round(initialGrading.weights.post_test * 100)),
    tugas: String(Math.round(initialGrading.weights.tugas * 100)),
    keaktifan: String(Math.round(initialGrading.weights.keaktifan * 100)),
  }));
  const [passingScore, setPassingScore] = useState<string>(
    String(initialGrading.passing_score),
  );
  const bobotTotal = BOBOT_FIELDS.reduce(
    (s, f) => s + (Number(weights[f.key]) || 0),
    0,
  );

  function save() {
    setError(null);
    setBusyAction("save");
    startTransition(async () => {
      try {
      const r = await updateProject({
        id: project.id,
        name,
        description,
        period_start: periodStart,
        period_end: periodEnd,
        pelatihan_start: pelatihanStart,
        pelatihan_end: pelatihanEnd,
        total_pelatihan_days: totalPelatihanDays === "" ? null : Number(totalPelatihanDays),
        pendampingan_start: pendampinganStart,
        pendampingan_end: pendampinganEnd,
        total_pendampingan_days: totalDays === "" ? null : Number(totalDays),
        status,
        enabled_modules: {
          desa_baseline: modules.desa_baseline,
          topik_pendampingan: modules.topik_pendampingan,
          capacity_building: modules.capacity_building,
          klasifikasi_nasional: modules.klasifikasi_nasional,
          public_dashboard: modules.public_dashboard,
        },
        grading_config: {
          weights: {
            pre_test: Number(weights.pre_test) || 0,
            post_test: Number(weights.post_test) || 0,
            tugas: Number(weights.tugas) || 0,
            keaktifan: Number(weights.keaktifan) || 0,
          },
          passing_score: Number(passingScore) || 0,
        },
      });
      if (r.error) {
        setError(r.error);
      } else {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
        router.refresh();
      }
      } finally {
        setBusyAction(null);
      }
    });
  }

  function archive() {
    if (!confirm("Arsipkan project ini? Status akan ke 'archived'.")) return;
    setBusyAction("archive");
    startTransition(async () => {
      try {
        await archiveProject(project.id);
        router.refresh();
      } finally {
        setBusyAction(null);
      }
    });
  }

  function destroy() {
    if (
      !confirm(
        "Hapus project (soft-delete)? Project tidak akan muncul lagi di daftar, tapi data masih tersimpan untuk audit.",
      )
    )
      return;
    setBusyAction("delete");
    startTransition(async () => {
      try {
        await deleteProject(project.id);
        startRouteProgress();
        router.push("/atourin/projects");
      } finally {
        // Navigasi keluar; reset tetap aman bila push gagal.
        setBusyAction(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <h3 className="mb-4 text-sm font-bold text-atr-fg">Info project</h3>
        <div className="space-y-4">
          <Field label="Nama" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Deskripsi">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
          {/* Periode program keseluruhan */}
          <div className="rounded-xl border border-atr-outline p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Periode Program (keseluruhan)
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal mulai">
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Tanggal selesai">
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="mt-2 text-[11px] text-atr-fg-muted">
              Rentang menyeluruh program, mencakup fase pelatihan sampai
              pendampingan.
            </p>
          </div>

          {/* Fase pelatihan */}
          <div className="rounded-xl border border-atr-outline p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Fase Pelatihan
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tanggal mulai pelatihan">
                <input
                  type="date"
                  value={pelatihanStart}
                  onChange={(e) => setPelatihanStart(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Tanggal selesai pelatihan">
                <input
                  type="date"
                  value={pelatihanEnd}
                  onChange={(e) => setPelatihanEnd(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Total hari pelatihan">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={totalPelatihanDays}
                  placeholder="mis. 5"
                  onChange={(e) => setTotalPelatihanDays(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="mt-2 text-[11px] text-atr-fg-muted">
              Jumlah hari peserta mengikuti sesi pelatihan. Dipakai sebagai
              acuan check-in kehadiran per topik.
            </p>
          </div>

          {/* Fase pendampingan */}
          <div className="rounded-xl border border-atr-outline p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              Fase Pendampingan
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tanggal mulai pendampingan">
                <input
                  type="date"
                  value={pendampinganStart}
                  onChange={(e) => setPendampinganStart(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Tanggal selesai pendampingan">
                <input
                  type="date"
                  value={pendampinganEnd}
                  onChange={(e) => setPendampinganEnd(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Total hari pendampingan">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={totalDays}
                  placeholder="mis. 14"
                  onChange={(e) => setTotalDays(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="mt-2 text-[11px] text-atr-fg-muted">
              Jumlah hari kunjungan narasumber per desa. Dipakai untuk pelabelan
              Hari 1, Hari 2, dst di tab Sesi Pendampingan.
            </p>
          </div>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as Project["status"])
              }
              className={inputCls}
            >
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="completed">Selesai</option>
              <option value="archived">Arsip</option>
            </select>
          </Field>
        </div>
      </section>

      <hr className="border-atr-outline" />

      <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <h3 className="text-sm font-bold text-atr-fg">
          Komposisi Nilai Akhir &amp; kelulusan
        </h3>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Atur bobot tiap komponen dan batas nilai lulus khusus project ini.
          Tiap mitra/program bisa berbeda. Total bobot harus 100%.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {BOBOT_FIELDS.map((f) => (
            <Field key={f.key} label={`${f.label} (%)`}>
              <input
                type="number"
                min={0}
                max={100}
                value={weights[f.key]}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [f.key]: e.target.value }))
                }
                className={inputCls}
              />
            </Field>
          ))}
        </div>
        <div
          className={`mt-2 text-xs font-bold ${
            Math.round(bobotTotal) === 100 ? "text-atr-arti" : "text-atr-red"
          }`}
        >
          Total bobot: {Math.round(bobotTotal)}%
          {Math.round(bobotTotal) !== 100 && " (harus 100%)"}
        </div>
        <div className="mt-4 max-w-xs">
          <Field label="Batas lulus (Nilai Akhir >=)">
            <input
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      <hr className="border-atr-outline" />
      <ExtraLogosManager projectId={project.id} initialLogos={extraLogos} />
      <hr className="border-atr-outline" />

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {canManageLifecycle && (
            <>
              <button
                type="button"
                onClick={archive}
                disabled={pending || project.status === "archived"}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
              >
                {busyAction === "archive" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Arsipkan
              </button>
              <button
                type="button"
                onClick={destroy}
                disabled={pending}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-atr-red/30 bg-white px-4 text-sm font-bold text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
              >
                {busyAction === "delete" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Hapus project
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {savedFlash && (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-atr-arti">
              <Check className="h-4 w-4" />
              Perubahan tersimpan
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-5 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {busyAction === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : savedFlash ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {savedFlash ? "Tersimpan" : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-atr-fg">
        {label}
        {required && <span className="ml-1 text-atr-red">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";
