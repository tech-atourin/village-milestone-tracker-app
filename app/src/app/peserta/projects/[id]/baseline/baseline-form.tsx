"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send } from "lucide-react";
import { saveBaseline } from "@/server/actions/baseline";
import type {
  BaselineField,
  BaselineSchemaRow,
} from "@/lib/baseline/types";

export function BaselineForm({
  projectDesaId,
  schema,
  initialData,
}: {
  projectDesaId: string;
  schema: BaselineSchemaRow;
  initialData: Record<string, unknown>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function setField(key: string, value: unknown) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function save(submit: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await saveBaseline({
        project_desa_id: projectDesaId,
        schema_version: schema.version,
        data,
        submit,
      });
      if (r.error) setError(r.error);
      else {
        setSavedAt(new Date().toISOString());
        if (submit) router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      {schema.fields.map((section) => (
        <section
          key={section.section}
          className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
        >
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-atr-purple">
            {section.section}
          </h2>
          <div className="space-y-4">
            {section.fields.map((field) => (
              <Field
                key={field.key}
                field={field}
                value={data[field.key]}
                onChange={(v) => setField(field.key, v)}
              />
            ))}
          </div>
        </section>
      ))}

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
          {error}
        </div>
      )}
      {savedAt && !error && (
        <div className="rounded-lg border border-atr-arti/30 bg-atr-arti/10 px-4 py-3 text-sm text-atr-arti">
          Tersimpan otomatis · {new Date(savedAt).toLocaleTimeString("id-ID")}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-atr-outline bg-white px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:shadow-atr-2">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={pending}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan draft
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={pending}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit final
        </button>
      </div>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: BaselineField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <label className="block text-sm font-bold text-atr-fg">
      {field.label}
      {field.required && <span className="ml-1 text-atr-red">*</span>}
    </label>
  );

  const baseInput =
    "h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1.5">
          {label}
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={baseInput}
          />
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          {label}
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-atr-outline p-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
        </div>
      );
    case "number":
      return (
        <div className="space-y-1.5">
          {label}
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            className={baseInput}
          />
        </div>
      );
    case "date":
      return (
        <div className="space-y-1.5">
          {label}
          <input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={baseInput}
          />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          {label}
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={baseInput}
          >
            <option value="">— Pilih —</option>
            {field.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      );
    case "multiselect": {
      const arr = (Array.isArray(value) ? value : []) as string[];
      return (
        <div className="space-y-1.5">
          {label}
          <div className="flex flex-wrap gap-1.5">
            {field.options?.map((o) => {
              const on = arr.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() =>
                    onChange(on ? arr.filter((x) => x !== o) : [...arr, o])
                  }
                  className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-bold transition ${
                    on
                      ? "bg-atr-purple text-white"
                      : "border border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "boolean":
      return (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-atr-outline px-3 py-2 hover:bg-atr-bg-soft">
          <span className="text-sm text-atr-fg">{field.label}</span>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 accent-atr-purple"
          />
        </label>
      );
  }
}
