"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Database,
  Loader2,
  Search,
  X,
  Check,
  ChevronLeft,
} from "lucide-react";
import { createDesaAction } from "@/server/actions/desa";
import { importHubDesaToMaster } from "@/server/actions/hub-import";

type Mode = "menu" | "manual" | "hub";

type HubResult = {
  id: string;
  nama: string;
  kabupaten?: string | null;
  provinsi?: string | null;
  kategori?: string | null;
  jumlah_kunjungan?: number | null;
  cover_image_url?: string | null;
};

export function AddDesaButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Manual form
  const [manual, setManual] = useState({
    name: "",
    desa_kelurahan: "",
    kecamatan: "",
    kabupaten: "",
    provinsi: "",
  });

  // Hub search
  const [hubQ, setHubQ] = useState("");
  const [hubSearching, setHubSearching] = useState(false);
  const [hubResults, setHubResults] = useState<HubResult[]>([]);

  function close() {
    setOpen(false);
    setMode("menu");
    setError(null);
    setNotice(null);
    setManual({
      name: "",
      desa_kelurahan: "",
      kecamatan: "",
      kabupaten: "",
      provinsi: "",
    });
    setHubQ("");
    setHubResults([]);
  }

  async function searchHub() {
    if (hubQ.trim().length < 2) return;
    setHubSearching(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/hub/search-desa?q=${encodeURIComponent(hubQ.trim())}`,
      );
      const data = await r.json();
      if (!r.ok || data.error) {
        setError(`Gagal cari di Hub: ${data.error ?? r.statusText}`);
      }
      setHubResults((data.results ?? []) as HubResult[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal cari di Hub");
    } finally {
      setHubSearching(false);
    }
  }

  function submitManual() {
    if (!manual.name.trim()) {
      setError("Nama desa wajib diisi");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await createDesaAction({
        name: manual.name.trim(),
        desa_kelurahan: manual.desa_kelurahan.trim() || null,
        kecamatan: manual.kecamatan.trim() || null,
        kabupaten: manual.kabupaten.trim() || null,
        provinsi: manual.provinsi.trim() || null,
      });
      if ("error" in r && r.error) {
        setError(r.error);
        return;
      }
      router.refresh();
      close();
    });
  }

  function importFromHub(hubId: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const r = await importHubDesaToMaster({ hub_desa_id: hubId });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.refresh();
      if (r.already_existed) {
        setNotice("Desa ini sudah ada di master, tidak ditambah ulang.");
      } else {
        close();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600"
      >
        <Plus className="h-4 w-4" />
        Tambah Desa
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-atr-fg/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-atr-outline bg-white p-6 shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {mode !== "menu" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("menu");
                      setError(null);
                      setNotice(null);
                    }}
                    className="rounded-md border border-atr-outline bg-white p-1 text-atr-fg-muted hover:bg-atr-bg-soft"
                    aria-label="Kembali"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold text-atr-fg">
                    {mode === "manual"
                      ? "Tambah Desa Manual"
                      : mode === "hub"
                        ? "Import dari Hub Atourin"
                        : "Tambah Desa"}
                  </h2>
                  <p className="text-xs text-atr-fg-muted">
                    {mode === "manual"
                      ? "Buat entry desa baru. Bisa dilengkapi profil & baseline nanti."
                      : mode === "hub"
                        ? "Search dari 5.964 desa wisata Atourin Hub. Import = salin profil + klasifikasi."
                        : "Pilih cara menambahkan desa wisata ke master."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-md p-1 text-atr-fg-muted hover:bg-atr-bg-soft hover:text-atr-fg"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {mode === "menu" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("hub")}
                  className="rounded-2xl border border-atr-purple/30 bg-atr-purple-50/40 p-5 text-left transition hover:border-atr-purple hover:bg-atr-purple-50"
                >
                  <Database className="h-6 w-6 text-atr-purple" />
                  <h3 className="mt-2 text-sm font-bold text-atr-fg">
                    Import dari Hub (5.964 desa)
                  </h3>
                  <p className="mt-1 text-xs text-atr-fg-muted">
                    Search desa di master Atourin Hub. Otomatis salin profil,
                    kontak, kategori, dan riwayat ADWI.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="rounded-2xl border border-atr-outline bg-white p-5 text-left transition hover:border-atr-purple/40 hover:bg-atr-bg-soft"
                >
                  <Plus className="h-6 w-6 text-atr-fg-muted" />
                  <h3 className="mt-2 text-sm font-bold text-atr-fg">
                    Manual
                  </h3>
                  <p className="mt-1 text-xs text-atr-fg-muted">
                    Buat entry kosong dengan nama + lokasi. Cocok untuk desa
                    yang belum ada di Hub.
                  </p>
                </button>
              </div>
            )}

            {mode === "manual" && (
              <div className="space-y-3">
                <Field label="Nama desa" required>
                  <input
                    type="text"
                    value={manual.name}
                    onChange={(e) =>
                      setManual((m) => ({ ...m, name: e.target.value }))
                    }
                    placeholder="cth: Desa Wisata Wanurejo"
                    className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Desa / Kelurahan">
                    <input
                      type="text"
                      value={manual.desa_kelurahan}
                      onChange={(e) =>
                        setManual((m) => ({
                          ...m,
                          desa_kelurahan: e.target.value,
                        }))
                      }
                      placeholder="cth: Wanurejo"
                      className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    />
                  </Field>
                  <Field label="Kecamatan">
                    <input
                      type="text"
                      value={manual.kecamatan}
                      onChange={(e) =>
                        setManual((m) => ({ ...m, kecamatan: e.target.value }))
                      }
                      placeholder="cth: Borobudur"
                      className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Kabupaten">
                    <input
                      type="text"
                      value={manual.kabupaten}
                      onChange={(e) =>
                        setManual((m) => ({ ...m, kabupaten: e.target.value }))
                      }
                      placeholder="cth: Magelang"
                      className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    />
                  </Field>
                  <Field label="Provinsi">
                    <input
                      type="text"
                      value={manual.provinsi}
                      onChange={(e) =>
                        setManual((m) => ({ ...m, provinsi: e.target.value }))
                      }
                      placeholder="cth: Jawa Tengah"
                      className="h-10 w-full rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                    />
                  </Field>
                </div>
                {error && (
                  <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
                    {error}
                  </div>
                )}
                <footer className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex h-9 items-center rounded-lg border border-atr-outline bg-white px-3 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={submitManual}
                    disabled={pending || !manual.name.trim()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50"
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Tambah Desa
                  </button>
                </footer>
              </div>
            )}

            {mode === "hub" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={hubQ}
                    onChange={(e) => setHubQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchHub()}
                    placeholder="Nama desa, kabupaten, atau provinsi…"
                    className="h-10 flex-1 rounded-lg border border-atr-outline bg-white px-3 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15"
                  />
                  <button
                    type="button"
                    onClick={searchHub}
                    disabled={hubSearching || hubQ.trim().length < 2}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
                  >
                    {hubSearching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    Cari
                  </button>
                </div>

                {notice && (
                  <div className="rounded-lg border border-atr-arti/30 bg-atr-arti/10 px-3 py-2 text-xs text-atr-arti">
                    {notice}
                  </div>
                )}
                {error && (
                  <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-3 py-2 text-xs text-atr-red">
                    {error}
                  </div>
                )}

                {hubResults.length > 0 ? (
                  <ul className="max-h-[55vh] divide-y divide-atr-outline overflow-y-auto rounded-lg border border-atr-outline">
                    {hubResults.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-start gap-3 p-3 hover:bg-atr-bg-soft"
                      >
                        {d.cover_image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={d.cover_image_url}
                            alt={d.nama}
                            className="h-12 w-12 shrink-0 rounded-md object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-atr-fg">
                              {d.nama}
                            </span>
                            {d.kategori && (
                              <span className="inline-flex rounded-full bg-atr-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-atr-purple-600">
                                {d.kategori}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-atr-fg-muted">
                            {[d.kabupaten, d.provinsi].filter(Boolean).join(" · ")}
                          </div>
                          {d.jumlah_kunjungan && (
                            <div className="text-[11px] text-atr-fg-muted">
                              {d.jumlah_kunjungan.toLocaleString("id-ID")}{" "}
                              kunjungan tahunan
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => importFromHub(d.id)}
                          disabled={pending}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-atr-purple px-2.5 text-xs font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
                        >
                          {pending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Import
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  hubQ.trim().length >= 2 &&
                  !hubSearching && (
                    <p className="rounded-lg border border-dashed border-atr-outline bg-atr-bg-soft p-6 text-center text-xs text-atr-fg-muted">
                      Tekan Cari untuk pencarian, atau tidak ada hasil yang cocok.
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 inline-block text-xs font-bold text-atr-fg">
        {label}
        {required && <span className="ml-0.5 text-atr-red">*</span>}
      </span>
      {children}
    </label>
  );
}
