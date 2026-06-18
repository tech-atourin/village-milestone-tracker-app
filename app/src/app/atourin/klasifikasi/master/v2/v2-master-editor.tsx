"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { updateHubTemplate } from "@/server/actions/klasifikasi-master";

type QType = "single" | "multi" | "slider" | "text";

type Question = {
  id: string;
  type: QType;
  label: string;
  weight: number;
  options?: string[];
  min?: number;
  max?: number;
};

type Pillar = {
  key: string;
  title: string;
  questions: Question[];
};

type Definisi = { pillars: Pillar[] };

function asDefinisi(input: unknown): Definisi {
  if (
    input &&
    typeof input === "object" &&
    Array.isArray((input as { pillars?: unknown }).pillars)
  ) {
    return input as Definisi;
  }
  return { pillars: [] };
}

const TYPE_LABEL: Record<QType, string> = {
  single: "Pilihan tunggal",
  multi: "Pilihan ganda",
  slider: "Skala (slider)",
  text: "Teks bebas",
};

export function V2MasterEditor({
  template,
}: {
  template: {
    id: string;
    name: string;
    versi: string;
    description: string | null;
    definisi: unknown;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(template.name);
  const [versi, setVersi] = useState(template.versi);
  const [description, setDescription] = useState(template.description ?? "");
  const [pillars, setPillars] = useState<Pillar[]>(
    asDefinisi(template.definisi).pillars,
  );
  const [openPillars, setOpenPillars] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function togglePillar(key: string) {
    setOpenPillars((p) => ({ ...p, [key]: !p[key] }));
  }

  function updatePillar(idx: number, patch: Partial<Pillar>) {
    setPillars((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    setSaved(false);
  }
  function removePillar(idx: number) {
    if (!confirm(`Hapus pillar "${pillars[idx]?.title}"?`)) return;
    setPillars((arr) => arr.filter((_, i) => i !== idx));
    setSaved(false);
  }
  function addPillar() {
    const newKey = `pillar_${Date.now().toString(36)}`;
    setPillars((arr) => [
      ...arr,
      { key: newKey, title: "Pillar Baru", questions: [] },
    ]);
    setOpenPillars((p) => ({ ...p, [newKey]: true }));
    setSaved(false);
  }

  function updateQuestion(
    pIdx: number,
    qIdx: number,
    patch: Partial<Question>,
  ) {
    setPillars((arr) =>
      arr.map((p, i) =>
        i === pIdx
          ? {
              ...p,
              questions: p.questions.map((q, j) =>
                j === qIdx ? { ...q, ...patch } : q,
              ),
            }
          : p,
      ),
    );
    setSaved(false);
  }
  function removeQuestion(pIdx: number, qIdx: number) {
    if (!confirm("Hapus pertanyaan ini?")) return;
    setPillars((arr) =>
      arr.map((p, i) =>
        i === pIdx
          ? { ...p, questions: p.questions.filter((_, j) => j !== qIdx) }
          : p,
      ),
    );
    setSaved(false);
  }
  function addQuestion(pIdx: number) {
    const newId = `q_${Date.now().toString(36)}`;
    setPillars((arr) =>
      arr.map((p, i) =>
        i === pIdx
          ? {
              ...p,
              questions: [
                ...p.questions,
                {
                  id: newId,
                  type: "single",
                  label: "Pertanyaan baru",
                  weight: 1,
                  options: ["Belum sama sekali", "Sebagian", "Sudah penuh"],
                },
              ],
            }
          : p,
      ),
    );
    setSaved(false);
  }

  function save() {
    setSaved(false);
    // Validation
    const ids = new Set<string>();
    for (const p of pillars) {
      if (!p.key.trim() || !p.title.trim()) {
        setError("Setiap pillar wajib punya key dan title.");
        return;
      }
      for (const q of p.questions) {
        if (!q.id.trim() || !q.label.trim()) {
          setError(`Pillar "${p.title}": ada pertanyaan tanpa id atau label.`);
          return;
        }
        if (ids.has(q.id)) {
          setError(`ID pertanyaan duplikat: "${q.id}". Harus unik.`);
          return;
        }
        ids.add(q.id);
        if ((q.type === "single" || q.type === "multi") && (!q.options || q.options.length === 0)) {
          setError(`Pertanyaan "${q.label}" tipe ${q.type} butuh minimal 1 pilihan.`);
          return;
        }
        if (q.type === "slider" && (q.min == null || q.max == null || q.max <= q.min)) {
          setError(`Pertanyaan "${q.label}" tipe slider butuh min < max.`);
          return;
        }
      }
    }
    setError(null);
    startTransition(async () => {
      const r = await updateHubTemplate({
        id: template.id,
        name: name.trim(),
        versi: versi.trim(),
        description: description.trim() || null,
        definisi: { pillars },
      });
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-atr-purple">
          Metadata Template
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Nama template">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Versi">
            <input
              type="text"
              value={versi}
              onChange={(e) => {
                setVersi(e.target.value);
                setSaved(false);
              }}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Deskripsi">
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              className={INPUT_CLS}
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-atr-purple">
          Pillar &amp; Pertanyaan
        </h2>
        <button
          type="button"
          onClick={addPillar}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-purple/40 bg-atr-purple-50 px-3 text-sm font-bold text-atr-purple-600 hover:bg-atr-purple-light/40"
        >
          <Plus className="h-4 w-4" />
          Tambah Pillar
        </button>
      </div>

      {pillars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center text-sm text-atr-fg-muted">
          Belum ada pillar. Klik &quot;Tambah Pillar&quot; untuk mulai.
        </div>
      ) : (
        <div className="space-y-3">
          {pillars.map((p, pIdx) => (
            <PillarCard
              key={p.key + pIdx}
              pillar={p}
              open={openPillars[p.key] ?? true}
              onToggle={() => togglePillar(p.key)}
              onChange={(patch) => updatePillar(pIdx, patch)}
              onRemove={() => removePillar(pIdx)}
              onAddQuestion={() => addQuestion(pIdx)}
              onQuestionChange={(qIdx, patch) =>
                updateQuestion(pIdx, qIdx, patch)
              }
              onQuestionRemove={(qIdx) => removeQuestion(pIdx, qIdx)}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {saved && !error && (
        <div className="flex items-center gap-2 rounded-lg border border-atr-arti/30 bg-atr-arti/10 px-3 py-2 text-xs text-atr-arti">
          <Check className="h-3.5 w-3.5" />
          Tersimpan
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-atr-outline bg-white px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:shadow-atr-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-5 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan Template
        </button>
      </div>
    </div>
  );
}

function PillarCard({
  pillar,
  open,
  onToggle,
  onChange,
  onRemove,
  onAddQuestion,
  onQuestionChange,
  onQuestionRemove,
}: {
  pillar: Pillar;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Pillar>) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onQuestionChange: (qIdx: number, patch: Partial<Question>) => void;
  onQuestionRemove: (qIdx: number) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-atr-1">
      <header className="flex items-center gap-2 border-b border-atr-outline bg-atr-bg-soft/60 px-4 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-atr-bg-soft"
          aria-label={open ? "Tutup" : "Buka"}
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1 text-sm font-bold text-atr-fg">{pillar.title}</div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-atr-fg-muted">
          {pillar.questions.length} pertanyaan
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-atr-red/30 bg-atr-red/5 text-atr-red hover:bg-atr-red/10"
          title="Hapus pillar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>
      {open && (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Key (slug, untuk identifier internal)">
              <input
                type="text"
                value={pillar.key}
                onChange={(e) => onChange({ key: e.target.value })}
                className={INPUT_CLS}
              />
            </Field>
            <Field label="Title (ditampilkan ke desa)">
              <input
                type="text"
                value={pillar.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className={INPUT_CLS}
              />
            </Field>
          </div>

          <div className="space-y-2">
            {pillar.questions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft px-3 py-3 text-center text-xs italic text-atr-fg-muted">
                Belum ada pertanyaan di pillar ini.
              </p>
            ) : (
              pillar.questions.map((q, qIdx) => (
                <QuestionCard
                  key={q.id + qIdx}
                  question={q}
                  index={qIdx}
                  onChange={(patch) => onQuestionChange(qIdx, patch)}
                  onRemove={() => onQuestionRemove(qIdx)}
                />
              ))
            )}
            <button
              type="button"
              onClick={onAddQuestion}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-purple/40 bg-atr-purple-50 px-3 text-xs font-bold text-atr-purple-600 hover:bg-atr-purple-light/40"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Pertanyaan
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function QuestionCard({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: Question;
  index: number;
  onChange: (patch: Partial<Question>) => void;
  onRemove: () => void;
}) {
  function setOption(i: number, val: string) {
    const next = (question.options ?? []).slice();
    next[i] = val;
    onChange({ options: next });
  }
  function addOption() {
    onChange({ options: [...(question.options ?? []), ""] });
  }
  function removeOption(i: number) {
    onChange({
      options: (question.options ?? []).filter((_, idx) => idx !== i),
    });
  }
  function changeType(type: QType) {
    const patch: Partial<Question> = { type };
    if (type === "single" || type === "multi") {
      patch.options = question.options?.length
        ? question.options
        : ["Belum sama sekali", "Sebagian", "Sudah penuh"];
    }
    if (type === "slider") {
      patch.min = question.min ?? 1;
      patch.max = question.max ?? 5;
    }
    onChange(patch);
  }

  return (
    <div className="space-y-3 rounded-xl border border-atr-outline bg-atr-bg-soft/40 p-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
          Pertanyaan #{index + 1}
        </span>
        <span className="text-[10px] text-atr-fg-muted">·</span>
        <span className="text-[10px] text-atr-fg-muted">{TYPE_LABEL[question.type]}</span>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-atr-red hover:text-atr-red/80"
        >
          <Trash2 className="h-3 w-3" /> Hapus
        </button>
      </div>
      <Field label="Pertanyaan / label">
        <textarea
          value={question.label}
          onChange={(e) => onChange({ label: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-atr-outline p-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="ID (unik)">
          <input
            type="text"
            value={question.id}
            onChange={(e) => onChange({ id: e.target.value })}
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Tipe">
          <select
            value={question.type}
            onChange={(e) => changeType(e.target.value as QType)}
            className={INPUT_CLS}
          >
            {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bobot (weight)">
          <input
            type="number"
            step="0.5"
            value={question.weight}
            onChange={(e) => onChange({ weight: Number(e.target.value) })}
            className={INPUT_CLS}
          />
        </Field>
      </div>
      {(question.type === "single" || question.type === "multi") && (
        <div>
          <div className="mb-1.5 text-xs font-bold text-atr-fg">Pilihan</div>
          <div className="space-y-1.5">
            {(question.options ?? []).map((opt, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Pilihan ${i + 1}`}
                  className={INPUT_CLS}
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-atr-outline bg-white text-atr-fg-muted hover:bg-atr-bg-soft"
                  title="Hapus pilihan"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-atr-outline bg-white px-2 text-xs font-bold text-atr-fg hover:bg-atr-bg-soft"
            >
              <Plus className="h-3 w-3" /> Tambah pilihan
            </button>
          </div>
        </div>
      )}
      {question.type === "slider" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nilai minimum">
            <input
              type="number"
              value={question.min ?? 1}
              onChange={(e) => onChange({ min: Number(e.target.value) })}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Nilai maksimum">
            <input
              type="number"
              value={question.max ?? 5}
              onChange={(e) => onChange({ max: Number(e.target.value) })}
              className={INPUT_CLS}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

const INPUT_CLS =
  "h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 inline-block text-xs font-bold text-atr-fg">
        {label}
      </span>
      {children}
    </label>
  );
}
