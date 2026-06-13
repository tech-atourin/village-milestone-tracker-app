"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import type { ProjectDesaRow } from "@/server/queries/desa";

export function MitraDesaTable({ attached }: { attached: ProjectDesaRow[] }) {
  const rows = useMemo(
    () =>
      attached.map((p) => ({
        ...p,
        desa_name: p.desa.name,
        location:
          [p.desa.kabupaten, p.desa.provinsi].filter(Boolean).join(" · ") ||
          "—",
        progress: p.topik_summary.avg_pct,
      })),
    [attached],
  );
  type Row = (typeof rows)[number];

  const columns: ColumnDef<Row, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "desa_name",
        header: "Desa",
        cell: ({ getValue }) => (
          <span className="font-bold text-atr-fg">{getValue() as string}</span>
        ),
      },
      { accessorKey: "location", header: "Lokasi" },
      {
        accessorKey: "progress",
        header: "Progress",
        cell: ({ getValue }) => {
          const v = Math.round(getValue() as number);
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-atr-bg-soft">
                <div
                  className="h-full bg-atr-purple"
                  style={{ width: `${v}%` }}
                />
              </div>
              <span className="text-xs text-atr-fg-muted">{v}%</span>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <DataTable<Row>
      data={rows}
      columns={columns}
      searchKeys={["desa_name", "location"]}
      searchPlaceholder="Cari nama desa atau lokasi…"
    />
  );
}
