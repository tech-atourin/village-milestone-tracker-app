"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import type { ProjectAnalytics } from "@/server/queries/project-analytics";
import { Award, TrendingUp, Sparkles, Star } from "lucide-react";

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

  // Per-topik checklist completion across desa. Checklist progress is owned
  // by the desa (peserta from the same desa share it), so values come from
  // averaging desa_topik_instance.completion_percent grouped by topik.
  const materiData = data.checklist_by_topik.map((m) => ({
    name: m.topik_name.length > 22 ? m.topik_name.slice(0, 22) + "…" : m.topik_name,
    full_name: m.topik_name,
    completion_pct: Math.round(m.completion_pct),
    desa_done: m.desa_done,
    desa_total: m.desa_total,
  }));

  // Rating distribution histogram (1..5 stars) — sourced from kuisioner.
  const ratingDist = (
    ["1", "2", "3", "4", "5"] as Array<"1" | "2" | "3" | "4" | "5">
  ).map((k) => ({
    star: `${k}★`,
    count: data.kuisioner.distribution[k],
  }));

  return (
    <div className="space-y-6">
      {/* Row: tier ladder + demografi donut */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tier ladder */}
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-atr-purple" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Klasifikasi Desa
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
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    cx="35%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    label={renderSliceCount}
                    labelLine={false}
                  >
                    {genderData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingLeft: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Materi radar + top narasumber side-by-side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-atr-purple" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Keberhasilan Checklist per Materi
            </h3>
          </header>
          {materiData.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-atr-fg-muted">
              Belum ada progress checklist desa.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[11px] text-atr-fg-muted">
                Rata-rata % checklist yang sudah dikerjakan tiap topik
                pendampingan, dihitung lintas desa. Checklist adalah milik
                desa — peserta dari desa yang sama berbagi progress.
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={materiData}
                    layout="vertical"
                    margin={{ top: 5, right: 40, bottom: 5, left: 5 }}
                  >
                    <CartesianGrid stroke="#E5E7EB" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={140}
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, _name: any, ctx: any) => {
                        const p = ctx?.payload;
                        return [
                          `${value}% · ${p?.desa_done ?? 0}/${p?.desa_total ?? 0} desa selesai`,
                          "Capaian",
                        ];
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      labelFormatter={(label: any, ctx: any) =>
                        ctx?.[0]?.payload?.full_name ?? label
                      }
                    />
                    <Bar
                      dataKey="completion_pct"
                      fill={PURPLE}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey="completion_pct"
                        position="right"
                        formatter={(v: number) => `${v}%`}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fill: "#374151",
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <Star className="h-4 w-4 fill-atr-yellow text-atr-yellow" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
                Kuisioner Kualitas Materi
              </h3>
            </div>
            {data.kuisioner.rating_count > 0 && (
              <span className="text-[11px] text-atr-fg-muted">
                Rata-rata{" "}
                <strong className="text-atr-fg">
                  ★ {data.kuisioner.avg_rating?.toFixed(2) ?? "—"}
                </strong>
              </span>
            )}
          </header>
          {data.rating_by_materi.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-atr-fg-muted">
              Belum ada penilaian peserta lewat kuisioner per materi.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.rating_by_materi.map((m) => ({
                    name:
                      m.topik_name.length > 22
                        ? m.topik_name.slice(0, 22) + "…"
                        : m.topik_name,
                    full_name: m.topik_name,
                    rating_rounded: Number(m.avg_rating.toFixed(2)),
                    rating_count: m.rating_count,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 40, bottom: 5, left: 5 }}
                >
                  <CartesianGrid stroke="#E5E7EB" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={140}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, _name: any, ctx: any) => {
                      const count = ctx?.payload?.rating_count ?? 0;
                      return [
                        `★ ${Number(value).toFixed(2)} (${count} penilaian)`,
                        "Rating",
                      ];
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(label: any, ctx: any) =>
                      ctx?.[0]?.payload?.full_name ?? label
                    }
                  />
                  <Bar
                    dataKey="rating_rounded"
                    fill={YELLOW}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="rating_rounded"
                      position="right"
                      formatter={(v: number) => `★ ${v.toFixed(1)}`}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fill: "#374151",
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Rating distribution + Pre/Post growth per materi, side-by-side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <Star className="h-4 w-4 fill-atr-yellow text-atr-yellow" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
                Sebaran Rating Kuisioner Narasumber
              </h3>
            </div>
            {data.kuisioner.rating_count > 0 && (
              <span className="text-[11px] text-atr-fg-muted">
                {data.kuisioner.rating_count} penilaian
              </span>
            )}
          </header>
          {data.kuisioner.rating_count === 0 ? (
            <p className="py-12 text-center text-sm italic text-atr-fg-muted">
              Belum ada peserta yang mengisi kuisioner narasumber.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ratingDist}
                  margin={{ top: 10, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="star" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value} penilaian`,
                      "Jumlah",
                    ]}
                  />
                  <Bar dataKey="count" fill={YELLOW} radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="count"
                      position="top"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fill: "#374151",
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
          <header className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-atr-arti" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-atr-fg">
              Pertumbuhan Pre &amp; Post Test per Materi
            </h3>
          </header>
          {data.test_growth_by_materi.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-atr-fg-muted">
              Belum ada hasil pre/post test per materi.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.test_growth_by_materi.map((m) => ({
                    name:
                      m.topik_name.length > 14
                        ? m.topik_name.slice(0, 14) + "…"
                        : m.topik_name,
                    full_name: m.topik_name,
                    pre: m.avg_pre != null ? Math.round(m.avg_pre) : 0,
                    post: m.avg_post != null ? Math.round(m.avg_post) : 0,
                    delta: m.delta != null ? Math.round(m.delta) : 0,
                  }))}
                  margin={{ top: 10, right: 20, bottom: 5, left: 5 }}
                >
                  <CartesianGrid stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(label: any, ctx: any) =>
                      ctx?.[0]?.payload?.full_name ?? label
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any, ctx: any) => {
                      if (name === "Δ") {
                        const d = ctx?.payload?.delta ?? 0;
                        return [`${d > 0 ? "+" : ""}${d} poin`, "Pertumbuhan"];
                      }
                      return [`${value} poin`, name];
                    }}
                  />
                  <Legend
                    iconType="square"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="pre"
                    name="Pre-test"
                    fill={MUTED}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="post"
                    name="Post-test"
                    fill={ARTI}
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="delta"
                      position="top"
                      formatter={(v: number) =>
                        v > 0 ? `+${v}` : v < 0 ? `${v}` : ""
                      }
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fill: "#3FB68B",
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

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
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Pie
                    data={apData}
                    dataKey="value"
                    nameKey="name"
                    cx="35%"
                    outerRadius={75}
                    label={renderSliceCount}
                    labelLine={false}
                  >
                    {apData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingLeft: 12 }}
                  />
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
                  <th className="px-3 py-2 text-right">Checklist</th>
                  <th className="px-3 py-2 text-right">Rencana Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atr-outline">
                {data.top_desa.map((d) => (
                  <tr key={d.desa_id}>
                    <td className="px-3 py-2 font-bold text-atr-fg">
                      {d.desa_name}
                    </td>
                    <td className="px-3 py-2 text-right text-atr-fg-muted">
                      {d.peserta_count}
                    </td>
                    <td className="px-3 py-2 text-right text-atr-fg-muted">
                      {d.sessions_done}
                    </td>
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
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-atr-bg-soft">
                          <div
                            className="h-full bg-atr-arti"
                            style={{ width: `${d.action_plans_pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-atr-fg">
                          {d.action_plans_total > 0
                            ? `${d.action_plans_pct}% (${d.action_plans_done}/${d.action_plans_total})`
                            : "—"}
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

      {/* Klasifikasi desa (V1 ADWI / V2 Atourin) intentionally NOT shown
          here. Project pendampingan is conceptually separate from desa
          classification — those results live on the desa's own profil page
          and at /atourin/klasifikasi. What carries over from project →
          classification is the project checklist evidence, which is
          auto-linkable to desa V1 criteria (no re-upload needed). */}
    </div>
  );
}

// Render count INSIDE the slice (radial midpoint). Hides labels for
// zero-value slices so we don't draw stray "0" markers in empty space.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSliceCount(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
  if (!value) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 12, fontWeight: 700 }}
    >
      {value}
    </text>
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
