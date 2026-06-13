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
  if (!iso) return "—";
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
        organization_name: p.organization?.name ?? "—",
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
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`/${scope}/projects/${row.original.id}`}
            className="text-sm font-bold text-atr-purple hover:text-atr-purple-600"
          >
            Buka →
          </Link>
        ),
      },
    ],
    [scope],
  );

  const orgOptions = useMemo(() => {
    const set = new Set(data.map((r) => r.organization_name));
    return Array.from(set)
      .filter((s) => s !== "—")
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
        {
          key: "organization_name",
          label: "Mitra",
          options: orgOptions,
        },
      ]}
    />
  );
}
