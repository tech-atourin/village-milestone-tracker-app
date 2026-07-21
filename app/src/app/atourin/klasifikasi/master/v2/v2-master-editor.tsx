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
type Tier = "rintisan" | "berkembang" | "maju" | "mandiri";

type Question = {
  id: string;
  type: QType;
  label: string;
  weight: number;
  tier: Tier;
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

const TIERS: Tier[] = ["rintisan", "berkembang", "maju", "mandiri"];
const TIER_LABEL: Record<Tier, string> = {
  rintisan: "Rintisan",
  berkembang: "Berkembang",
  maju: "Maju",
  mandiri: "Mandiri",
};
const TIER_STYLE: Record<Tier, string> = {
  rintisan: "bg-atr-yellow/20 text-atr-fg",
  berkembang: "bg-atr-arti/15 text-atr-arti",
  maju: "bg-atr-purple-50 text-atr-purple-600",
  mandiri: "bg-atr-purple-light/60 text-atr-purple-800",
};

const TYPE_LABEL: Record<QType, string> = {
  single: "Pilihan tunggal",
  multi: "Pilihan ganda",
  slider: "Skala (slider)",
  text: "Teks bebas",
};

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || `p_${Math.random().toString(36).slice(2, 8)}`
  );
}
function randomId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

