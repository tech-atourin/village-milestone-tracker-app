"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

export type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  note: string;
};

const ACTION_STYLE: Record<string, string> = {
  "checklist.approved": "bg-atr-arti/15 text-atr-arti",
  "checklist.rejected": "bg-atr-red/15 text-atr-red",
  "project.created": "bg-atr-purple-50 text-atr-purple-600",
  "user.bulk_imported": "bg-atr-yellow/25 text-atr-fg",
};

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const columns: ColumnDef<AuditRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "created_at",
        header: "Waktu",
        cell: ({ getValue }) => (
          <span className="text-xs text-atr-fg-muted">
            {new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(getValue() as string))}
          </span>
        ),
      },
      {
        accessorKey: "action",
        header: "Aksi",
        cell: ({ getValue }) => {
          const a = getValue() as string;
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${ACTION_STYLE[a] ?? "bg-atr-bg-soft text-atr-fg"}`}
            >
              {a}
            </span>
          );
        },
      },
      {
        accessorKey: "entity_type",
        header: "Entity",
        cell: ({ row }) => (
          <div className="text-xs text-atr-fg-muted">
            {row.original.entity_type}
            {row.original.entity_id && (
              <div className="font-mono text-[10px]">
                {row.original.entity_id.slice(0, 8)}…
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "actor_name",
        header: "Aktor",
        cell: ({ getValue }) => (
          <span className="text-atr-fg-muted">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "note",
        header: "Catatan",
        cell: ({ getValue }) => (
          <span className="line-clamp-2 max-w-md text-xs text-atr-fg-muted">
            {(getValue() as string) || ""}
          </span>
        ),
      },
    ],
    [],
  );

  const actionOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action));
    return Array.from(set)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [rows]);

  const entityOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.entity_type));
    return Array.from(set)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [rows]);

  return (
    <DataTable<AuditRow>
      data={rows}
      columns={columns}
      searchKeys={["action", "actor_name", "entity_type", "note"]}
      searchPlaceholder="Cari aksi, aktor, atau catatan…"
      filters={[
        { key: "action", label: "Aksi", options: actionOptions },
        { key: "entity_type", label: "Entity", options: entityOptions },
      ]}
      pageSize={50}
    />
  );
}
