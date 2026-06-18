"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Loader2,
  X,
  Star,
  GraduationCap,
  MapPin,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  addProjectMember,
  removeProjectMember,
  setNarasumberDesa,
} from "@/server/actions/memberships";
import type { UserListRow } from "@/server/queries/users";

export type NarasumberAssignment = {
  membership_id: string | null;
  user: { id: string; full_name: string; email: string | null };
  desa: Array<{ id: string; name: string }>;
  assigned_desa_ids: string[];
  sessions_count: number;
  avg_rating: number | null;
  rating_count: number;
};

export type ProjectDesaOption = { id: string; name: string };

export function NarasumberTab({
  projectId,
  assignments,
  candidates,
  narasumberDetailBase,
  projectDesa,
}: {
  projectId: string;
  assignments: NarasumberAssignment[];
  candidates: UserListRow[];
  narasumberDetailBase: "/atourin/narasumber" | "/mitra/narasumber";
  projectDesa: ProjectDesaOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [selUser, setSelUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [desaFilter, setDesaFilter] = useState("");
  const [editing, setEditing] = useState<NarasumberAssignment | null>(null);

  const desaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of assignments) {
      for (const d of a.desa) map.set(d.id, d.name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments]);

  const visibleAssignments = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return assignments.filter((a) => {
      if (desaFilter && !a.desa.some((d) => d.id === desaFilter)) return false;
      if (!q) return true;
      const hay = `${a.user.full_name} ${a.user.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [assignments, listSearch, desaFilter]);

  const memberIds = new Set(assignments.map((a) => a.user.id));
  const filtered = q
    ? candidates
        .filter((u) => u.global_role === "narasumber")
        .filter((u) => !memberIds.has(u.id))
        .filter(
          (u) =>
            u.full_name.toLowerCase().includes(q.toLowerCase()) ||
            (u.email ?? "").toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 30)
    : [];

  function add() {
    if (!selUser) return;
    setError(null);
    const candidate = candidates.find((c) => c.id === selUser);
    if (!candidate) return;
    setShowAdd(false);
    setQ("");
    // Open the Pilih Desa dialog so admin assigns desa right away.
    // Pass an "empty assignment" so dialog starts unchecked.
    setEditing({
      membership_id: null,
      user: {
        id: candidate.id,
        full_name: candidate.full_name,
        email: candidate.email ?? null,
      },
      desa: [],
      assigned_desa_ids: [],
      sessions_count: 0,
      avg_rating: null,
      rating_count: 0,
    });
    setSelUser(null);
  }
  void addProjectMember; // kept for other call sites; narasumber now uses setNarasumberDesa

  function remove(membershipId: string | null) {
    if (!membershipId) return;
    if (
      !confirm(
        "Lepas narasumber ini dari project? Riwayat sesi & rating tetap tersimpan.",
      )
    )
      return;
    startTransition(async () => {
      await removeProjectMember({
        membership_id: membershipId,
        project_id: projectId,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-atr-fg">
            Narasumber project
          </h3>
          <p className="text-sm text-atr-fg-muted">
            {assignments.length} narasumber terdaftar
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          <Plus className="h-4 w-4" />
          Tambah Narasumber
        </button>
      </div>

      {showAdd && (
        <div className="space-y-3 rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
            <input
              type="search"
              placeholder="Cari narasumber (nama atau email)…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSelUser(null);
              }}
              autoFocus
              className="h-10 w-full rounded-lg border border-atr-outline pl-10 pr-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </div>
          <ul className="max-h-48 divide-y divide-atr-outline overflow-y-auto rounded-lg border border-atr-outline">
            {!q ? (
              <li className="p-4 text-center text-xs text-atr-fg-muted">
                Ketik minimal 1 huruf untuk mencari narasumber dari database.
              </li>
            ) : filtered.length === 0 ? (
              <li className="p-4 text-center text-xs text-atr-fg-muted">
                Tidak ada narasumber cocok. Tambahkan dulu lewat menu
                Narasumber → Bulk Import.
              </li>
            ) : (
              filtered.map((u) => (
                <li
                  key={u.id}
                  className={`flex items-center justify-between gap-2 p-3 ${
                    selUser === u.id
                      ? "bg-atr-purple-50"
                      : "hover:bg-atr-bg-soft"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-atr-fg">
                      {u.full_name}
                    </div>
                    <div className="truncate text-xs text-atr-fg-muted">
                      {u.email_artificial ? "(no email)" : u.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelUser(u.id)}
                    className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-bold transition ${
                      selUser === u.id
                        ? "bg-atr-purple text-white"
                        : "border border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
                    }`}
                  >
                    {selUser === u.id ? "Dipilih" : "Pilih"}
                  </button>
                </li>
              ))
            )}
          </ul>
          {error && (
            <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setSelUser(null);
                setError(null);
              }}
              className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={add}
              disabled={pending || !selUser}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Tambahkan
            </button>
          </div>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <GraduationCap className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">Belum ada narasumber</p>
          <p className="mt-1 text-xs text-atr-fg-muted">
            Tambahkan narasumber agar bisa dijadwalkan sesi pendampingan.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
              <input
                type="search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Cari nama atau email narasumber…"
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
            {(listSearch || desaFilter) && (
              <button
                type="button"
                onClick={() => {
                  setListSearch("");
                  setDesaFilter("");
                }}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg-muted transition hover:bg-atr-bg-soft"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>

          {visibleAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-10 text-center text-sm text-atr-fg-muted">
              Tidak ada narasumber yang cocok dengan filter ini.
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleAssignments.map((a) => (
            <article
              key={a.user.id}
              className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-yellow/30 text-atr-fg">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`${narasumberDetailBase}/${a.user.id}?from=${encodeURIComponent(
                      `${narasumberDetailBase === "/atourin/narasumber" ? "/atourin" : "/mitra"}/projects/${projectId}?tab=narasumber`,
                    )}`}
                    className="inline-flex items-center gap-1 text-sm font-bold text-atr-fg hover:text-atr-purple-600"
                  >
                    {a.user.full_name}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                  <div className="truncate text-[11px] text-atr-fg-muted">
                    {a.user.email ?? "-"}
                  </div>
                </div>
                {a.membership_id && (
                  <button
                    type="button"
                    onClick={() => remove(a.membership_id)}
                    title="Lepas dari project"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted transition hover:border-atr-red/30 hover:text-atr-red"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-atr-bg-soft px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-atr-yellow text-atr-yellow" />
                  <span className="font-bold text-atr-fg">
                    {a.avg_rating != null ? a.avg_rating.toFixed(2) : "-"}
                  </span>
                  <span className="text-atr-fg-muted">
                    ({a.rating_count} kuisioner)
                  </span>
                </div>
                <span className="text-atr-fg-muted">
                  {a.sessions_count} sesi
                </span>
              </div>

              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
                    Mendampingi
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.assigned_desa_ids.length > 0 ? (
                      a.assigned_desa_ids.map((id) => {
                        const d = projectDesa.find((x) => x.id === id);
                        if (!d) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold text-atr-purple-600"
                          >
                            <MapPin className="h-2.5 w-2.5" />
                            {d.name}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[11px] italic text-atr-fg-muted">
                        Belum di-assign ke desa manapun di project ini.
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="inline-flex h-7 shrink-0 items-center rounded-md border border-atr-outline bg-white px-2 text-[11px] font-bold text-atr-fg hover:bg-atr-bg-soft"
                >
                  Pilih Desa
                </button>
              </div>
            </article>
          ))}
          </div>
        </>
      )}

      {editing && (
        <AssignDesaDialog
          projectId={projectId}
          assignment={editing}
          projectDesa={projectDesa}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AssignDesaDialog({
  projectId,
  assignment,
  projectDesa,
  onClose,
}: {
  projectId: string;
  assignment: NarasumberAssignment;
  projectDesa: ProjectDesaOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(assignment.assigned_desa_ids),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await setNarasumberDesa({
        project_id: projectId,
        user_id: assignment.user.id,
        desa_ids: Array.from(selected),
      });
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-atr-fg/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-atr-outline bg-white p-5 shadow-2xl">
        <header className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-atr-fg">
              Pilih desa yang didampingi
            </h2>
            <p className="text-xs text-atr-fg-muted">{assignment.user.full_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <p className="mb-3 text-[11px] text-atr-fg-muted">
          Centang desa-desa yang akan didampingi narasumber ini. Kalau dikosongkan
          semua, narasumber dilepas dari project ini.
        </p>
        {projectDesa.length === 0 ? (
          <p className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-4 text-center text-xs italic text-atr-fg-muted">
            Project belum punya desa. Tambahkan desa di tab Desa dulu.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {projectDesa.map((d) => {
              const on = selected.has(d.id);
              return (
                <li key={d.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-atr-outline px-3 py-2 hover:bg-atr-bg-soft">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(d.id)}
                      className="h-4 w-4 accent-atr-purple"
                    />
                    <span className="text-sm text-atr-fg">{d.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
            {error}
          </div>
        )}
        <footer className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Simpan
          </button>
        </footer>
      </div>
    </div>
  );
}
