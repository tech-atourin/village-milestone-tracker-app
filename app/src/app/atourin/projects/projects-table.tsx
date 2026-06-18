"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import type { ProjectListRow } from "@/server/queries/projects";

const STATUS_STYLES: Record<ProjectListRow["status"], string> = {
  draft: "bg-atr-bg-soft text-atr-fg-muted",
  active: "bg-atr-arti/15 text-atr-arti",
  completed: "bg-atr-purple-light/50 text-atr-purple-600",
  archived: "bg-atr-bg-soft text-atr-fg-muted",
};

const STATUS_LABEL: Record<ProjectListRow["status"], string> = {
  draft: "Draft",
  active: "Aktif",
  completed: "Selesai",
  archived: "Arsip",
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type Row = ProjectListRow & {
  organization_name: string;
  template_name: string;
};

export function ProjectsTable({
  projects,
  scope = "atourin",
}: {
  projects: ProjectListRow[];
  scope?: "atourin" | "mitra";
}) {
  const data: Row[] = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        organization_name: p.organization?.name ?? "-",
        template_name: p.template?.name ?? "Blank",
      })),
    [projects],
  );

  const columns: ColumnDef<Row, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Nama",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/${scope}/projects/${row.original.id}`}
              className="font-bold text-atr-fg hover:text-atr-purple-600"
            >
              {row.original.name}
            </Link>
            {row.original.template && (
              <div className="mt-0.5 text-xs text-atr-fg-muted">
                {row.original.template.name}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "organization_name",
        header: "Mitra",
      },
      {
        accessorKey: "period_start",
        header: "Mulai",
        cell: ({ getValue }) => formatDate(getValue() as string | null),
        filterFn: (row, _columnId, filterValue) => {
          const range = filterValue as
            | [string | null, string | null]
            | undefined;
          if (!range) return true;
          const [from, to] = range;
          const ps = row.original.period_start;
          const pe = row.original.period_end;
          // Overlap check: project [ps, pe] intersects [from, to]
          if (from && pe && pe < from) return false;
          if (to && ps && ps > to) return false;
          // If both missing, fall back to including
          return true;
        },
      },
      {
        accessorKey: "period_end",
        header: "Selesai",
        cell: ({ getValue }) => formatDate(getValue() as string | null),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const s = getValue() as ProjectListRow["status"];
          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[s]}`}
            >
              {STATUS_LABEL[s]}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Aksi",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5">
            <Link
              href={`/${scope}/projects/${row.original.id}?tab=settings`}
              className="inline-flex h-8 items-center rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg-muted transition hover:bg-atr-bg-soft hover:text-atr-fg"
              title="Edit project"
            >
              Edit
            </Link>
            <Link
              href={`/${scope}/projects/${row.original.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-atr-purple-50 px-3 text-xs font-bold text-atr-purple-600 transition hover:bg-atr-purple/20"
            >
              Buka →
            </Link>
          </div>
        ),
      },
    ],
    [scope],
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
      searchKeys={["name", "organization_name", "template_name"]}
      searchPlaceholder="Cari nama project, mitra, atau template…"
      filters={[
        {
          key: "status",
          label: "Status",
          options: [
            { value: "draft", label: "Draft" },
            { value: "active", label: "Aktif" },
            { value: "completed", label: "Selesai" },
            { value: "archived", label: "Arsip" },
          ],
        },
        ...(scope === "atourin"
          ? ([
              {
                key: "organization_name" as const,
                label: "Mitra",
                options: orgOptions,
              },
            ] as const)
          : []),
        {
          key: "period_start",
          label: "Periode (range tanggal)",
          type: "dateRange",
        },
      ]}
    />
  );
}
