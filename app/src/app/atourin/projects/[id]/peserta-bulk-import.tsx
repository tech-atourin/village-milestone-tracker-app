"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { BulkImportFlow } from "@/app/atourin/users/bulk-import/bulk-import-flow";

/**
 * Bulk-import peserta directly into a project. Reuses the shared
 * BulkImportFlow with projectId set, so created/existing users are
 * attached as project members (desa resolved from the desa_name column).
 * Works for superadmin and the project's mitra_admin.
 */
export function PesertaBulkImportButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
      >
        <Upload className="h-4 w-4" />
        Bulk Import
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-atr-fg/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="my-8 w-full max-w-3xl rounded-2xl border border-atr-outline bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-atr-fg">
                  Bulk Import Peserta ke Project
                </h2>
                <p className="text-xs text-atr-fg-muted">
                  Upload Excel berisi puluhan/ratusan peserta. Mereka langsung
                  dilampirkan ke project ini. Kolom <code>desa_name</code> akan
                  dicocokkan dengan desa yang sudah ada di project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <BulkImportFlow
              mode="peserta"
              projectId={projectId}
              onDone={() => router.refresh()}
            />
          </div>
        </div>
      )}
    </>
  );
}
