"use client";

import { useState, useTransition } from "react";
import {
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
} from "lucide-react";
import {
  generateTemplateBase64,
  parseBulkFile,
  commitBulkImport,
  type CommitResult,
} from "@/server/actions/bulk-import";
import type { BulkRowResult } from "@/lib/excel/bulk-import";

type Stage = "upload" | "preview" | "done";

type Summary = {
  total: number;
  valid: number;
  invalid: number;
  new_users: number;
  existing_users: number;
};

export function BulkImportFlow({
  mode = "peserta",
  projectId,
  onDone,
}: {
  mode?: "peserta" | "narasumber";
  /** When set, imported users are attached to this project as members. */
  projectId?: string;
  /** Called after a successful commit (e.g. to close a dialog + refresh). */
  onDone?: () => void;
}) {
  const [stage, setStage] = useState<Stage>("upload");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkRowResult[]>([]);
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [sendInvites, setSendInvites] = useState(true);
  const [pending, startTransition] = useTransition();

  async function handleDownload() {
    const base64 = await generateTemplateBase64(mode);
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-import-${mode}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload(file: File) {
    setError(null);
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    startTransition(async () => {
      const result = await parseBulkFile({ base64 });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setRows(result.rows);
      setDuplicates(new Set(result.duplicates.map((d) => d.rowNumber)));
      setSummary(result.summary);
      setStage("preview");
    });
  }

  async function handleCommit() {
    setError(null);
    // For project import, include existing users too so they get attached
    // to the project. For global import, only brand-new users.
    const sourceRows = projectId
      ? rows.filter((r) => r.ok)
      : rows.filter((r) => r.ok && !duplicates.has(r.rowNumber));
    const payloadRows = sourceRows.map((r) => ({
      full_name: r.data!.full_name,
      email: r.data!.email || null,
      phone: r.data!.normalized_phone,
      nik: r.data!.nik || null,
      gender: r.data!.gender || null,
      birthdate: r.data!.normalized_birthdate,
      desa_name: r.data!.desa_name || null,
      role: r.data!.role,
    }));

    startTransition(async () => {
      const result = await commitBulkImport({
        rows: payloadRows,
        send_invites: sendInvites,
        project_id: projectId ?? null,
      });
      setCommitResult(result);
      setStage("done");
      if (!result.error) onDone?.();
    });
  }

  // -----------------------------------------------------
  // Stage: upload
  // -----------------------------------------------------
  if (stage === "upload") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-atr-outline bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-atr-fg">
                1. Download template Excel
              </h3>
              <p className="mt-1 text-sm text-atr-fg-muted">
                Format kolom yang dipakai sistem. Isi data peserta di file ini.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-atr-outline bg-white px-4 text-sm font-medium text-atr-fg transition hover:bg-atr-bg-soft"
            >
              <Download className="h-4 w-4" />
              Download template
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-atr-outline bg-white p-6">
          <h3 className="text-sm font-semibold text-atr-fg">
            2. Upload file Excel terisi
          </h3>
          <p className="mt-1 text-sm text-atr-fg-muted">
            File .xlsx. Maks 1000 baris per import.
          </p>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-atr-outline bg-atr-bg-soft px-6 py-12 text-center transition hover:border-atr-purple/50 hover:bg-atr-purple-50/50">
            <Upload className="h-8 w-8 text-atr-fg-muted" />
            <span className="text-sm font-medium text-atr-fg">
              Klik untuk pilih file, atau drag &amp; drop di sini
            </span>
            <span className="text-xs text-atr-fg-muted">
              .xlsx · kolom: full_name, email, phone, nik, gender, birthdate,
              desa_name, role
            </span>
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </label>

          {pending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-atr-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses file…
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // Stage: preview
  // -----------------------------------------------------
  if (stage === "preview" && summary) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Total baris" value={summary.total} />
          <SummaryCard
            label="Valid"
            value={summary.valid}
            tone="success"
          />
          <SummaryCard label="Error" value={summary.invalid} tone="danger" />
          <SummaryCard
            label="Duplikat"
            value={summary.existing_users}
            tone="warning"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-atr-outline bg-white">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full divide-y divide-atr-outline">
              <thead className="sticky top-0 bg-atr-bg-soft">
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-atr-fg-muted">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">HP</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atr-outline bg-white text-sm">
                {rows.map((r) => {
                  const isDup = duplicates.has(r.rowNumber);
                  const tone = !r.ok
                    ? "bg-atr-red/5"
                    : isDup
                      ? "bg-atr-yellow/10"
                      : "";
                  return (
                    <tr key={r.rowNumber} className={tone}>
                      <td className="px-3 py-2 text-xs text-atr-fg-muted">
                        {r.rowNumber}
                      </td>
                      <td className="px-3 py-2">
                        {!r.ok ? (
                          <Badge tone="danger" icon={XCircle} label="Error" />
                        ) : isDup ? (
                          <Badge tone="warning" icon={AlertTriangle} label="Duplikat" />
                        ) : (
                          <Badge tone="success" icon={CheckCircle2} label="OK" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.data?.full_name ?? (r.raw.full_name as string) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-atr-fg-muted">
                        {r.data?.email ?? (r.raw.email as string) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-atr-fg-muted">
                        {r.data?.normalized_phone ??
                          (r.raw.phone as string) ??
                          "—"}
                      </td>
                      <td className="px-3 py-2 text-atr-fg-muted">
                        {r.data?.role ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-atr-fg-muted">
                        {!r.ok &&
                          r.errors?.map((e) => (
                            <div key={e.field} className="text-atr-red">
                              <span className="font-medium">{e.field}:</span>{" "}
                              {e.message}
                            </div>
                          ))}
                        {isDup && "User dengan kontak ini sudah ada, di-skip"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-atr-outline bg-white p-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-atr-fg">
            <input
              type="checkbox"
              checked={sendInvites}
              onChange={(e) => setSendInvites(e.target.checked)}
              className="h-4 w-4 accent-atr-purple"
            />
            Kirim email undangan ke peserta baru (lewati jika hanya ingin
            create akun tanpa notify)
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setStage("upload");
              setRows([]);
              setSummary(null);
              setDuplicates(new Set());
            }}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-atr-outline bg-white px-4 text-sm font-medium text-atr-fg transition hover:bg-atr-bg-soft"
          >
            Kembali & upload ulang
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={pending || summary.new_users === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-medium text-white transition hover:bg-atr-purple-600 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Konfirmasi import {summary.new_users} peserta baru
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // Stage: done
  // -----------------------------------------------------
  if (stage === "done" && commitResult) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-atr-purple/30 bg-atr-purple-50 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-atr-purple-600" />
            <div>
              <h3 className="text-base font-semibold text-atr-purple-800">
                Import selesai
              </h3>
              <p className="text-sm text-atr-purple-600">
                {commitResult.created ?? 0} user dibuat, {commitResult.skipped ?? 0} di-skip,{" "}
                {commitResult.invites_sent ?? 0} undangan terkirim
                {commitResult.invites_failed
                  ? `, ${commitResult.invites_failed} gagal dikirim`
                  : ""}.
              </p>
            </div>
          </div>
        </div>

        {commitResult.errors && commitResult.errors.length > 0 && (
          <div className="rounded-2xl border border-atr-red/30 bg-atr-red/10 p-5">
            <h4 className="text-sm font-semibold text-atr-red">
              Error per baris
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-atr-red">
              {commitResult.errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <a
            href="/atourin/users"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-medium text-white transition hover:bg-atr-purple-600"
          >
            <Users className="h-4 w-4" />
            Lihat semua user
          </a>
          <button
            type="button"
            onClick={() => {
              setStage("upload");
              setRows([]);
              setSummary(null);
              setDuplicates(new Set());
              setCommitResult(null);
            }}
            className="inline-flex h-10 items-center rounded-lg border border-atr-outline bg-white px-4 text-sm font-medium text-atr-fg transition hover:bg-atr-bg-soft"
          >
            Import file lain
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  const tones = {
    neutral: "border-atr-outline bg-white text-atr-fg",
    success: "border-atr-arti/30 bg-atr-arti/10 text-atr-arti",
    danger: "border-atr-red/30 bg-atr-red/10 text-atr-red",
    warning: "border-atr-yellow/40 bg-atr-yellow/10 text-atr-fg",
  } as const;
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Badge({
  tone,
  icon: Icon,
  label,
}: {
  tone: "danger" | "warning" | "success";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const tones = {
    danger: "bg-atr-red/15 text-atr-red",
    warning: "bg-atr-yellow/25 text-atr-fg",
    success: "bg-atr-arti/15 text-atr-arti",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
