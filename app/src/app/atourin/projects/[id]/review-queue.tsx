"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  Loader2,
  FileText,
  ClipboardCheck,
  MessageCircle,
  Search,
} from "lucide-react";
import {
  reviewChecklistItem,
  bulkReviewChecklistItems,
} from "@/server/actions/review";
import type { ReviewQueueItem } from "@/server/queries/review";
import { CountBadge } from "@/components/ui/count-badge";
import { ChecklistDiscussion } from "@/components/checklist/checklist-discussion";

export function ReviewQueue({
  projectId,
  items: allItems,
  filterTopikId,
  filterDesaId,
  currentUserId,
}: {
  projectId: string;
  items: ReviewQueueItem[];
  filterTopikId?: string;
  filterDesaId?: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [desaFilter, setDesaFilter] = useState<string>("");

  // Build desa options from the unfiltered list so the dropdown always
  // shows every desa even after a search narrows the queue.
  const desaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of allItems) {
      if (it.project_desa_id) map.set(it.project_desa_id, it.desa.name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems]);

  // Server-side filter chips arrive via URL; surface them as visible chips
  // so the reviewer can clear them.
  const items = allItems.filter((it) => {
    if (filterTopikId && it.topik.id !== filterTopikId) return false;
    if (filterDesaId && it.project_desa_id !== filterDesaId) return false;
    if (desaFilter && it.project_desa_id !== desaFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${it.checklist_item.title} ${it.topik.name} ${it.desa.name} ${
        it.submitted_by?.full_name ?? ""
      }`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeFilter = filterTopikId || filterDesaId;
  const filteredTopikName = filterTopikId
    ? allItems.find((it) => it.topik.id === filterTopikId)?.topik.name
    : null;
  const filteredDesaName = filterDesaId
    ? allItems.find((it) => it.project_desa_id === filterDesaId)?.desa.name
    : null;

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.checklist_progress_id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulk(decision: "approved" | "rejected") {
    if (selected.size === 0) return;
    if (
      !confirm(
        `${decision === "approved" ? "Approve" : "Reject"} ${selected.size} item sekaligus?`,
      )
    )
      return;
    startTransition(async () => {
      const r = await bulkReviewChecklistItems({
        ids: Array.from(selected),
        decision,
        note: null,
        project_id: projectId,
      });
      if (r.error) alert(r.error);
      else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function decide(id: string, decision: "approved" | "rejected") {
    if (decision === "rejected" && note.trim().length === 0) {
      alert("Tambahkan catatan untuk reject. Peserta perlu tahu apa yang harus diperbaiki.");
      return;
    }
    startTransition(async () => {
      const r = await reviewChecklistItem({
        checklist_progress_id: id,
        decision,
        note: note.trim() || null,
        project_id: projectId,
      });
      if (r.error) alert(r.error);
      else {
        setExpanded(null);
        setNote("");
        router.refresh();
      }
    });
  }

  if (allItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-arti/15">
          <ClipboardCheck className="h-5 w-5 text-atr-arti" />
        </div>
        <p className="text-sm font-bold text-atr-fg">
          Review queue kosong
        </p>
        <p className="mt-1 text-sm text-atr-fg-muted">
          Semua submission sudah direview.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-atr-purple/30 bg-atr-purple-50/40 p-3 text-xs">
          <span className="font-bold text-atr-fg">Difilter ke:</span>
          {filteredTopikName && (
            <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-bold text-atr-purple-600">
              Topik: {filteredTopikName}
            </span>
          )}
          {filteredDesaName && (
            <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-bold text-atr-purple-600">
              Desa: {filteredDesaName}
            </span>
          )}
          <a
            href={`?tab=evidence`}
            className="ml-auto text-atr-purple-600 hover:underline"
          >
            Lihat semua
          </a>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-atr-fg">
            Review queue
          </h3>
          <p className="text-sm text-atr-fg-muted">
            {items.length} item menunggu review
            {selected.size > 0 && (
              <> · <span className="font-bold text-atr-purple">{selected.size} dipilih</span></>
            )}
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => bulk("rejected")}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-red/30 bg-white px-3 text-sm font-bold text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Reject {selected.size}
            </button>
            <button
              type="button"
              onClick={() => bulk("approved")}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-arti px-3 text-sm font-bold text-white transition hover:bg-atr-arti/90 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve {selected.size}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari checklist, topik, desa, atau peserta…"
            className="h-10 w-full rounded-lg border border-atr-outline bg-white pl-10 pr-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
        {desaOptions.length > 1 && (
          <select
            value={desaFilter}
            onChange={(e) => setDesaFilter(e.target.value)}
            aria-label="Filter desa"
            className={`h-10 rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15 ${
              desaFilter
                ? "border-atr-purple/50 text-atr-fg"
                : "border-atr-outline text-atr-fg-muted"
            }`}
          >
            <option value="">Desa: Semua</option>
            {desaOptions.map((o) => (
              <option key={o.id} value={o.id}>
                Desa: {o.name}
              </option>
            ))}
          </select>
        )}
        {(search || desaFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setDesaFilter("");
            }}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg-muted transition hover:bg-atr-bg-soft"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-atr-outline bg-atr-bg-soft px-3 py-2 text-xs text-atr-fg-muted">
        <input
          type="checkbox"
          checked={selected.size === items.length && items.length > 0}
          onChange={toggleAll}
          className="h-3.5 w-3.5 accent-atr-purple"
        />
        Pilih semua
        <CountBadge n={items.length} />
      </label>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-10 text-center text-sm text-atr-fg-muted">
          Tidak ada item yang cocok dengan pencarian/filter ini.
        </div>
      ) : null}

      <ul className="space-y-3">
        {items.map((item) => {
          const isOpen = expanded === item.checklist_progress_id;
          const isSelected = selected.has(item.checklist_progress_id);
          return (
            <li
              key={item.checklist_progress_id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-atr-1 ${
                isSelected ? "border-atr-purple/40 ring-2 ring-atr-purple/15" : "border-atr-outline"
              }`}
            >
              <div className="flex items-start gap-3 p-5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(item.checklist_progress_id)}
                  className="mt-2 h-4 w-4 shrink-0 accent-atr-purple"
                  aria-label="Pilih item"
                />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-atr-yellow/20 text-atr-fg">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-atr-fg">
                      {item.checklist_item.title}
                    </span>
                    <span className="inline-flex rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-atr-purple">
                      {item.topik.name}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-atr-fg-muted">
                    Desa {item.desa.name} ·{" "}
                    {item.submitted_by?.full_name ?? "-"} ·{" "}
                    {item.submitted_at
                      ? new Intl.DateTimeFormat("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(item.submitted_at))
                      : "-"}
                    {item.evidence_count > 0 && (
                      <>
                        {" · "}
                        <span className="font-bold text-atr-purple-600">
                          {item.evidence_count} evidence
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(isOpen ? null : item.checklist_progress_id)
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg transition hover:bg-atr-bg-soft"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {isOpen ? "Tutup" : "Review"}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="space-y-3 border-t border-atr-outline bg-atr-bg-soft p-5">
                  {item.checklist_item.description && (
                    <div className="rounded-lg bg-white p-3 text-xs text-atr-fg-muted">
                      <span className="font-bold text-atr-fg">Panduan: </span>
                      {item.checklist_item.description}
                    </div>
                  )}
                  <ChecklistDiscussion
                    checklistProgressId={item.checklist_progress_id}
                    currentUserId={currentUserId}
                  />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-atr-fg">
                      Catatan review (wajib jika reject)
                    </span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="Tulis feedback yang membantu peserta…"
                      className="w-full rounded-lg border border-atr-outline bg-white p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    />
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        decide(item.checklist_progress_id, "rejected")
                      }
                      disabled={pending}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-atr-red/30 bg-white px-3 text-sm font-bold text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        decide(item.checklist_progress_id, "approved")
                      }
                      disabled={pending}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-atr-arti px-3 text-sm font-bold text-white transition hover:bg-atr-arti/90 disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
