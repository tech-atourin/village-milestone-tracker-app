"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2, Mail } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import type { UserListRow } from "@/server/queries/users";
import {
  UserFormDialog,
  type UserFormInitial,
  type UserFormRole,
  type OrgOption,
} from "@/components/users/user-form-dialog";
import {
  deleteUser,
  bulkDeleteUsers,
  bulkResendCredentials,
} from "@/server/actions/users";

const ROLE_LABEL = {
  superadmin: "Superadmin",
  mitra_admin: "Mitra Admin",
  peserta: "Peserta",
  narasumber: "Narasumber",
  desa_wisata: "Desa Wisata",
} as const;

const ROLE_STYLE = {
  superadmin: "bg-atr-purple-light/60 text-atr-purple-800",
  mitra_admin: "bg-atr-purple-50 text-atr-purple-600",
  peserta: "bg-atr-arti/15 text-atr-arti",
  narasumber: "bg-atr-yellow/25 text-atr-fg",
  desa_wisata: "bg-atr-purple/15 text-atr-purple",
} as const;

type Row = UserListRow & {
  organization_name: string;
  role_label: string;
};

export function UsersTable({
  users,
  detailHrefBase = "/atourin/users",
  roleFilterOptions,
  orgOptions = [],
  allowedRoles,
}: {
  users: UserListRow[];
  detailHrefBase?: string;
  // Override role filter dropdown — by default shows all 5 roles. Mitra passes
  // a restricted set so superadmin/mitra_admin aren't listed.
  roleFilterOptions?: Array<{ value: string; label: string }>;
  // For the Edit dialog — orgs available + roles the actor is allowed to set
  orgOptions?: OrgOption[];
  allowedRoles?: ReadonlyArray<UserFormRole>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<UserFormInitial | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDelete] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState<null | "delete" | "resend">(
    null,
  );

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll(allIds: string[]) {
    setSelectedIds((prev) => {
      const everySelected = allIds.every((id) => prev.has(id));
      if (everySelected) {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Hapus ${ids.length} user terpilih?\n\nSemua user akan di-soft-delete dan tidak bisa login lagi.`,
      )
    )
      return;
    setBulkPending("delete");
    const r = await bulkDeleteUsers(ids);
    setBulkPending(null);
    setSelectedIds(new Set());
    if (r.failed.length > 0) {
      alert(
        `${r.ok} user dihapus. ${r.failed.length} gagal:\n${r.failed
          .map((f) => `- ${f.error}`)
          .join("\n")}`,
      );
    }
    router.refresh();
  }

  async function handleBulkResend() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Kirim ulang email login untuk ${ids.length} user terpilih?\n\nPassword akan di-reset (generate password baru) dan dikirim via email. Password lama tidak akan berlaku lagi.`,
      )
    )
      return;
    setBulkPending("resend");
    const r = await bulkResendCredentials(ids);
    setBulkPending(null);
    if (r.failed.length > 0) {
      alert(
        `${r.ok} email terkirim. ${r.failed.length} gagal:\n${r.failed
          .map((f) => `- ${f.error}`)
          .join("\n")}`,
      );
    } else {
      alert(`${r.ok} email login berhasil dikirim.`);
    }
    setSelectedIds(new Set());
  }

  function onEdit(u: UserListRow) {
    setEditing({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      global_role: u.global_role as UserFormRole,
      organization_id: u.organization?.id ?? null,
    });
  }

  function onDelete(u: UserListRow) {
    if (
      !confirm(
        `Hapus user "${u.full_name}"?\n\nUser di-soft-delete (data tetap di database, tapi tidak bisa login lagi).`,
      )
    )
      return;
    setDeletingId(u.id);
    startDelete(async () => {
      const r = await deleteUser(u.id);
      setDeletingId(null);
      if ("error" in r) {
        alert("Gagal hapus: " + r.error);
        return;
      }
      router.refresh();
    });
  }
  const data: Row[] = useMemo(
    () =>
      users.map((u) => ({
        ...u,
        organization_name: u.organization?.name ?? "-",
        role_label: ROLE_LABEL[u.global_role] ?? u.global_role,
      })),
    [users],
  );

  const allIds = useMemo(() => data.map((r) => r.id), [data]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  const columns: ColumnDef<Row, unknown>[] = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: () => (
          <input
            type="checkbox"
            aria-label="Pilih semua"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allSelected && someSelected;
            }}
            onChange={() => toggleAll(allIds)}
            className="h-4 w-4 cursor-pointer rounded border-atr-outline accent-atr-purple"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Pilih ${row.original.full_name}`}
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleOne(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 cursor-pointer rounded border-atr-outline accent-atr-purple"
          />
        ),
      },
      {
        accessorKey: "full_name",
        header: "Nama",
        cell: ({ row }) => (
          <Link
            href={`${detailHrefBase}/${row.original.id}`}
            className="font-bold text-atr-purple-600 hover:underline"
          >
            {row.original.full_name}
          </Link>
        ),
      },
      {
        id: "kontak",
        accessorFn: (r) => `${r.email ?? ""} ${r.phone ?? ""}`,
        header: "Kontak",
        cell: ({ row }) => (
          <div>
            <div className="text-atr-fg-muted">
              {row.original.email_artificial ? (
                <span className="text-xs italic">(no email)</span>
              ) : (
                row.original.email ?? "-"
              )}
            </div>
            {row.original.phone && (
              <div className="text-xs text-atr-fg-muted">
                {row.original.phone}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "global_role",
        header: "Role",
        cell: ({ getValue }) => {
          const r = getValue() as keyof typeof ROLE_LABEL;
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_STYLE[r] ?? "bg-atr-bg-soft text-atr-fg"}`}
            >
              {ROLE_LABEL[r] ?? r}
            </span>
          );
        },
      },
      {
        accessorKey: "organization_name",
        header: "Organisasi",
      },
      {
        accessorKey: "created_at",
        header: "Dibuat",
        cell: ({ getValue }) => (
          <span className="text-xs text-atr-fg-muted">
            {new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(getValue() as string))}
          </span>
        ),
      },
      {
        id: "aksi",
        header: "Aksi",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(row.original)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
              title="Edit profil"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(row.original)}
              disabled={deletingId === row.original.id}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-atr-red/30 bg-atr-red/5 text-atr-red transition hover:bg-atr-red/10 disabled:opacity-50"
              title="Hapus user"
            >
              {deletingId === row.original.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ),
      },
    ],
    [detailHrefBase, deletingId, selectedIds, allIds, allSelected, someSelected],
  );

  const orgFilterOptions = useMemo(() => {
    const set = new Set(data.map((r) => r.organization_name));
    return Array.from(set)
      .filter((s) => s !== "-")
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [data]);

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-atr-purple/30 bg-atr-purple-50 px-4 py-2.5">
          <span className="text-sm font-bold text-atr-purple-800">
            {selectedIds.size} user terpilih
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex h-8 items-center rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
            >
              Batal pilih
            </button>
            <button
              type="button"
              onClick={handleBulkResend}
              disabled={bulkPending !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft disabled:opacity-50"
              title="Reset password + kirim email login baru"
            >
              {bulkPending === "resend" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              Kirim ulang email
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkPending !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-atr-red/30 bg-atr-red/5 px-3 text-xs font-bold text-atr-red hover:bg-atr-red/10 disabled:opacity-50"
            >
              {bulkPending === "delete" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Hapus terpilih
            </button>
          </div>
        </div>
      )}
      <DataTable<Row>
        data={data}
        columns={columns}
        searchKeys={["full_name", "email", "phone", "organization_name"]}
        searchPlaceholder="Cari nama, email, HP, atau organisasi…"
        filters={[
          {
            key: "global_role",
            label: "Role",
            options:
              roleFilterOptions ??
              Object.entries(ROLE_LABEL).map(([v, l]) => ({
                value: v,
                label: l,
              })),
          },
          {
            key: "organization_name",
            label: "Organisasi",
            options: orgFilterOptions,
          },
        ]}
      />
      <UserFormDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        orgOptions={orgOptions}
        allowedRoles={allowedRoles}
        initialUser={editing}
      />
    </>
  );
}
