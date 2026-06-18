"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, AlertCircle, Check } from "lucide-react";
import { updateHubTemplate } from "@/server/actions/klasifikasi-master";

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
  const [jsonText, setJsonText] = useState(
    JSON.stringify(template.definisi, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(false);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      setError(`JSON tidak valid: ${(e as Error).message}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await updateHubTemplate({
        id: template.id,
        name: name.trim(),
        versi: versi.trim(),
        description: description.trim() || null,
        definisi: parsed,
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
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
          <Field label="Versi">
            <input
              type="text"
              value={versi}
              onChange={(e) => setVersi(e.target.value)}
              className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
          <Field label="Deskripsi">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-atr-purple">
            Definisi (JSON)
          </h2>
          <p className="text-[11px] text-atr-fg-muted">
            Struktur: array of sections {"{ section, questions[] }"}
          </p>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setSaved(false);
          }}
          spellCheck={false}
          rows={28}
          className="w-full rounded-lg border border-atr-outline bg-atr-bg-soft/40 p-3 font-mono text-xs leading-relaxed text-atr-fg outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <pre className="whitespace-pre-wrap break-all">{error}</pre>
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
