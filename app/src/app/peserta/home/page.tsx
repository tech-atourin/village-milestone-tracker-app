import Link from "next/link";
import { ChevronRight, MapPin, ClipboardList } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { listPesertaProjectDesa } from "@/server/queries/peserta";

export default async function PesertaHomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const projects = await listPesertaProjectDesa(user.id);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Halo, {user.full_name} 👋
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Pilih project di bawah untuk lanjut isi checklist. Progress di-share
          dengan peserta lain dari desa yang sama.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <ClipboardList className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">
            Belum ada project aktif
          </p>
          <p className="mt-1 text-xs text-atr-fg-muted">
            Admin Atourin atau mitra akan menambahkan Anda ke project. Cek lagi
            nanti.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li
              key={p.project_desa_id}
              className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1"
            >
              <Link
                href={`/peserta/projects/${p.project_desa_id}`}
                className="block transition hover:bg-atr-bg-soft"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-atr-fg">
                      {p.desa.name}
                    </div>
                    <div className="text-xs text-atr-fg-muted">
                      {p.project.name}
                    </div>
                    {(p.desa.kabupaten || p.desa.provinsi) && (
                      <div className="mt-0.5 text-[11px] text-atr-fg-muted">
                        {[p.desa.kabupaten, p.desa.provinsi]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-atr-fg-muted" />
                </div>
                <div className="border-t border-atr-outline bg-atr-bg-soft px-4 py-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-atr-fg-muted">
                      Progress pendampingan
                    </span>
                    <span className="font-bold text-atr-fg">
                      {Math.round(p.progress.overall_pct)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full bg-atr-purple transition-all"
                      style={{ width: `${Math.round(p.progress.overall_pct)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-atr-fg-muted">
                    {p.progress.approved_items} / {p.progress.total_items}{" "}
                    checklist disetujui
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
