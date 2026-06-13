export const metadata = { title: "Templates" };

import Link from "next/link";
import { LayoutTemplate, Plus } from "lucide-react";
import { listTemplates } from "@/server/queries/projects";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Templates
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Template kurasi Atourin — dipakai saat membuat project baru.
            Project meng-snapshot topik+checklist saat dibuat, jadi edit
            template tidak mengubah project yang sudah jalan.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg-muted"
          title="Pembuatan template kustom hadir di iterasi berikut"
        >
          <Plus className="h-4 w-4" />
          Template baru
        </button>
      </header>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <LayoutTemplate className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">Belum ada template</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <article
              key={t.id}
              className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-bold text-atr-fg">
                    {t.name}
                  </h2>
                  {t.description && (
                    <p className="mt-1 line-clamp-3 text-xs text-atr-fg-muted">
                      {t.description}
                    </p>
                  )}
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-atr-bg-soft p-2.5">
                  <dt className="text-atr-fg-muted">Topik</dt>
                  <dd className="text-lg font-bold text-atr-fg">
                    {t.topik_count}
                  </dd>
                </div>
                <div className="rounded-lg bg-atr-bg-soft p-2.5">
                  <dt className="text-atr-fg-muted">Checklist</dt>
                  <dd className="text-lg font-bold text-atr-fg">
                    {t.checklist_count}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {Object.entries(t.default_modules)
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <span
                      key={k}
                      className="inline-flex rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-atr-purple"
                    >
                      {k.replace(/_/g, " ")}
                    </span>
                  ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/atourin/projects/new?template=${t.id}`}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-atr-purple px-3 text-xs font-bold text-white transition hover:bg-atr-purple-600"
                >
                  Gunakan template
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