function asDefinisi(input: unknown): Definisi {
  if (
    input &&
    typeof input === "object" &&
    Array.isArray((input as { pillars?: unknown }).pillars)
  ) {
    // Migrate: ensure every question has a tier (default rintisan)
    // and every pillar has a key (auto-derive from title if missing).
    const raw = (input as Definisi).pillars;
    return {
      pillars: raw.map((p) => ({
        key: p.key && p.key.trim() ? p.key : slugify(p.title ?? "pillar"),
        title: p.title ?? "",
        questions: (p.questions ?? []).map((q) => ({
          id: q.id && q.id.trim() ? q.id : randomId(),
          type: q.type ?? "single",
          label: q.label ?? "",
          weight: typeof q.weight === "number" ? q.weight : 1,
          tier: (q.tier as Tier) ?? "rintisan",
          options: q.options,
          min: q.min,
          max: q.max,
        })),
      })),
    };
  }
  return { pillars: [] };
}

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
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");

  // Counts per tier across all pillars
  const tierCounts: Record<Tier | "all", number> = {
    all: 0,
    rintisan: 0,
    berkembang: 0,
    maju: 0,
    mandiri: 0,
  };
  for (const p of pillars) {
    for (const q of p.questions) {
      tierCounts.all++;
      tierCounts[q.tier ?? "rintisan"]++;
    }
  }

  function togglePillar(key: string) {
    setOpenPillars((p) => ({ ...p, [key]: !p[key] }));
  }

  function updatePillar(idx: number, patch: Partial<Pillar>) {
    setPillars((arr) =>
      arr.map((p, i) =>
        i === idx
          ? {
              ...p,
              ...patch,
              // Auto-update key when title changes (only when key was derived from old title)
              key:
                patch.title !== undefined
                  ? slugify(patch.title)
                  : (patch.key ?? p.key),
            }
          : p,
      ),
    );
    setSaved(false);
  }
  function removePillar(idx: number) {
    if (!confirm(`Hapus pillar "${pillars[idx]?.title}"?`)) return;
    setPillars((arr) => arr.filter((_, i) => i !== idx));
    setSaved(false);
  }
  function addPillar() {
    const newTitle = "Pillar Baru";
    const newKey = slugify(newTitle) + "_" + Math.random().toString(36).slice(2, 5);
    setPillars((arr) => [
      ...arr,
      { key: newKey, title: newTitle, questions: [] },
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
  function addQuestion(pIdx: number, tier: Tier) {
    setPillars((arr) =>
      arr.map((p, i) =>
        i === pIdx
          ? {
              ...p,
              questions: [
                ...p.questions,
                {
                  id: randomId(),
                  type: "single",
                  label: "Pertanyaan baru",
                  weight: 1,
                  tier,
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
    // Validation - keys/ids auto-generated, only check user-facing
    const ids = new Set<string>();
    for (const p of pillars) {
      if (!p.title.trim()) {
        setError("Setiap pillar wajib punya nama.");
        return;
      }
      // Ensure key is set (auto-derive if empty)
      if (!p.key || !p.key.trim()) p.key = slugify(p.title);
      for (const q of p.questions) {
        if (!q.label.trim()) {
          setError(`Pillar "${p.title}": ada pertanyaan kosong.`);
          return;
        }
        if (!q.id || !q.id.trim()) q.id = randomId();
        if (ids.has(q.id)) q.id = randomId(); // self-heal duplicate ids
        ids.add(q.id);
        if (!q.tier) q.tier = "rintisan";
        if (
          (q.type === "single" || q.type === "multi") &&
          (!q.options || q.options.filter((o) => o.trim()).length === 0)
        ) {
          setError(
            `Pertanyaan "${q.label}" tipe ${TYPE_LABEL[q.type].toLowerCase()} butuh minimal 1 pilihan.`,
          );
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

      <div className="rounded-2xl border border-atr-purple/30 bg-atr-purple-50/40 p-3 text-[11px] text-atr-fg-muted">
        💡 Setiap pertanyaan dimasukkan ke salah satu tier:
        <b className="text-atr-fg"> Rintisan → Berkembang → Maju → Mandiri</b>.
        Desa wisata baru naik ke tier berikutnya kalau semua pertanyaan di tier
        sebelumnya sudah dijawab &amp; diapprove reviewer.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1.5">
          <TierChip
            active={tierFilter === "all"}
            onClick={() => setTierFilter("all")}
            label="Semua"
            count={tierCounts.all}
          />
          {TIERS.map((t) => (
            <TierChip
              key={t}
              active={tierFilter === t}
              onClick={() => setTierFilter(t)}
              label={TIER_LABEL[t]}
              count={tierCounts[t]}
            />
          ))}
        </nav>
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
              tierFilter={tierFilter}
              onToggle={() => togglePillar(p.key)}
              onChange={(patch) => updatePillar(pIdx, patch)}
              onRemove={() => removePillar(pIdx)}
              onAddQuestion={(tier) => addQuestion(pIdx, tier)}
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
  tierFilter,
  onToggle,
  onChange,
  onRemove,
  onAddQuestion,
  onQuestionChange,
  onQuestionRemove,
}: {
  pillar: Pillar;
  open: boolean;
  tierFilter: Tier | "all";
  onToggle: () => void;
  onChange: (patch: Partial<Pillar>) => void;
  onRemove: () => void;
  onAddQuestion: (tier: Tier) => void;
  onQuestionChange: (qIdx: number, patch: Partial<Question>) => void;
  onQuestionRemove: (qIdx: number) => void;
}) {
  // Group question indices by tier for the visual layout
  const byTier: Record<Tier, Array<{ q: Question; idx: number }>> = {
    rintisan: [],
    berkembang: [],
    maju: [],
    mandiri: [],
  };
  pillar.questions.forEach((q, idx) => {
    byTier[q.tier ?? "rintisan"].push({ q, idx });
  });

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
          <Field label="Nama pillar">
            <input
              type="text"
              value={pillar.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Cth: Daya Tarik Wisata"
              className={INPUT_CLS}
            />
          </Field>

          {(tierFilter === "all" ? TIERS : [tierFilter]).map((tier) => (
            <div key={tier} className="space-y-2 rounded-xl border border-atr-outline bg-atr-bg-soft/30 p-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold ${TIER_STYLE[tier]}`}
                  >
                    {TIER_LABEL[tier]}
                  </span>
                  <span className="text-[10px] text-atr-fg-muted">
                    {byTier[tier].length} pertanyaan
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onAddQuestion(tier)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-atr-purple/30 bg-white px-2 text-[11px] font-bold text-atr-purple-600 hover:bg-atr-purple-50"
                >
                  <Plus className="h-3 w-3" /> Tambah di {TIER_LABEL[tier]}
                </button>
              </div>
              {byTier[tier].length === 0 ? (
                <p className="rounded-lg border border-dashed border-atr-outline bg-white px-3 py-2 text-center text-[11px] italic text-atr-fg-muted">
                  Belum ada pertanyaan tier {TIER_LABEL[tier]}.
                </p>
              ) : (
                <div className="space-y-2">
                  {byTier[tier].map(({ q, idx }) => (
                    <QuestionCard
                      key={q.id + idx}
                      question={q}
                      onChange={(patch) => onQuestionChange(idx, patch)}
                      onRemove={() => onQuestionRemove(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function QuestionCard({
  question,
  onChange,
  onRemove,
}: {
  question: Question;
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
    <div className="space-y-3 rounded-xl border border-atr-outline bg-white p-3">
      <div className="flex items-center gap-2">
        <select
          value={question.tier}
          onChange={(e) => onChange({ tier: e.target.value as Tier })}
          aria-label="Tier"
          className={`h-7 rounded-full border px-2 text-[10px] font-bold ${TIER_STYLE[question.tier]}`}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </select>
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
      <Field label="Pertanyaan">
        <textarea
          value={question.label}
          onChange={(e) => onChange({ label: e.target.value })}
          rows={2}
          placeholder="Cth: Apakah desa Anda memiliki daya tarik wisata yang terdokumentasi?"
          className="w-full rounded-lg border border-atr-outline p-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
      </Field>
      <Field label="Tipe jawaban">
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
      {(question.type === "single" || question.type === "multi") && (
        <div>
          <div className="mb-1.5 text-xs font-bold text-atr-fg">Pilihan jawaban</div>
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

function TierChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
        active
          ? "bg-atr-purple text-white"
          : "border border-atr-outline bg-white text-atr-fg-muted hover:bg-atr-bg-soft"
      }`}
    >
      {label}
      <span
        className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] ${
          active ? "bg-white/25" : "bg-atr-bg-soft"
        }`}
      >
        {count}
      </span>
    </button>
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
