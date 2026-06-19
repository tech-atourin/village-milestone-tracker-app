export const metadata = { title: "Sesi Pendampingan" };

import Link from "next/link";
import { Plus, CalendarDays, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import { listNarasumberSessions } from "@/server/queries/pendampingan";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-atr-bg-soft text-atr-fg-muted",
  submitted: "bg-atr-arti/15 text-atr-arti",
  verified: "bg-atr-arti/15 text-atr-arti",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  verified: "Submitted",
};

function fmtDate(s: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(s));
}

export default async function SesiListPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const sessions = await listNarasumberSessions(user.id);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Sesi Pendampingan
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Semua sesi yang Anda pimpin (draft + sudah disubmit).
          </p>
        </div>
        <Link
          href="/narasumber/sesi/baru"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          <Plus className="h-4 w-4" />
          Sesi Baru
        </Link>
      </header>

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Belum ada sesi pendampingan"
          description="Mulai catat sesi pertama dengan tombol di atas."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-atr-outline bg-white shadow-atr-1">
          <table className="w-full text-sm">
            <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Hari</th>
                <th className="px-4 py-3">Desa</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Materi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-atr-outline">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-atr-bg-soft">
                  <td className="px-4 py-3 font-bold text-atr-fg">
                    {fmtDate(s.session_date)}
                  </td>
                  <td className="px-4 py-3 text-atr-fg-muted">
                    Hari {s.day_number}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/narasumber/sesi/${s.id}`}
                      className="font-bold text-atr-purple-600 hover:text-atr-purple"
                    >
                      {s.desa_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-atr-fg-muted">
                    {s.project_name}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-xs text-atr-fg">
                    <span
                      className="block truncate"
                      title={s.materi ?? undefined}
                    >
                      {s.materi
                        ? s.materi.length > 70
                          ? s.materi.slice(0, 70) + "…"
                          : s.materi
                        : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[s.status]}`}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/narasumber/sesi/${s.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2.5 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
                      title="Edit sesi"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
