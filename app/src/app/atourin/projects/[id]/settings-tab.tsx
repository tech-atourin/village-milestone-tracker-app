"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Archive, Trash2, Loader2 } from "lucide-react";
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
};

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
}: {
  project: Project;
  extraLogos?: ExtraLogo[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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

  function save() {
    setError(null);
    startTransition(async () => {
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
      });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function archive() {
    if (!confirm("Arsipkan project ini? Status akan ke 'archived'.")) return;
    startTransition(async () => {
      await archiveProject(project.id);
      router.refresh();
    });
  }

  function destroy() {
    if (
      !confirm(
        "Hapus project (soft-delete)? Project tidak akan muncul lagi di daftar, tapi data masih tersimpan untuk audit.",
      )
    )
      return;
    startTransition(async () => {
      await deleteProject(project.id);
      startRouteProgress();
      router.push("/atourin/projects");
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
      <ExtraLogosManager projectId={project.id} initialLogos={extraLogos} />
      <hr className="border-atr-outline" />

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={archive}
            disabled={pending || project.status === "archived"}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            Arsipkan
          </button>
          <button
            type="button"
            onClick={destroy}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-atr-red/30 bg-white px-4 text-sm font-bold text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Hapus project
          </button>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-5 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan perubahan
        </button>
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
