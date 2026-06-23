"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import type { ProjectScope } from "@/server/queries/pendampingan";
import { createSession } from "@/server/actions/pendampingan";

export function SesiBaruForm({ projects }: { projects: ProjectScope[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = projects.find((p) => p.id === projectId);
  const isDesaBased = (project?.program_type ?? "desa_based") === "desa_based";
  const [projectDesaId, setProjectDesaId] = useState(
    project?.desa[0]?.project_desa_id ?? "",
  );
  const [dayNumber, setDayNumber] = useState(1);
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [materi, setMateri] = useState("");

  function changeProject(id: string) {
    setProjectId(id);
    const p = projects.find((x) => x.id === id);
    const desaBased = (p?.program_type ?? "desa_based") === "desa_based";
    setProjectDesaId(desaBased ? p?.desa[0]?.project_desa_id ?? "" : "");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createSession({
        project_id: projectId,
        project_desa_id: isDesaBased ? projectDesaId : null,
        day_number: dayNumber,
        session_date: sessionDate,
        start_time: startTime || null,
        end_time: endTime || null,
        materi: materi || null,
      });
      if (r.error) setError(r.error);
      else if (r.id) router.push(`/narasumber/sesi/${r.id}`);
    });
  }

  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1 space-y-5">
      <Field label="Project" required>
        <select
          value={projectId}
          onChange={(e) => changeProject(e.target.value)}
          className={inputCls}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      {isDesaBased ? (
        <Field label="Desa yang dikunjungi" required>
          <select
            value={projectDesaId}
            onChange={(e) => setProjectDesaId(e.target.value)}
            className={inputCls}
          >
            {(project?.desa ?? []).map((d) => (
              <option key={d.project_desa_id} value={d.project_desa_id}>
                {d.desa_name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="rounded-lg border border-atr-purple/30 bg-atr-purple-50/40 px-3 py-2 text-xs text-atr-fg">
          Project ini bertipe <strong>Pelaku Pariwisata</strong> — sesi
          pendampingan langsung untuk seluruh peserta project, tidak per-desa.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Hari ke-" required>
          <select
            value={dayNumber}
            onChange={(e) => setDayNumber(Number(e.target.value))}
            className={inputCls}
          >
            {Array.from({
              length: project?.total_pendampingan_days ?? 5,
            }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Hari {i + 1}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tanggal" required>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Mulai">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Selesai">
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <Field label="Materi yang disampaikan" hint="Bisa diisi/edit nanti di detail sesi.">
        <textarea
          value={materi}
          onChange={(e) => setMateri(e.target.value)}
          rows={3}
          placeholder="Judul / poin-poin materi singkat..."
          className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-sm text-atr-red">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !projectDesaId}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-5 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Buat sesi
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-atr-fg">
        {label}
        {required && <span className="ml-1 text-atr-red">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-atr-fg-muted">{hint}</p>}
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";
