"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import type { UserListRow } from "@/server/queries/users";

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
}: {
  users: UserListRow[];
  detailHrefBase?: string;
  // Override role filter dropdown — by default shows all 5 roles. Mitra passes
  // a restricted set so superadmin/mitra_admin aren't listed.
  roleFilterOptions?: Array<{ value: string; label: string }>;
}) {
  const data: Row[] = useMemo(
    () =>
      users.map((u) => ({
        ...u,
        organization_name: u.organization?.name ?? "-",
        role_label: ROLE_LABEL[u.global_role] ?? u.global_role,
      })),
    [users],
  );

  const columns: ColumnDef<Row, unknown>[] = useMemo(
    () => [
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
    ],
    [detailHrefBase],
  );

  const orgOptions = useMemo(() => {
    const set = new Set(data.map((r) => r.organization_name));
    return Array.from(set)
      .filter((s) => s !== "-")
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [data]);

  return (
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
          options: orgOptions,
        },
      ]}
    />
  );
}
