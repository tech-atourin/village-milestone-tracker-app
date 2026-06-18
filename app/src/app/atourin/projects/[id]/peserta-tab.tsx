"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Loader2, Users as UsersIcon, X, GraduationCap } from "lucide-react";
import {
  addProjectMember,
  removeProjectMember,
} from "@/server/actions/memberships";
import type { ProjectMemberRow } from "@/server/queries/memberships";
import type { UserListRow } from "@/server/queries/users";
import type { ProjectDesaRow } from "@/server/queries/desa";
import { PesertaBulkImportButton } from "./peserta-bulk-import";

// Peserta tab handles ONLY participants. Narasumber is managed in its own
// tab so we can show per-desa assignments + rating summaries there.

export function PesertaTab({
  projectId,
  members,
  candidates,
  desa,
  raporBasePath = "/atourin",
}: {
  projectId: string;
  members: ProjectMemberRow[];
  candidates: UserListRow[];
  desa: ProjectDesaRow[];
  raporBasePath?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [selUser, setSelUser] = useState<string | null>(null);
  const [selDesa, setSelDesa] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Guard against rows whose embedded user couldn't be read (RLS) — never crash.
  // Also restrict the displayed list to actual peserta — narasumber lives in
  // its own tab now.
  const safeMembers = members.filter((m) => m.user && m.role === "peserta");
  const memberUserIds = new Set(
    safeMembers.filter((m) => m.status === "active").map((m) => m.user.id),
  );
  // Autocomplete: only suggest users whose global_role is "peserta" and who
  // aren't already on the project. Hide everything until the user types.
  const filtered = q
    ? candidates
        .filter((u) => u.global_role === "peserta")
        .filter((u) => !memberUserIds.has(u.id))
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
    startTransition(async () => {
      const r = await addProjectMember({
        project_id: projectId,
        user_id: selUser,
        role: "peserta",
        desa_id: selDesa || null,
      });
      if (r.error) setError(r.error);
      else {
        setShowAdd(false);
        setSelUser(null);
        setSelDesa("");
        setQ("");
        router.refresh();
      }
    });
  }

  function remove(membershipId: string) {
    if (!confirm("Hapus anggota dari project?")) return;
    startTransition(async () => {
      await removeProjectMember({ membership_id: membershipId, project_id: projectId });
      router.refresh();
    });
  }

  const activeMembers = safeMembers.filter((m) => m.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-atr-fg">
            Peserta project
          </h3>
          <p className="text-sm text-atr-fg-muted">
            {activeMembers.length} peserta aktif
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PesertaBulkImportButton projectId={projectId} />
          <button
            type="button"
            onClick={() => setShowAdd((s) => !s)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600"
          >
            <Plus className="h-4 w-4" />
            Tambah Peserta
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-atr-purple/30 bg-atr-purple-50/50 px-3.5 py-2.5 text-xs text-atr-fg">
        💡 <strong>Peserta itu perorangan.</strong> Satu desa wisata bisa
        diwakili banyak peserta (pengurus Pokdarwis, BUMDes, narahubung).
        Tambahkan masing-masing dengan role <em>peserta</em> + pilih desa yang
        sama untuk kolaborasi pendampingan.
      </div>

      {showAdd && (
        <div className="space-y-3 rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
          <input
            type="search"
            placeholder="Cari peserta (nama atau email)…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelUser(null);
            }}
            autoFocus
            className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />

          <ul className="max-h-48 divide-y divide-atr-outline overflow-y-auto rounded-lg border border-atr-outline">
            {!q ? (
              <li className="p-4 text-center text-xs text-atr-fg-muted">
                Ketik minimal 1 huruf untuk mencari peserta dari database
                user.
              </li>
            ) : filtered.length === 0 ? (
              <li className="p-4 text-center text-xs text-atr-fg-muted">
                Tidak ada peserta cocok. Buat dulu lewat Users → Bulk Import.
              </li>
            ) : (
              filtered.map((u) => (
                <li
                  key={u.id}
                  className={`flex items-center justify-between gap-2 p-3 ${
                    selUser === u.id ? "bg-atr-purple-50" : "hover:bg-atr-bg-soft"
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

          {selUser && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-atr-fg">
                Desa diwakili
              </span>
              <select
                value={selDesa}
                onChange={(e) => setSelDesa(e.target.value)}
                className="h-10 rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
              >
                <option value="">Pilih desa…</option>
                {desa.map((p) => (
                  <option key={p.desa.id} value={p.desa.id}>
                    {p.desa.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && (
            <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
              {error}
            </div>
          )}

          <div className="flex gap-2">
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
              disabled={pending || !selUser || !selDesa}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Tambahkan
            </button>
          </div>
        </div>
      )}

      {activeMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <UsersIcon className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">Belum ada peserta</p>
        </div>
      ) : (
        <MembersTable
          projectId={projectId}
          members={activeMembers}
          onRemove={remove}
          raporBasePath={raporBasePath}
        />
      )}
    </div>
  );
}

import { DataTable as MembersDataTable } from "@/components/data-table";
import type { ColumnDef as MembersColumnDef } from "@tanstack/react-table";

function MembersTable({
  projectId,
  members,
  onRemove,
  raporBasePath = "/atourin",
}: {
  projectId: string;
  members: ProjectMemberRow[];
  onRemove: (id: string) => void;
  raporBasePath?: string;
}) {
  const rows = members.map((m) => ({
    ...m,
    full_name: m.user.full_name,
    email: m.user.email ?? "",
    desa_name: m.desa?.name ?? "—",
  }));
  type Row = (typeof rows)[number];

  const desaOptions = Array.from(
    new Set(rows.map((r) => r.desa_name).filter((n) => n && n !== "—")),
  ).map((n) => ({ value: n, label: n }));

  const columns: MembersColumnDef<Row, unknown>[] = [
    {
      accessorKey: "full_name",
      header: "Nama",
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-atr-fg">{row.original.full_name}</div>
          <div className="text-xs text-atr-fg-muted">{row.original.email}</div>
        </div>
      ),
    },
    { accessorKey: "desa_name", header: "Desa" },
    {
      accessorKey: "invited_at",
      header: "Diundang",
      cell: ({ getValue }) => {
        const raw = getValue() as string | null;
        const d = raw ? new Date(raw) : null;
        const valid = d && !Number.isNaN(d.getTime());
        return (
          <span className="text-xs text-atr-fg-muted">
            {valid
              ? new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(d)
              : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1.5">
          <Link
            href={`${raporBasePath}/projects/${projectId}/rapor/${row.original.user.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-atr-purple/40 bg-atr-purple-50 px-2 text-xs font-bold text-atr-purple-600 transition hover:bg-atr-purple-light/40"
            title="Lihat rapor peserta (printable)"
          >
            <GraduationCap className="h-3 w-3" />
            Rapor
          </Link>
          <button
            type="button"
            onClick={() => onRemove(row.original.id)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-xs font-bold text-atr-fg-muted transition hover:border-atr-red/30 hover:text-atr-red"
          >
            <X className="h-3 w-3" />
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <MembersDataTable<Row>
      data={rows}
      columns={columns}
      searchKeys={["full_name", "email", "desa_name"]}
      searchPlaceholder="Cari nama, email, atau desa…"
      filters={
        desaOptions.length > 0
          ? [{ key: "desa_name", label: "Desa", options: desaOptions }]
          : []
      }
    />
  );
}
