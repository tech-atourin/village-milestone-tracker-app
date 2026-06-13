"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Save, Loader2, Building2 } from "lucide-react";
import { uploadOrgLogo, updateOrg } from "@/server/actions/orgs";
import type { OrgRow } from "@/server/queries/orgs";

export function OrgCard({ org }: { org: OrgRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(org.name);
  const [color, setColor] = useState(org.brand_color_primary ?? "#7068D5");
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo terlalu besar (maks 5 MB)");
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    startTransition(async () => {
      const r = await uploadOrgLogo({
        org_id: org.id,
        filename: file.name,
        mime_type: file.type || "image/png",
        base64,
      });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await updateOrg({
        id: org.id,
        name,
        brand_color_primary: color,
        brand_color_secondary: null,
      });
      if (r.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <article className="space-y-3 rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-atr-outline bg-atr-bg-soft">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt={org.name}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <Building2 className="h-6 w-6 text-atr-fg-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-full rounded-lg border border-atr-outline px-2 text-sm font-bold outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
          />
          <div className="mt-1.5 inline-flex rounded-full bg-atr-bg-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-atr-fg-muted">
            {org.type}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-atr-bg-soft p-2.5 text-center">
          <div className="text-atr-fg-muted">Projects</div>
          <div className="font-bold text-atr-fg">{org.project_count}</div>
        </div>
        <div className="rounded-lg bg-atr-bg-soft p-2.5 text-center">
          <div className="text-atr-fg-muted">Users</div>
          <div className="font-bold text-atr-fg">{org.user_count}</div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs font-bold text-atr-fg">
        Brand color
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-7 w-12 cursor-pointer rounded border border-atr-outline"
        />
        <span className="font-mono text-atr-fg-muted">{color}</span>
      </label>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-atr-outline bg-white p-4 text-center transition hover:border-atr-purple/40 hover:bg-atr-purple-50/40">
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin text-atr-purple" />
        ) : (
          <Upload className="h-5 w-5 text-atr-fg-muted" />
        )}
        <span className="text-xs font-bold text-atr-fg">
          {pending ? "Mengupload…" : "Upload logo"}
        </span>
        <span className="text-[10px] text-atr-fg-muted">
          PNG/SVG, maks 5 MB
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
          className="hidden"
        />
      </label>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 p-2 text-xs text-atr-red">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-atr-purple px-3 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Simpan
      </button>
    </article>
  );
}
