"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from "recharts";
import type { ProjectAnalytics } from "@/server/queries/project-analytics";
import { Award, TrendingUp, Sparkles } from "lucide-react";

const PURPLE = "#7068D5";
const PURPLE_LIGHT = "#A7A1ED";
const YELLOW = "#FFC442";
const ARTI = "#3FB68B";
const RED = "#E45B5B";
const MUTED = "#9CA3AF";

const TIER_ORDER = ["rintisan", "berkembang", "maju", "mandiri"] as const;
const TIER_LABEL = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
  unclassified: "Belum Klasifikasi",
} as const;
const TIER_COLOR = {
  rintisan: "#FFC442",
  berkembang: "#3FB68B",
  maju: "#7068D5",
  mandiri: "#5A52B3",
  unclassified: "#D1D5DB",
} as const;

const STATUS_COLOR_AP = {
  rencana: MUTED,
  on_track: PURPLE_LIGHT,
  selesai: ARTI,
  ditunda: YELLOW,
} as const;

export function AnalyticsCharts({ data }: { data: ProjectAnalytics }) {
  const genderData = [
    { name: "Laki-laki", value: data.peserta_gender.L, color: PURPLE },
    { name: "Perempuan", value: data.peserta_gender.P, color: YELLOW },
    ...(data.peserta_gender.unknown > 0
      ? [{ name: "Tidak diketahui", value: data.peserta_gender.unknown, color: MUTED }]
      : []),
  ];

  const apData = (
    Object.entries(data.action_plans_by_status) as Array<
      [keyof typeof STATUS_COLOR_AP, number]
    >
  ).map(([k, v]) => ({
    name:
      k === "rencana"
        ? "Rencana"
        : k === "on_track"
          ? "On Track"
          : k === "selesai"
            ? "Selesai"
            : "Ditunda",
    value: v,
    color: STATUS_COLOR_AP[k],
  }));

  const materiData = data.materi_by_kompetensi
    .slice(0, 8)
    .map((m) => ({ kompetensi: m.kompetensi.slice(0, 20), sessions: m.sessions }));

  return (
    <div className="space-y-6">
      {/* Row: tier ladder + demografi donut */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tier ladder */}
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-atr-purple" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Klasifikasi Desa (Tier Ladder)
            </h3>
          </header>
          <div className="space-y-2">
            {TIER_ORDER.map((tier) => {
              const count = data.desa_by_tier[tier];
              const pct = data.desa_total > 0 ? (count / data.desa_total) * 100 : 0;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-atr-fg">{TIER_LABEL[tier]}</span>
                    <span className="text-atr-fg-muted">
                      {count} {count === 1 ? "desa" : "desa"} ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-atr-bg-soft">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: TIER_COLOR[tier],
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {data.desa_by_tier.unclassified > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-atr-fg-muted">
                    {TIER_LABEL.unclassified}
                  </span>
                  <span className="text-atr-fg-muted">
                    {data.desa_by_tier.unclassified} desa
                  </span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-atr-bg-soft">
                  <div
                    className="h-full bg-atr-fg-muted opacity-30"
                    style={{
                      width: `${(data.desa_by_tier.unclassified / Math.max(1, data.desa_total)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Demografi peserta */}
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-atr-purple" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Demografi Peserta
            </h3>
          </header>
          {data.peserta_total === 0 ? (
            <p className="py-12 text-center text-sm italic text-atr-fg-muted">
              Belum ada peserta di project ini.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label
                  >
                    {genderData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Materi radar */}
      <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
        <header className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-atr-purple" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
            Distribusi Materi Pendampingan (per Kompetensi Narasumber)
          </h3>
        </header>
        {materiData.length < 3 ? (
          <p className="py-12 text-center text-sm italic text-atr-fg-muted">
            Belum cukup sesi pendampingan untuk visualisasi radar (butuh ≥3
            kategori).
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={materiData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="kompetensi" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar
                  name="Sesi"
                  dataKey="sessions"
                  stroke={PURPLE}
                  fill={PURPLE}
                  fillOpacity={0.35}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Rencana aksi + sesi status */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Status Rencana Aksi
            </h3>
          </header>
          {data.action_plans_total === 0 ? (
            <p className="py-12 text-center text-sm italic text-atr-fg-muted">
              Belum ada rencana aksi.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={apData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    label
                  >
                    {apData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Status Sesi Pendampingan
            </h3>
          </header>
          <div className="space-y-3">
            <SesiBar label="Verified" value={data.sessions_verified} total={data.sessions_total} color={ARTI} />
            <SesiBar label="Submitted" value={data.sessions_submitted} total={data.sessions_total} color={YELLOW} />
            <SesiBar label="Draft" value={data.sessions_draft} total={data.sessions_total} color={MUTED} />
          </div>
          <div className="mt-5 rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-xs text-atr-fg-muted">
            Rata-rata kehadiran peserta:{" "}
            <strong className="text-atr-fg">{data.attendance_avg_pct}%</strong>
          </div>
        </section>
      </div>

      {/* Top desa */}
      {data.top_desa.length > 0 && (
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Top 5 Desa berdasarkan Progress Checklist
            </h3>
          </header>
          <div className="overflow-hidden rounded-lg border border-atr-outline">
            <table className="w-full text-sm">
              <thead className="bg-atr-bg-soft text-left text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
                <tr>
                  <th className="px-3 py-2">Desa</th>
                  <th className="px-3 py-2 text-right">Peserta</th>
                  <th className="px-3 py-2 text-right">Sesi</th>
                  <th className="px-3 py-2 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atr-outline">
                {data.top_desa.map((d) => (
                  <tr key={d.desa_id}>
                    <td className="px-3 py-2 font-bold text-atr-fg">{d.desa_name}</td>
                    <td className="px-3 py-2 text-right text-atr-fg-muted">{d.peserta_count}</td>
                    <td className="px-3 py-2 text-right text-atr-fg-muted">{d.sessions_done}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-atr-bg-soft">
                          <div
                            className="h-full bg-atr-purple"
                            style={{ width: `${d.completion_pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-atr-fg">
                          {Math.round(d.completion_pct)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Hub assessment results */}
      {data.hub_assessment_results.length > 0 && (
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Hasil Self-Assessment Hub (Versi 2)
            </h3>
          </header>
          <ul className="space-y-2">
            {data.hub_assessment_results.map((r) => (
              <li
                key={r.desa_id}
                className="flex items-center justify-between rounded-lg border border-atr-outline bg-atr-bg-soft p-3 text-sm"
              >
                <div>
                  <div className="font-bold text-atr-fg">{r.desa_name}</div>
                  <div className="text-[11px] text-atr-fg-muted">Status: {r.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-atr-fg">
                    {r.skor_total ?? "—"}%
                  </span>
                  {r.level_hasil && (
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{
                        backgroundColor: `${PURPLE}20`,
                        color: PURPLE,
                      }}
                    >
                      {r.level_hasil}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SesiBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-atr-fg">{label}</span>
        <span className="text-atr-fg-muted">{value}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-atr-bg-soft">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
