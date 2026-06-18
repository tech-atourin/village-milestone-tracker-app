"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutTemplate,
  Settings,
  Users,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createProjectAction } from "@/server/actions/projects";
import type {
  TemplateSummary,
  OrganizationSummary,
} from "@/server/queries/projects";

const STEPS = [
  { key: "basic", label: "Info Dasar", icon: FileText },
  { key: "template", label: "Pilih Template", icon: LayoutTemplate },
  { key: "modules", label: "Configure Modul", icon: Settings },
  { key: "mitra", label: "Assign Mitra", icon: Users },
  { key: "review", label: "Review & Publish", icon: ClipboardCheck },
] as const;

type State = {
  name: string;
  description: string;
  period_start: string;
  period_end: string;
  template_id: string | null;
  organization_id: string;
  enabled_modules: {
    desa_baseline: boolean;
    topik_pendampingan: boolean;
    capacity_building: boolean;
    klasifikasi_nasional: boolean;
    public_dashboard: boolean;
  };
};

const MODULE_LABELS: Record<keyof State["enabled_modules"], string> = {
  desa_baseline: "Desa Baseline (form profil desa)",
  topik_pendampingan: "Topik Pendampingan (checklist per topik)",
  capacity_building: "Capacity Building (RAPOR peserta)",
  klasifikasi_nasional: "Klasifikasi Nasional (Permenpar)",
  public_dashboard: "Public Dashboard (shareable link)",
};

