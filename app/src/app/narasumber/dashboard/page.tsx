export const metadata = { title: "Dashboard Narasumber" };

import Link from "next/link";
import {
  CalendarDays,
  Folder,
  MapPin,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/rbac";
import {
  listNarasumberSessions,
  listNarasumberProjects,
} from "@/server/queries/pendampingan";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-atr-bg-soft text-atr-fg-muted",
  submitted: "bg-atr-yellow/20 text-atr-fg",
  verified: "bg-atr-arti/15 text-atr-arti",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  verified: "Verified",
};

function fmtDate(s: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(s));
}

export default async function NarasumberDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [sessions, projects] = await Promise.all([
    listNarasumberSessions(user.id),
    listNarasumberProjects(user.id),
  ]);

  const totalDesa = projects.reduce((acc, p) => acc + p.desa.length, 0);
  const submitted = sessions.filter((s) => s.status !== "draft").length;
  const draft = sessions.filter((s) => s.status === "draft").length;
  const upcoming = sessions
    .filter((s) => new Date(s.session_date) >= new Date())
    .slice(0, 5);
  const recent = sessions
    .filter((s) => new Date(s.session_date) < new Date())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Halo, {user.full_name} 👋
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Ringkasan project pendampingan dan sesi-sesi yang Anda pimpin.
        </p>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Folder} label="Project" value={projects.length} />
        <Stat icon={MapPin} label="Desa Mentor-an" value={totalDesa} />
        <Stat icon={CheckCircle2} label="Sesi Selesai" value={submitted} />
        <Stat icon={Clock} label="Draft" value={draft} />
      </div>

      {/* CTA: catat sesi */}
      <section className="flex flex-col items-start gap-3 rounded-2xl border border-atr-purple/20 bg-gradient-to-br from-atr-purple-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-atr-fg">
            Catat sesi pendampingan baru
          </h2>
          <p className="mt-0.5 text-sm text-atr-fg-muted">
            Pilih project & desa, masukkan tanggal kunjungan, tandai
            kehadiran peserta.
          </p>
        </div>
        <Link
          href="/narasumber/sesi/baru"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
        >
          <Plus className="h-4 w-4" />
          Sesi Baru
        </Link>
      </section>

      {/* Upcoming */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            Sesi Mendatang
          </h2>
          <Link
            href="/narasumber/sesi"
            className="text-xs font-bold text-atr-purple-600 hover:text-atr-purple"
          >
            Lihat semua →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            variant="compact"
            title="Belum ada sesi terjadwal"
            description="Mulai catat sesi pendampingan dari tombol di atas."
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <SessionItem key={s.id} s={s} />
            ))}
          </ul>
        )}
      </section>

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-atr-fg-muted">
            Sesi Terakhir
          </h2>
          <ul className="space-y-2">
            {recent.map((s) => (
              <SessionItem key={s.id} s={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 text-atr-fg-muted" />
      </div>
      <div className="mt-2 text-3xl font-bold text-atr-fg">{value}</div>
    </div>
  );
}

function SessionItem({
  s,
}: {
  s: {
    id: string;
    project_name: string;
    desa_name: string;
    day_number: number;
    session_date: string;
    status: string;
    materi: string | null;
  };
}) {
  return (
    <li className="overflow-hidden rounded-xl border border-atr-outline bg-white">
      <Link
        href={`/narasumber/sesi/${s.id}`}
        className="flex items-start gap-3 p-4 transition hover:bg-atr-bg-soft"
      >
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-atr-purple-50 text-atr-purple">
          <div className="text-[9px] font-bold uppercase">Hari</div>
          <div className="text-sm font-bold leading-none">{s.day_number}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-atr-fg truncate">{s.desa_name}</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[s.status]}`}
            >
              {STATUS_LABEL[s.status]}
            </span>
          </div>
          <div className="text-xs text-atr-fg-muted">
            {s.project_name} · {fmtDate(s.session_date)}
          </div>
          {s.materi && (
            <div className="mt-1 line-clamp-1 flex items-center gap-1 text-xs text-atr-fg-muted">
              <FileText className="h-3 w-3 shrink-0" />
              {s.materi}
            </div>
          )}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-atr-fg-muted" />
      </Link>
    </li>
  );
}
