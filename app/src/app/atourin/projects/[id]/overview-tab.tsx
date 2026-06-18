import {
  Layers,
  ListChecks,
  MapPin,
  Users,
  GraduationCap,
  CalendarDays,
  ClipboardList,
  Star,
} from "lucide-react";
import { getProjectAnalytics } from "@/server/queries/project-analytics";
import { AnalyticsCharts } from "./analytics/charts";

type Project = {
  topik_count: number;
  checklist_count: number;
};

/**
 * Overview is the project's at-a-glance home. It merges the project-shape
 * stats (topik / checklist items) with the live analytics (peserta,
 * narasumber, sesi, rencana aksi, kuisioner) into ONE grid so nothing is
 * duplicated. The Deskripsi/Modul cards live in Settings now.
 */
export async function OverviewTab({
  project,
  projectId,
}: {
  project: Project;
  projectId: string;
}) {
  const data = await getProjectAnalytics(projectId);

  const stats: Array<{
    label: string;
    value: number | string;
    hint?: string;
    icon: React.ComponentType<{ className?: string }>;
    tint: string;
    iconTint: string;
  }> = [
    {
      label: "Topik",
      value: project.topik_count,
      hint: "modul pendampingan",
      icon: Layers,
      tint: "bg-atr-purple-50",
      iconTint: "text-atr-purple-600",
    },
    {
      label: "Checklist Items",
      value: project.checklist_count,
      hint: "total task per desa",
      icon: ListChecks,
      tint: "bg-atr-arti/10",
      iconTint: "text-atr-arti",
    },
    {
      label: "Desa",
      value: data.desa_total,
      hint:
        data.hub_assessment_results.length > 0
          ? `${data.hub_assessment_results.length} sudah self-assessment`
          : "belum ada self-assessment",
      icon: MapPin,
      tint: "bg-atr-yellow/20",
      iconTint: "text-atr-fg",
    },
    {
      label: "Peserta",
      value: data.peserta_total,
      hint:
        data.peserta_total > 0
          ? `${data.peserta_gender.L} L · ${data.peserta_gender.P} P`
          : "belum ada peserta",
      icon: Users,
      tint: "bg-atr-purple-light/50",
      iconTint: "text-atr-purple-800",
    },
    {
      label: "Narasumber",
      value: data.narasumber_count,
      hint:
        data.narasumber_kompetensi_count > 0
          ? `${data.narasumber_kompetensi_count} kompetensi tercakup`
          : "belum ada narasumber",
      icon: GraduationCap,
      tint: "bg-atr-yellow/30",
      iconTint: "text-atr-fg",
    },
    {
      label: "Sesi Pendampingan",
      value: data.sessions_total,
      hint:
        data.sessions_total > 0
          ? `${data.sessions_verified} verified · ${data.sessions_draft} draft`
          : "belum ada sesi",
      icon: CalendarDays,
      tint: "bg-atr-purple-50",
      iconTint: "text-atr-purple-600",
    },
    {
      label: "Rencana Aksi",
      value: data.action_plans_total,
      hint:
        data.action_plans_total > 0
          ? `${data.action_plans_by_status.selesai} selesai`
          : "belum ada rencana aksi",
      icon: ClipboardList,
      tint: "bg-atr-arti/10",
      iconTint: "text-atr-arti",
    },
    {
      label: "Kuisioner Narasumber",
      value:
        data.kuisioner.avg_rating != null
          ? `★ ${data.kuisioner.avg_rating.toFixed(2)}`
          : "-",
      hint:
        data.kuisioner.rating_count > 0
          ? `${data.kuisioner.rating_count} penilaian peserta`
          : "belum diisi peserta",
      icon: Star,
      tint: "bg-atr-yellow/30",
      iconTint: "text-atr-fg",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <article
              key={s.label}
              className="flex items-center gap-3 rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.tint}`}
              >
                <Icon className={`h-5 w-5 ${s.iconTint}`} />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold leading-none text-atr-fg">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-atr-fg-muted">
                  {s.label}
                </div>
                {s.hint && (
                  <div className="mt-0.5 text-[10px] text-atr-fg-muted">
                    {s.hint}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <AnalyticsCharts data={data} />
    </div>
  );
}
