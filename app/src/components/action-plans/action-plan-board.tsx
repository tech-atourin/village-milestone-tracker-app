"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Pause,
  Circle,
  X,
  Save,
  Upload,
  Paperclip,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ActionPlanRow } from "@/server/queries/action-plans";
import {
  createActionPlan,
  updateActionPlan,
  deleteActionPlan,
  uploadActionPlanEvidence,
  getActionPlanEvidenceUrl,
} from "@/server/actions/action-plans";
import { runOrQueue, isQueued } from "@/lib/offline/run";

type DesaOption = {
  project_desa_id: string;
  project_id: string;
  project_name: string;
  desa_name: string;
};

const TIMEFRAMES = [
  { key: "jangka_pendek", label: "Jangka Pendek" },
  { key: "jangka_menengah", label: "Jangka Menengah" },
  { key: "jangka_panjang", label: "Jangka Panjang" },
] as const;

const STATUSES = [
  { key: "rencana", label: "Rencana", color: "bg-atr-bg-soft text-atr-fg-muted", icon: Circle },
  { key: "on_track", label: "On Track", color: "bg-atr-purple-50 text-atr-purple-600", icon: Clock },
  { key: "selesai", label: "Selesai", color: "bg-atr-arti/15 text-atr-arti", icon: CheckCircle2 },
  { key: "ditunda", label: "Ditunda", color: "bg-atr-yellow/20 text-atr-fg", icon: Pause },
] as const;

function groupByDesa(rows: ActionPlanRow[]): Array<[string, ActionPlanRow[]]> {
  const buckets = new Map<string, ActionPlanRow[]>();
  for (const r of rows) {
    const key = r.desa_name || "Tanpa desa";
    const arr = buckets.get(key) ?? [];
    arr.push(r);
    buckets.set(key, arr);
  }
  return Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(s));
}

