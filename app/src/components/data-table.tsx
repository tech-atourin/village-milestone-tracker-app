"use client";

import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ListFilter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type DataTableFilter<T> = {
  key: keyof T & string;
  label: string;
  options: { value: string; label: string }[];
};

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Columns included in the global search (case-insensitive ilike). */
  searchKeys?: (keyof T & string)[];
  /** Quick-filter chip rows displayed above the table. */
  filters?: DataTableFilter<T>[];
  /** Page size for client-side pagination. Defaults to 25. */
  pageSize?: number;
  /** Empty-state node. */
  emptyState?: React.ReactNode;
  /** Search input placeholder. */
  searchPlaceholder?: string;
}

export function DataTable<T>({
  columns,
  data,
  searchKeys,
  filters,
  pageSize = 25,
  emptyState,
  searchPlaceholder = "Cari…",
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Custom global filter — case-insensitive contains across searchKeys.
  const globalFilterFn = useMemo(
    () => (row: { original: T }, _columnId: string, value: string) => {
      if (!value) return true;
      const q = value.toString().toLowerCase();
      if (!searchKeys || searchKeys.length === 0) {
        return JSON.stringify(row.original).toLowerCase().includes(q);
      }
      for (const k of searchKeys) {
        const v = (row.original as Record<string, unknown>)[k];
        if (v == null) continue;
        if (String(v).toLowerCase().includes(q)) return true;
      }
      return false;
    },
    [searchKeys],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const activeFilterCount =
    columnFilters.filter((f) => f.value !== "" && f.value != null).length +
    (globalFilter ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-atr-fg-muted" />
            <input
              type="search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-lg border border-atr-outline bg-white pl-10 pr-3 text-sm outline-none transition focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </div>

          {filters && filters.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterDrawerOpen((s) => !s)}
              className={`relative inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold transition ${
                filterDrawerOpen || activeFilterCount > 0
                  ? "border-atr-purple bg-atr-purple-50 text-atr-purple-600"
                  : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
              }`}
            >
              <ListFilter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-atr-purple px-1.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {(activeFilterCount > 0 || sorting.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setGlobalFilter("");
                setColumnFilters([]);
                setSorting([]);
              }}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg-muted transition hover:bg-atr-bg-soft"
              title="Reset semua filter & sort"
            >
              <X className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        <div className="text-xs text-atr-fg-muted">
          {table.getFilteredRowModel().rows.length} dari {data.length} baris
        </div>
      </div>

      {/* Filter chips drawer */}
      {filterDrawerOpen && filters && filters.length > 0 && (
        <div className="grid gap-3 rounded-2xl border border-atr-outline bg-atr-bg-soft p-4 sm:grid-cols-2 lg:grid-cols-3">
          {filters.map((f) => {
            const column = table.getColumn(f.key);
            if (!column) return null;
            const value = (column.getFilterValue() as string) ?? "";
            return (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-atr-fg">{f.label}</span>
                <select
                  value={value}
                  onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                  className="h-9 rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                >
                  <option value="">Semua</option>
                  {f.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-atr-bg-soft">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const canSort = h.column.getCanSort();
                    const sorted = h.column.getIsSorted();
                    return (
                      <th
                        key={h.id}
                        className="border-b border-atr-outline px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted"
                      >
                        {canSort ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 transition hover:text-atr-fg"
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {sorted === "asc" ? (
                              <ChevronUp className="h-3 w-3 text-atr-purple" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="h-3 w-3 text-atr-purple" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 text-atr-fg-muted/60" />
                            )}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-atr-outline text-sm">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.getAllLeafColumns().length}
                    className="px-5 py-16 text-center"
                  >
                    {emptyState ?? (
                      <p className="text-sm text-atr-fg-muted">
                        Tidak ada data yang cocok.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-atr-bg-soft">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-3 text-atr-fg">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between border-t border-atr-outline bg-atr-bg-soft px-5 py-3 text-xs">
            <span className="text-atr-fg-muted">
              Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
              {table.getPageCount()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="inline-flex h-8 items-center justify-center rounded-md border border-atr-outline bg-white px-2 font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="inline-flex h-8 items-center justify-center rounded-md border border-atr-outline bg-white px-2 font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