export function ProjectWizard({
  templates,
  organizations,
  defaultOrganizationId,
  redirectScope = "atourin",
}: {
  templates: TemplateSummary[];
  organizations: OrganizationSummary[];
  defaultOrganizationId?: string;
  redirectScope?: "atourin" | "mitra";
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<State>({
    name: "",
    description: "",
    period_start: "",
    period_end: "",
    template_id: null,
    organization_id: defaultOrganizationId ?? "",
    enabled_modules: {
      desa_baseline: true,
      topik_pendampingan: true,
      capacity_building: true,
      klasifikasi_nasional: false,
      public_dashboard: false,
    },
  });

  const selectedTemplate = state.template_id
    ? templates.find((t) => t.id === state.template_id) ?? null
    : null;
  const selectedOrg = state.organization_id
    ? organizations.find((o) => o.id === state.organization_id) ?? null
    : null;

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return state.name.trim().length >= 2;
      case 1:
        return true; // template optional
      case 2:
        return true;
      case 3:
        return state.organization_id !== "";
      case 4:
        return true;
      default:
        return false;
    }
  }

  function submit(asDraft: boolean) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createProjectAction({
        name: state.name.trim(),
        description: state.description.trim() || null,
        organization_id: state.organization_id,
        template_id: state.template_id,
        period_start: state.period_start || null,
        period_end: state.period_end || null,
        enabled_modules: state.enabled_modules,
        publish: !asDraft,
      });
      if (result.error) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      if (result.projectId) {
        router.push(`/${redirectScope}/projects/${result.projectId}`);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-atr-outline bg-white">
      {/* Step indicator */}
      <div className="border-b border-atr-outline p-5">
        <ol className="flex items-center gap-2 overflow-x-auto sm:gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <li key={s.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
                    isDone
                      ? "bg-atr-purple text-white"
                      : isActive
                        ? "bg-atr-purple-light/50 text-atr-purple-600 ring-2 ring-atr-purple/30"
                        : "bg-atr-bg-soft text-atr-fg-muted",
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:inline",
                    isActive ? "text-atr-fg" : "text-atr-fg-muted",
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="hidden h-px w-6 bg-atr-outline sm:block" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-5">
            <h3 className="text-base font-semibold text-atr-fg">
              Informasi dasar project
            </h3>
            <Field
              label="Nama Project"
              required
              error={fieldErrors.name}
              hint='Contoh: "Pendampingan ADWI 2026 Batch 1"'
            >
              <input
                type="text"
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
                className="h-11 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                placeholder="Pendampingan ADWI 2026 Batch 1"
              />
            </Field>
            <Field label="Deskripsi" error={fieldErrors.description}>
              <textarea
                value={state.description}
                onChange={(e) =>
                  setState({ ...state, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                placeholder="Tujuan, ruang lingkup, dan catatan project…"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal Mulai" error={fieldErrors.period_start}>
                <input
                  type="date"
                  value={state.period_start}
                  onChange={(e) =>
                    setState({ ...state, period_start: e.target.value })
                  }
                  className="h-11 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              </Field>
              <Field label="Tanggal Selesai" error={fieldErrors.period_end}>
                <input
                  type="date"
                  value={state.period_end}
                  onChange={(e) =>
                    setState({ ...state, period_end: e.target.value })
                  }
                  className="h-11 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-atr-fg">
              Pilih template (opsional)
            </h3>
            <p className="text-sm text-atr-fg-muted">
              Template menyalin topik + checklist starter ke project. Edit
              bebas setelah project dibuat.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <TemplateCard
                selected={state.template_id === null}
                onClick={() => setState({ ...state, template_id: null })}
                title="Start dari blank"
                description="Tanpa template, tambah topik manual nanti."
                stats="0 topik · 0 checklist"
              />
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  selected={state.template_id === t.id}
                  onClick={() => setState({ ...state, template_id: t.id })}
                  title={t.name}
                  description={t.description ?? ""}
                  stats={`${t.topik_count} topik · ${t.checklist_count} checklist item`}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-atr-fg">
              Configure modul aktif
            </h3>
            <p className="text-sm text-atr-fg-muted">
              Nonaktifkan modul yang tidak digunakan di project ini.
            </p>
            <div className="space-y-2">
              {(
                Object.keys(state.enabled_modules) as Array<
                  keyof State["enabled_modules"]
                >
              ).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-atr-outline p-3 transition hover:bg-atr-bg-soft"
                >
                  <span className="text-sm text-atr-fg">
                    {MODULE_LABELS[key]}
                  </span>
                  <input
                    type="checkbox"
                    checked={state.enabled_modules[key]}
                    onChange={(e) =>
                      setState({
                        ...state,
                        enabled_modules: {
                          ...state.enabled_modules,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 accent-atr-purple"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-atr-fg">
              Assign Mitra
            </h3>
            <p className="text-sm text-atr-fg-muted">
              Pilih organisasi mitra pemilik project ini.
            </p>
            <Field label="Organisasi Mitra" required error={fieldErrors.organization_id}>
              <select
                value={state.organization_id}
                onChange={(e) =>
                  setState({ ...state, organization_id: e.target.value })
                }
                className="h-11 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              >
                <option value="">Pilih organisasi…</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.type === "atourin" ? "Atourin" : "Mitra"})
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-atr-fg-muted">
              Belum ada organisasi mitra? Kelola dulu di menu Users sebelum
              lanjut.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-atr-fg">
              Review & publish
            </h3>
            <dl className="grid gap-3 rounded-xl border border-atr-outline bg-atr-bg-soft p-5 text-sm">
              <Row label="Nama" value={state.name} />
              <Row
                label="Deskripsi"
                value={state.description || "-"}
              />
              <Row
                label="Periode"
                value={`${state.period_start || "-"} → ${state.period_end || "-"}`}
              />
              <Row
                label="Template"
                value={selectedTemplate?.name ?? "Blank"}
              />
              <Row label="Mitra" value={selectedOrg?.name ?? "-"} />
              <Row
                label="Modul aktif"
                value={
                  (
                    Object.keys(state.enabled_modules) as Array<
                      keyof State["enabled_modules"]
                    >
                  )
                    .filter((k) => state.enabled_modules[k])
                    .map((k) => MODULE_LABELS[k].split(" (")[0])
                    .join(", ") || "-"
                }
              />
            </dl>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-atr-outline bg-white px-4 text-sm font-medium text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-60"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => submit(false)}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-atr-purple px-4 text-sm font-medium text-white transition hover:bg-atr-purple-600 disabled:opacity-60"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish & Invite
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      {step < 4 && (
        <div className="flex items-center justify-between border-t border-atr-outline bg-atr-bg-soft px-6 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-atr-outline bg-white px-3 text-sm font-medium text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </button>
          <span className="text-xs text-atr-fg-muted">
            Step {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={!canAdvance()}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-atr-purple px-3 text-sm font-medium text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            Lanjut
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  required,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-atr-fg">
        {label}
        {required && <span className="ml-1 text-atr-red">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-atr-fg-muted">{hint}</p>}
      {error && <p className="text-xs text-atr-red">{error}</p>}
    </div>
  );
}

function TemplateCard({
  selected,
  onClick,
  title,
  description,
  stats,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  stats: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition",
        selected
          ? "border-atr-purple bg-atr-purple-50 ring-2 ring-atr-purple/15"
          : "border-atr-outline bg-white hover:border-atr-outline",
      )}
    >
      <div className="text-sm font-semibold text-atr-fg">{title}</div>
      {description && (
        <div className="mt-1 line-clamp-2 text-xs text-atr-fg-muted">
          {description}
        </div>
      )}
      <div className="mt-2 text-xs font-medium text-atr-purple-600">{stats}</div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-atr-fg-muted">
        {label}
      </dt>
      <dd className="text-sm text-atr-fg">{value}</dd>
    </div>
  );
}
