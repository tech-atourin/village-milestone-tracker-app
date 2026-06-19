export const metadata = { title: "Analytics Project" };

import Link from "next/link";
import { ArrowLeft, Users, MapPin, CalendarDays, ListChecks } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { getProjectAnalytics } from "@/server/queries/project-analytics";
import { AnalyticsCharts } from "./charts";

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole("superadmin");
  const data = await getProjectAnalytics(params.id);

  return (
    <div className="space-y-6">
      <Link
        href={`/atourin/projects/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke project
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Analytics · {data.project.name}
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Ringkasan demografi, klasifikasi desa, materi pendampingan, dan
          progress rencana aksi.
        </p>
      </header>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="Peserta"
          value={data.peserta_total}
          hint={`${data.peserta_gender.L} L · ${data.peserta_gender.P} P`}
        />
        <Stat
          icon={MapPin}
          label="Desa Mentor-an"
          value={data.desa_total}
          hint={`${data.hub_assessment_results.length} sudah self-assessment`}
        />
        <Stat
          icon={CalendarDays}
          label="Sesi Pendampingan"
          value={data.sessions_total}
          hint={`${data.sessions_submitted + data.sessions_verified} submitted · ${data.sessions_draft} draft`}
        />
        <Stat
          icon={ListChecks}
          label="Rencana Aksi"
          value={data.action_plans_total}
          hint={`${data.action_plans_by_status.selesai} selesai`}
        />
      </div>

      <AnalyticsCharts data={data} />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
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
      {hint && <div className="mt-1 text-[11px] text-atr-fg-muted">{hint}</div>}
    </div>
  );
}
