export const metadata = { title: "Project Saya" };

import Link from "next/link";
import { Folder, MapPin, CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { listNarasumberProjects } from "@/server/queries/pendampingan";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NarasumberProjectsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const projects = await listNarasumberProjects(user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Project Saya
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Project pendampingan dimana Anda diassign sebagai narasumber.
        </p>
      </header>

      {projects.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="Belum di-assign ke project apapun"
          description="Admin Atourin akan menambahkan Anda ke project ketika ada kebutuhan."
        />
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-atr-fg">{p.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-atr-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {p.desa.length} desa
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {p.total_pendampingan_days} hari pendampingan
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.desa.map((d) => (
                      <span
                        key={d.project_desa_id}
                        className="inline-flex rounded-full border border-atr-outline bg-atr-bg-soft px-2 py-0.5 text-[11px] text-atr-fg"
                      >
                        {d.desa_name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-end gap-2 sm:flex-row">
                  <Link
                    href={`/narasumber/projects/${p.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                  >
                    <Folder className="h-3.5 w-3.5" />
                    Buka Detail
                  </Link>
                  <Link
                    href={`/narasumber/projects/${p.id}/review`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-atr-outline bg-white px-3 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                  >
                    Review bukti
                  </Link>
                  <Link
                    href={`/narasumber/sesi/baru?project=${p.id}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-atr-purple px-3 text-xs font-bold text-white hover:bg-atr-purple-600"
                  >
                    Catat sesi
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
