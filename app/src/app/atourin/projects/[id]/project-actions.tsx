"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Download,
  Globe,
  Loader2,
  Check,
  Copy,
  ExternalLink,
  GraduationCap,
  FileText,
  MapPin,
} from "lucide-react";
import { togglePublicDashboard } from "@/server/actions/public-dashboard";
import { exportProjectExcel } from "@/server/actions/export";

export function ProjectActions({
  projectId,
  initialEnabled,
  initialSlug,
}: {
  projectId: string;
  initialEnabled: boolean;
  initialSlug: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState(initialSlug);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function toggle(next: boolean) {
    startTransition(async () => {
      const r = await togglePublicDashboard({
        project_id: projectId,
        enabled: next,
      });
      if (!r.error) {
        setEnabled(next);
        if (r.slug) setSlug(r.slug);
      }
    });
  }

  async function copy() {
    if (!slug) return;
    const url = `${window.location.origin}/public/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function exportXlsx() {
    startTransition(async () => {
      const r = await exportProjectExcel(projectId);
      if ("error" in r) {
        alert(r.error);
        return;
      }
      const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggle(!enabled)}
        disabled={pending}
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold transition disabled:opacity-50 ${
          enabled
            ? "border-atr-arti/30 bg-atr-arti/10 text-atr-arti hover:bg-atr-arti/15"
            : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
        }`}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Globe className="h-3.5 w-3.5" />
        )}
        {enabled ? "Shareable link aktif" : "Aktifkan shareable link"}
      </button>
      {enabled && slug && (
        <>
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-atr-arti" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Tersalin" : "Salin link"}
          </button>
          <a
            href={`/public/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka
          </a>
        </>
      )}
      <Link
        href={`/atourin/projects/${projectId}/rapor`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        RAPOR Peserta
      </Link>
      <Link
        href={`/atourin/projects/${projectId}/rapor-desa`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
      >
        <MapPin className="h-3.5 w-3.5" />
        RAPOR Desa
      </Link>
      <Link
        href={`/atourin/projects/${projectId}/report`}
        target="_blank"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
      >
        <FileText className="h-3.5 w-3.5" />
        Final Report
      </Link>
      <button
        type="button"
        onClick={exportXlsx}
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Export Excel
      </button>
    </div>
  );
}