export function ActionPlanBoard({
  rows,
  desaOptions,
  canEdit,
  showDesa = true,
}: {
  rows: ActionPlanRow[];
  desaOptions: DesaOption[];
  canEdit: boolean;
  showDesa?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | (typeof STATUSES)[number]["key"]>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [openDesa, setOpenDesa] = useState<Set<string>>(new Set());
  const [desaSearch, setDesaSearch] = useState("");

  const filtered = rows.filter((r) =>
    filter === "all" ? true : r.status === filter,
  );

  function toggleDesa(name: string) {
    setOpenDesa((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus rencana aksi ini?")) return;
    startTransition(async () => {
      const r = await deleteActionPlan(id);
      if (r.error) {
        setError(r.error);
        alert(`Gagal menghapus: ${r.error}`);
      } else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1.5">
          <FilterPill
            label={`Semua · ${rows.length}`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {STATUSES.map((s) => {
            const count = rows.filter((r) => r.status === s.key).length;
            return (
              <FilterPill
                key={s.key}
                label={`${s.label} · ${count}`}
                active={filter === s.key}
                onClick={() => setFilter(s.key)}
              />
            );
          })}
        </nav>
        {canEdit && desaOptions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Rencana
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-sm text-atr-red">
          {error}
        </div>
      )}

      {showCreate && (
        <PlanForm
          desaOptions={desaOptions}
          onCancel={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <p className="text-sm font-bold text-atr-fg">
            {filter === "all"
              ? "Belum ada rencana aksi"
              : "Tidak ada item di status ini"}
          </p>
          <p className="mt-1 text-xs text-atr-fg-muted">
            {canEdit
              ? "Klik tombol Tambah Rencana untuk mulai."
              : "Narasumber & peserta akan menambahkan rencana aksi di sini."}
          </p>
        </div>
      ) : showDesa ? (
        // Cross-desa view: collapsible accordion so dozens of desa stay scannable.
        (() => {
          const grouped = groupByDesa(filtered);
          const q = desaSearch.trim().toLowerCase();
          const visible = q
            ? grouped.filter(([name]) => name.toLowerCase().includes(q))
            : grouped;
          const allOpen = visible.length > 0 &&
            visible.every(([name]) => openDesa.has(name));
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="search"
                  value={desaSearch}
                  onChange={(e) => setDesaSearch(e.target.value)}
                  placeholder={`Cari desa… (${grouped.length} total)`}
                  className="h-9 w-full max-w-xs rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple"
                />
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (allOpen) setOpenDesa(new Set());
                      else setOpenDesa(new Set(visible.map(([n]) => n)));
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 font-bold text-atr-fg-muted hover:bg-atr-bg-soft"
                  >
                    {allOpen ? "Tutup semua" : "Buka semua"}
                  </button>
                </div>
              </div>
              {visible.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-atr-outline bg-white p-6 text-center text-sm italic text-atr-fg-muted">
                  Tidak ada desa cocok dengan pencarian.
                </p>
              ) : (
                <ul className="divide-y divide-atr-outline overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
                  {visible.map(([desaName, items]) => {
                    const isOpen = openDesa.has(desaName);
                    const counts = {
                      selesai: items.filter((i) => i.status === "selesai").length,
                      ontrack: items.filter((i) => i.status === "on_track").length,
                      ditunda: items.filter((i) => i.status === "ditunda").length,
                    };
                    return (
                      <li key={desaName}>
                        <button
                          type="button"
                          onClick={() => toggleDesa(desaName)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-atr-bg-soft"
                          aria-expanded={isOpen}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-atr-fg-muted" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-atr-fg-muted" />
                          )}
                          <span className="inline-flex h-5 items-center rounded-full bg-atr-purple-50 px-2 text-[10px] font-bold text-atr-purple-600">
                            {desaName}
                          </span>
                          <span className="text-xs text-atr-fg-muted">
                            {items.length} rencana
                          </span>
                          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold">
                            {counts.selesai > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-atr-arti/15 px-1.5 py-0.5 text-atr-arti">
                                ✓ {counts.selesai}
                              </span>
                            )}
                            {counts.ontrack > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-atr-purple-50 px-1.5 py-0.5 text-atr-purple-600">
                                ⏱ {counts.ontrack}
                              </span>
                            )}
                            {counts.ditunda > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-atr-yellow/20 px-1.5 py-0.5 text-atr-fg">
                                ⏸ {counts.ditunda}
                              </span>
                            )}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="space-y-3 border-t border-atr-outline bg-atr-bg-soft/40 p-3">
                            {items.map((p) =>
                              editing === p.id ? (
                                <PlanForm
                                  key={p.id}
                                  desaOptions={desaOptions}
                                  initial={p}
                                  onCancel={() => setEditing(null)}
                                  onDone={() => {
                                    setEditing(null);
                                    router.refresh();
                                  }}
                                />
                              ) : (
                                <PlanCard
                                  key={p.id}
                                  p={p}
                                  canEdit={canEdit}
                                  pending={pending}
                                  onEdit={() => setEditing(p.id)}
                                  onDelete={() => remove(p.id)}
                                  showDesa={false}
                                />
                              ),
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })()
      ) : (
        <div className="space-y-3">
          {filtered.map((p) =>
            editing === p.id ? (
              <PlanForm
                key={p.id}
                desaOptions={desaOptions}
                initial={p}
                onCancel={() => setEditing(null)}
                onDone={() => {
                  setEditing(null);
                  router.refresh();
                }}
              />
            ) : (
              <PlanCard
                key={p.id}
                p={p}
                canEdit={canEdit}
                pending={pending}
                onEdit={() => setEditing(p.id)}
                onDelete={() => remove(p.id)}
                showDesa={false}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
        active
          ? "border-atr-purple bg-atr-purple-50 text-atr-purple-600"
          : "border-atr-outline bg-white text-atr-fg-muted hover:text-atr-fg"
      }`}
    >
      {label}
    </button>
  );
}

function PlanCard({
  p,
  canEdit,
  pending,
  onEdit,
  onDelete,
  showDesa,
}: {
  p: ActionPlanRow;
  canEdit: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  showDesa: boolean;
}) {
  const status = STATUSES.find((s) => s.key === p.status) ?? STATUSES[0];
  const StatusIcon = status.icon;
  const timeframe = TIMEFRAMES.find((t) => t.key === p.timeframe) ?? TIMEFRAMES[0];
  return (
    <article className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.color}`}
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {status.label}
            </span>
            <span className="inline-flex rounded-full border border-atr-outline bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
              {timeframe.label}
            </span>
            {showDesa && (
              <span className="text-[11px] text-atr-fg-muted">
                {p.desa_name} · {p.project_name}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-atr-fg">{p.title}</h3>
          {p.description && (
            <p className="text-xs text-atr-fg-muted">{p.description}</p>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <Detail label="Mulai" value={fmtDate(p.start_date)} />
            <Detail label="Selesai" value={fmtDate(p.end_date)} />
            <Detail
              label="Pihak terlibat"
              value={p.pihak_terlibat ?? "-"}
            />
            <Detail label="Output" value={p.output_target ?? "-"} />
          </div>
          <div className="text-[10px] text-atr-fg-muted">
            Dibuat {p.creator_name} ·{" "}
            {new Intl.DateTimeFormat("id-ID").format(new Date(p.created_at))}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {p.evidence_path && (
            <EvidenceViewButton evidencePath={p.evidence_path} />
          )}
          {canEdit && (
            <>
              <EvidenceUploadButton planId={p.id} hasEvidence={!!p.evidence_path} />
              <button
                type="button"
                onClick={onEdit}
                disabled={pending}
                className="rounded-md border border-atr-outline bg-white p-1.5 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg disabled:opacity-50"
                aria-label="Ubah"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="rounded-md border border-atr-outline bg-white p-1.5 text-atr-fg-muted hover:bg-atr-red/10 hover:text-atr-red disabled:opacity-50"
                aria-label="Hapus"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function EvidenceViewButton({ evidencePath }: { evidencePath: string }) {
  const [pending, startTransition] = useTransition();
  function open() {
    startTransition(async () => {
      const url = await getActionPlanEvidenceUrl(evidencePath);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else alert("Gagal membuka file evidence");
    });
  }
  return (
    <button
      type="button"
      onClick={open}
      disabled={pending}
      className="rounded-md border border-atr-arti/30 bg-atr-arti/10 p-1.5 text-atr-arti hover:bg-atr-arti/15 disabled:opacity-50"
      title="Lihat evidence"
      aria-label="Lihat evidence"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Paperclip className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function EvidenceUploadButton({
  planId,
  hasEvidence,
}: {
  planId: string;
  hasEvidence: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        resolve(r.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    startTransition(async () => {
      const r = await uploadActionPlanEvidence({
        action_plan_id: planId,
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        base64,
      });
      if (!r.error) router.refresh();
      else alert(r.error);
    });
  }
  return (
    <label
      className={`flex cursor-pointer items-center justify-center rounded-md border border-atr-outline bg-white p-1.5 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg ${
        pending ? "pointer-events-none opacity-50" : ""
      } ${hasEvidence ? "text-atr-arti" : ""}`}
      title={hasEvidence ? "Evidence sudah terlampir" : "Upload evidence"}
    >
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={onChange}
        className="hidden"
      />
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : hasEvidence ? (
        <Paperclip className="h-3.5 w-3.5" />
      ) : (
        <Upload className="h-3.5 w-3.5" />
      )}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
        {label}
      </div>
      <div className="mt-0.5 inline-flex items-center gap-1 text-atr-fg">
        {label === "Mulai" || label === "Selesai" ? (
          <Calendar className="h-3 w-3 text-atr-fg-muted" />
        ) : null}
        {value}
      </div>
    </div>
  );
}

function PlanForm({
  desaOptions,
  initial,
  onCancel,
  onDone,
}: {
  desaOptions: DesaOption[];
  initial?: ActionPlanRow;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [pd, setPd] = useState<string>(
    initial?.project_desa_id ?? desaOptions[0]?.project_desa_id ?? "",
  );
  const opt = desaOptions.find((d) => d.project_desa_id === pd);

  const [form, setForm] = useState({
    timeframe: (initial?.timeframe ?? "jangka_pendek") as
      | "jangka_pendek"
      | "jangka_menengah"
      | "jangka_panjang",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    pihak_terlibat: initial?.pihak_terlibat ?? "",
    output_target: initial?.output_target ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    status: (initial?.status ?? "rencana") as
      | "rencana"
      | "on_track"
      | "selesai"
      | "ditunda",
  });

  function save() {
    setErr(null);
    startTransition(async () => {
      if (initial) {
        const payload = {
          id: initial.id,
          timeframe: form.timeframe,
          title: form.title,
          description: form.description || null,
          pihak_terlibat: form.pihak_terlibat || null,
          output_target: form.output_target || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: form.status,
        };
        const r = await runOrQueue("action_plan_update", payload, () =>
          updateActionPlan(payload),
        );
        if (!isQueued(r) && r.error) setErr(r.error);
        else onDone();
      } else {
        if (!opt) return;
        const payload = {
          project_id: opt.project_id,
          project_desa_id: opt.project_desa_id,
          timeframe: form.timeframe,
          title: form.title,
          description: form.description || null,
          pihak_terlibat: form.pihak_terlibat || null,
          output_target: form.output_target || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: form.status,
        };
        const r = await runOrQueue("action_plan_create", payload, () =>
          createActionPlan(payload),
        );
        if (!isQueued(r) && r.error) setErr(r.error);
        else onDone();
      }
    });
  }

  return (
    <div className="rounded-2xl border-2 border-atr-purple/30 bg-atr-purple-50/40 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-atr-fg">
          {initial ? "Edit Rencana Aksi" : "Tambah Rencana Aksi"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-atr-fg-muted hover:bg-white hover:text-atr-fg"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!initial && (
        <div>
          <label className="block text-xs font-bold text-atr-fg">
            Desa <span className="text-atr-red">*</span>
          </label>
          <select
            value={pd}
            onChange={(e) => setPd(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
          >
            {desaOptions.map((d) => (
              <option key={d.project_desa_id} value={d.project_desa_id}>
                {d.desa_name} · {d.project_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-atr-fg">Timeframe</label>
          <select
            value={form.timeframe}
            onChange={(e) =>
              setForm({ ...form, timeframe: e.target.value as typeof form.timeframe })
            }
            className="mt-1 h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
          >
            {TIMEFRAMES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-atr-fg">Status</label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as typeof form.status })
            }
            className="mt-1 h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-atr-fg">
          Judul Rencana <span className="text-atr-red">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="cth: Membangun papan informasi desa"
          className="mt-1 h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-atr-fg">Deskripsi</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-md border border-atr-outline bg-white p-2 text-sm outline-none focus:border-atr-purple"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-atr-fg">
            Tgl Mulai
          </label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-atr-fg">
            Tgl Selesai
          </label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-atr-fg">
          Pihak yang Terlibat
        </label>
        <input
          type="text"
          value={form.pihak_terlibat}
          onChange={(e) =>
            setForm({ ...form, pihak_terlibat: e.target.value })
          }
          placeholder="cth: Pokdarwis, BUMDes, Karang Taruna"
          className="mt-1 h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-atr-fg">
          Output / Target
        </label>
        <input
          type="text"
          value={form.output_target}
          onChange={(e) =>
            setForm({ ...form, output_target: e.target.value })
          }
          placeholder="cth: 1 papan informasi dengan QR menu wisata"
          className="mt-1 h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple"
        />
      </div>

      {err && (
        <div className="rounded-md border border-atr-red/30 bg-atr-red/10 p-2 text-xs text-atr-red">
          {err}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending || !form.title.trim() || (!initial && !pd)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {initial ? "Update" : "Tambah"}
        </button>
      </div>
    </div>
  );
}
