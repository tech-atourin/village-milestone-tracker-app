"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CloudDownload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { syncDesaFromHub } from "@/server/actions/hub-sync";

type SyncSummary = {
  desa_name: string;
  kategori: string | null;
  classification_updated: boolean;
  fasilitas_count: number;
  kontak_synced: boolean;
  produk_count?: number;
  foto_count?: number;
  award_count?: number;
  event_count?: number;
};

export function HubSyncButton({
  desaId,
  hasHubLink,
}: {
  desaId: string;
  hasHubLink: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { ok: true; summary: SyncSummary } | { ok: false; error: string } | null
  >(null);

  function sync() {
    if (!hasHubLink) {
      setResult({
        ok: false,
        error: "Desa belum terhubung ke hub. Hubungi admin Atourin.",
      });
      return;
    }
    if (
      !confirm(
        "Sync akan menimpa data Profil Desa (alamat, deskripsi, fasilitas, kontak) dengan data dari Hub. Lanjut?",
      )
    )
      return;
    setResult(null);
    startTransition(async () => {
      const r = await syncDesaFromHub({ desa_id: desaId });
      if (r.error) {
        setResult({ ok: false, error: r.error });
      } else if (r.ok && r.summary) {
        setResult({ ok: true, summary: r.summary });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={sync}
        disabled={pending || !hasHubLink}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-atr-purple/30 bg-atr-purple-50 px-4 text-sm font-bold text-atr-purple-600 transition hover:bg-atr-purple/20 disabled:opacity-50"
        title={hasHubLink ? "Sync dari Hub" : "Belum terhubung ke hub"}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CloudDownload className="h-4 w-4" />
        )}
        Sync dari Hub
      </button>
      {!hasHubLink && (
        <p className="text-xs text-atr-fg-muted">
          Desa ini belum di-link ke hub. Sync tidak tersedia.
        </p>
      )}
      {result && result.ok && (
        <div className="rounded-lg border border-atr-arti/30 bg-atr-arti/10 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-atr-arti">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Sync berhasil
          </div>
          <ul className="mt-1.5 space-y-0.5 text-atr-fg">
            <li>Desa: {result.summary.desa_name}</li>
            {result.summary.classification_updated && (
              <li>Klasifikasi di-update: {result.summary.kategori}</li>
            )}
            <li>Fasilitas: {result.summary.fasilitas_count} item</li>
            <li>
              Kontak pengelola: {result.summary.kontak_synced ? "terisi" : "tidak ada di hub"}
            </li>
            {(result.summary.produk_count ?? 0) > 0 && (
              <li>Produk: {result.summary.produk_count} item</li>
            )}
            {(result.summary.foto_count ?? 0) > 0 && (
              <li>Foto galeri: {result.summary.foto_count} foto</li>
            )}
            {(result.summary.award_count ?? 0) > 0 && (
              <li>🏆 Award: {result.summary.award_count} prestasi</li>
            )}
            {(result.summary.event_count ?? 0) > 0 && (
              <li>📅 Event: {result.summary.event_count} kegiatan</li>
            )}
          </ul>
        </div>
      )}
      {result && !result.ok && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-atr-red">
            <AlertCircle className="h-3.5 w-3.5" />
            Sync gagal
          </div>
          <p className="mt-1 text-atr-fg">{result.error}</p>
        </div>
      )}
    </div>
  );
}
