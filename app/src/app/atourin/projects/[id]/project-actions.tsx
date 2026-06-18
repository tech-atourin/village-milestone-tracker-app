"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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

export function ProjectActions({
  projectId,
  initialEnabled,
  initialSlug,
  scope = "atourin",
}: {
  projectId: string;
  initialEnabled: boolean;
  initialSlug: string | null;
  scope?: "atourin" | "mitra" | "narasumber";
}) {
  const router = useRouter();
  const canTogglePublic = scope !== "narasumber";
  const [enabled, setEnabled] = useState(initialEnabled);
  const [slug, setSlug] = useState(initialSlug);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await togglePublicDashboard({
          project_id: projectId,
          enabled: next,
        });
        if ("error" in r) {
          setError(r.error);
          return;
        }
        setEnabled(next);
        setSlug(r.slug);
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error
            ? `Gagal: ${e.message}`
            : "Gagal mengubah shareable link.",
        );
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

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs font-bold text-atr-red">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
      {canTogglePublic && (
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
      )}
      {canTogglePublic && enabled && slug && (
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
        href={`/${scope}/projects/${projectId}/rapor`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Rapor Peserta
      </Link>
      <Link
        href={`/${scope}/projects/${projectId}/rapor-desa`}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
      >
        <MapPin className="h-3.5 w-3.5" />
        Rapor Desa
      </Link>
      <Link
        href={`/${scope}/projects/${projectId}/report`}
        target="_blank"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
      >
        <FileText className="h-3.5 w-3.5" />
        Final Report
      </Link>
      </div>
    </div>
  );
}
