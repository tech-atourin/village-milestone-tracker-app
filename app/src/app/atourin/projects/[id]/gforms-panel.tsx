"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { addProjectGform, triggerGformSync } from "@/server/actions/gforms";

export type GformRow = {
  id: string;
  form_type: string;
  form_label: string | null;
  gform_id: string;
  sheet_id: string;
  identifier_field: string;
  sync_status: "pending" | "active" | "error";
  last_sync_at: string | null;
  last_sync_error: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  pre_test: "Pre-test",
  post_test: "Post-test",
  survey_kepuasan: "Survey Kepuasan",
  survey_lainnya: "Survey Lainnya",
};

export function GformsPanel({
  projectId,
  gforms,
}: {
  projectId: string;
  gforms: GformRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<{
    gformId: string;
    matched: number;
    unmatched: number;
    errors: string[];
  } | null>(null);

  const [form, setForm] = useState({
    form_type: "pre_test" as
      | "pre_test"
      | "post_test"
      | "survey_kepuasan"
      | "survey_lainnya",
    form_label: "",
    gform_id: "",
    sheet_id: "",
    identifier_field: "Email Address",
  });

  function addForm() {
    setError(null);
    startTransition(async () => {
      const r = await addProjectGform({
        project_id: projectId,
        form_type: form.form_type,
        form_label: form.form_label || null,
        gform_id: form.gform_id.trim(),
        sheet_id: form.sheet_id.trim(),
        identifier_field: form.identifier_field || "Email Address",
      });
      if (r.error) setError(r.error);
      else {
        setShowAdd(false);
        setForm({
          form_type: "pre_test",
          form_label: "",
          gform_id: "",
          sheet_id: "",
          identifier_field: "Email Address",
        });
        router.refresh();
      }
    });
  }

  function sync(gformId: string) {
    setError(null);
    setSyncReport(null);
    startTransition(async () => {
      const r = await triggerGformSync(gformId);
      setSyncReport({
        gformId,
        matched: r.matched,
        unmatched: r.unmatched,
        errors: r.errors,
      });
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-atr-purple" />
          <h3 className="text-sm font-bold text-atr-fg">
            Google Forms ({gforms.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600"
        >
          <Plus className="h-3 w-3" />
          Tambah
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-sm text-atr-red">
          {error}
        </div>
      )}

      {syncReport && (
        <div className="mb-3 rounded-lg border border-atr-purple/30 bg-atr-purple-50 p-3 text-sm">
          <strong>Sync selesai:</strong> {syncReport.matched} matched,{" "}
          {syncReport.unmatched} unmatched
          {syncReport.errors.length > 0 && (
            <>, {syncReport.errors.length} error</>
          )}
        </div>
      )}

      {showAdd && (
        <div className="mb-4 space-y-3 rounded-lg border border-atr-outline bg-atr-bg-soft p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-bold text-atr-fg">Jenis form</span>
              <select
                value={form.form_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    form_type: e.target.value as typeof form.form_type,
                  })
                }
                className="h-9 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              >
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-bold text-atr-fg">
                Label (opsional)
              </span>
              <input
                type="text"
                value={form.form_label}
                onChange={(e) =>
                  setForm({ ...form, form_label: e.target.value })
                }
                placeholder="Pre-test Batch 1"
                className="h-9 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-atr-fg">Google Form ID</span>
            <input
              type="text"
              value={form.gform_id}
              onChange={(e) => setForm({ ...form, gform_id: e.target.value })}
              placeholder="1FAIpQLSf...(dari URL https://forms.gle/xxx atau forms.google.com/forms/d/<ID>/edit)"
              className="h-9 rounded-md border border-atr-outline bg-white px-2 font-mono text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-atr-fg">Google Sheet ID</span>
            <input
              type="text"
              value={form.sheet_id}
              onChange={(e) => setForm({ ...form, sheet_id: e.target.value })}
              placeholder="1A2B3C... (dari URL spreadsheet jawaban: docs.google.com/spreadsheets/d/<ID>/edit)"
              className="h-9 rounded-md border border-atr-outline bg-white px-2 font-mono text-xs outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-atr-fg">
              Kolom identifier peserta
            </span>
            <input
              type="text"
              value={form.identifier_field}
              onChange={(e) =>
                setForm({ ...form, identifier_field: e.target.value })
              }
              placeholder="Email Address"
              className="h-9 rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
            <span className="text-[11px] text-atr-fg-muted">
              Nama kolom di Sheet yang berisi email/NIK peserta (untuk
              matching).
            </span>
          </label>
          <p className="rounded-md border border-atr-yellow/40 bg-atr-yellow/10 p-2 text-[11px] text-atr-fg">
            <strong>⚠️ Penting:</strong> Sebelum sync, share Google Sheet ke
            email service account dengan akses Viewer:
            <br />
            <code className="font-mono text-atr-purple">
              village-milestone-tracker@v2-web.iam.gserviceaccount.com
            </code>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="inline-flex h-8 items-center rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={addForm}
              disabled={pending || !form.gform_id || !form.sheet_id}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Simpan
            </button>
          </div>
        </div>
      )}

      {gforms.length === 0 ? (
        <p className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-6 text-center text-xs text-atr-fg-muted">
          Belum ada Google Form di project ini. Tambah Pre/Post test atau
          survey untuk auto-sync skor peserta.
        </p>
      ) : (
        <ul className="space-y-2">
          {gforms.map((g) => {
            const StatusIcon =
              g.sync_status === "active"
                ? CheckCircle2
                : g.sync_status === "error"
                  ? AlertCircle
                  : Clock;
            const statusColor =
              g.sync_status === "active"
                ? "text-atr-arti"
                : g.sync_status === "error"
                  ? "text-atr-red"
                  : "text-atr-fg-muted";
            return (
              <li
                key={g.id}
                className="flex items-start gap-3 rounded-lg border border-atr-outline p-3"
              >
                <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${statusColor}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-atr-fg">
                    {g.form_label ?? TYPE_LABEL[g.form_type]}
                    <span className="inline-flex rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-atr-purple-600">
                      {TYPE_LABEL[g.form_type]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-atr-fg-muted">
                    Sheet: <code className="font-mono">{g.sheet_id.slice(0, 16)}…</code> ·
                    Identifier: {g.identifier_field}
                  </div>
                  {g.last_sync_at && (
                    <div className="text-[11px] text-atr-fg-muted">
                      Sync terakhir:{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(g.last_sync_at))}
                    </div>
                  )}
                  {g.last_sync_error && (
                    <div className="mt-1 text-[11px] text-atr-red">
                      {g.last_sync_error}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => sync(g.id)}
                  disabled={pending}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Sync
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
