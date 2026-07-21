"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import {
  uploadProjectLogo,
  removeProjectLogo,
} from "@/server/actions/project-logos";

export type ExtraLogo = {
  path: string;
  label: string;
  signed_url: string;
};

/**
 * Mengelola logo tambahan (di luar logo organisasi mitra) yang muncul di
 * sertifikat project. Misal program BAKTI Komdigi → logo Komdigi + BAKTI
 * Foundation + partner. Auto-placed di header sertifikat.
 */
export function ExtraLogosManager({
  projectId,
  initialLogos,
}: {
  projectId: string;
  initialLogos: ExtraLogo[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [logos, setLogos] = useState<ExtraLogo[]>(initialLogos);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    setError(null);
    if (!file || !label.trim()) {
      setError("Label dan file wajib diisi.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo maks 2 MB.");
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    startTransition(async () => {
      const r = await uploadProjectLogo({
        project_id: projectId,
        label: label.trim(),
        filename: file.name,
        mime_type: file.type || "image/png",
        base64,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      // Optimistic add - we don't have signed_url yet, so just refresh.
      setLabel("");
      setFile(null);
      router.refresh();
    });
  }

  function handleRemove(path: string) {
    if (!confirm("Hapus logo ini dari sertifikat project?")) return;
    startTransition(async () => {
      const r = await removeProjectLogo({ project_id: projectId, path });
      if (r.error) {
        setError(r.error);
        return;
      }
      setLogos((l) => l.filter((x) => x.path !== path));
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-atr-fg">
          Logo tambahan untuk sertifikat
        </h3>
        <p className="mt-1 text-xs text-atr-fg-muted">
          Logo organisasi mitra otomatis muncul di sertifikat. Tambahkan di
          sini logo program (mis. BAKTI), logo kementerian lain, atau partner
          yang ingin tampil di sertifikat. PNG transparan disarankan, maks 2 MB
          per logo.
        </p>
      </div>

      {logos.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {logos.map((logo) => (
            <li
              key={logo.path}
              className="flex items-center gap-3 rounded-lg border border-atr-outline bg-white p-3"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-atr-bg-soft">
                {logo.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo.signed_url}
                    alt={logo.label}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-atr-fg-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-atr-fg">
                  {logo.label}
                </div>
                <div className="truncate text-[11px] text-atr-fg-muted">
                  {logo.path.split("/").pop()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(logo.path)}
                disabled={pending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-atr-outline text-atr-fg-muted hover:bg-atr-red/5 hover:text-atr-red disabled:opacity-50"
                title="Hapus logo"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 rounded-2xl border border-dashed border-atr-outline bg-atr-bg-soft/40 p-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-atr-fg">
            Label logo (mis. &quot;Komdigi&quot;, &quot;BAKTI&quot;)
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              placeholder="Nama lembaga / program"
              className="mt-1 h-10 w-full rounded-lg border border-atr-outline px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
            />
          </label>
          <label className="block text-xs font-bold text-atr-fg">
            File logo (PNG transparan disarankan, maks 2 MB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-atr-purple-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-atr-purple-600 hover:file:bg-atr-purple-light/40"
            />
          </label>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={pending || !file || !label.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload logo
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
          {error}
        </div>
      )}
    </section>
  );
}
