import { Users, MapPin, CalendarDays, ListChecks } from "lucide-react";
import { getProjectAnalytics } from "@/server/queries/project-analytics";
import { AnalyticsCharts } from "./analytics/charts";

/**
 * Renders the full analytics block (top stats + charts) for a project.
 * Used both on the standalone /analytics route and inline in the Overview tab.
 */
export async function AnalyticsSection({ projectId }: { projectId: string }) {
  const data = await getProjectAnalytics(projectId);
  return (
    <div className="space-y-6">
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
          hint={`${data.sessions_verified} verified · ${data.sessions_draft} draft`}
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
