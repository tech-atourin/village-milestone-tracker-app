"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Building2, Award, Users } from "lucide-react";
import { savePengelolaData } from "@/server/actions/desa-profile";

const BENTUK_OPTIONS = [
  "Pokdarwis",
  "BUMDes",
  "Koperasi",
  "Lembaga Adat",
  "Gabungan / Konsorsium",
  "Lainnya",
];

const JARINGAN_OPTIONS = [
  "ASIDEWI (Asosiasi Desa Wisata Indonesia)",
  "PHRI",
  "ASITA",
  "HPI (Himpunan Pramuwisata Indonesia)",
  "Asosiasi Homestay",
  "Tour Operator lokal",
  "Tour Operator nasional",
  "Universitas / Akademisi",
  "Dinas Pariwisata",
  "Kemenparekraf",
  "Sponsor CSR",
];

type Initial = {
  bentuk_kelembagaan: string | null;
  landasan_pembentukan: string | null;
  nomor_sk: string | null;
  tanggal_sk: string | null;
  total_pengurus: number | null;
  total_pengurus_p: number | null;
  rating_kemandirian: number | null;
  rating_keberlanjutan: number | null;
  rating_inovasi: number | null;
  jaringan_kerjasama: string[] | null;
  catatan: string | null;
} | null;

export function PengelolaForm({
  desaId,
  initial,
}: {
  desaId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    bentuk_kelembagaan: initial?.bentuk_kelembagaan ?? "",
    landasan_pembentukan: initial?.landasan_pembentukan ?? "",
    nomor_sk: initial?.nomor_sk ?? "",
    tanggal_sk: initial?.tanggal_sk ?? "",
    total_pengurus: initial?.total_pengurus ?? null as number | null,
    total_pengurus_p: initial?.total_pengurus_p ?? null as number | null,
    rating_kemandirian: initial?.rating_kemandirian ?? 3,
    rating_keberlanjutan: initial?.rating_keberlanjutan ?? 3,
    rating_inovasi: initial?.rating_inovasi ?? 3,
    jaringan_kerjasama: initial?.jaringan_kerjasama ?? ([] as string[]),
    catatan: initial?.catatan ?? "",
  });

  function toggleJaringan(j: string) {
    setF({
      ...f,
      jaringan_kerjasama: f.jaringan_kerjasama.includes(j)
        ? f.jaringan_kerjasama.filter((x) => x !== j)
        : [...f.jaringan_kerjasama, j],
    });
  }

  function save() {
    setErr(null);
    setSaved(false);
    startTransition(async () => {
      const r = await savePengelolaData({
        desa_id: desaId,
        bentuk_kelembagaan: f.bentuk_kelembagaan || null,
        landasan_pembentukan: f.landasan_pembentukan || null,
        nomor_sk: f.nomor_sk || null,
        tanggal_sk: f.tanggal_sk || null,
        total_pengurus: f.total_pengurus,
        total_pengurus_p: f.total_pengurus_p,
        rating_kemandirian: f.rating_kemandirian,
        rating_keberlanjutan: f.rating_keberlanjutan,
        rating_inovasi: f.rating_inovasi,
        jaringan_kerjasama: f.jaringan_kerjasama,
        catatan: f.catatan || null,
      });
      if (r.error) setErr(r.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Bentuk Kelembagaan" icon={Building2}>
        <div className="space-y-3">
          <F label="Bentuk lembaga pengelola">
            <select
              value={f.bentuk_kelembagaan}
              onChange={(e) => setF({ ...f, bentuk_kelembagaan: e.target.value })}
              className={input}
            >
              <option value="">— Pilih —</option>
              {BENTUK_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </F>
          <F label="Landasan pembentukan">
            <textarea
              value={f.landasan_pembentukan}
              onChange={(e) =>
                setF({ ...f, landasan_pembentukan: e.target.value })
              }
              rows={3}
              placeholder="Latar belakang dan dasar pembentukan organisasi"
              className={textarea}
            />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Nomor SK">
              <input
                type="text"
                value={f.nomor_sk}
                onChange={(e) => setF({ ...f, nomor_sk: e.target.value })}
                className={input}
              />
            </F>
            <F label="Tanggal SK">
              <input
                type="date"
                value={f.tanggal_sk}
                onChange={(e) => setF({ ...f, tanggal_sk: e.target.value })}
                className={input}
              />
            </F>
          </div>
        </div>
      </Card>

      <Card title="Struktur Pengurus" icon={Users}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Total pengurus">
            <input
              type="number"
              min={0}
              value={f.total_pengurus ?? ""}
              onChange={(e) =>
                setF({
                  ...f,
                  total_pengurus: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
              className={input}
            />
          </F>
          <F label="Pengurus perempuan">
            <input
              type="number"
              min={0}
              value={f.total_pengurus_p ?? ""}
              onChange={(e) =>
                setF({
                  ...f,
                  total_pengurus_p: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
              className={input}
            />
          </F>
        </div>
      </Card>

      <Card title="Self-Score Pengelolaan (1-5)" icon={Award}>
        <div className="space-y-4">
          <RatingSlider
            label="Kemandirian pengelolaan"
            value={f.rating_kemandirian}
            onChange={(v) => setF({ ...f, rating_kemandirian: v })}
            hint="1 = sangat bergantung bantuan eksternal, 5 = mandiri penuh"
          />
          <RatingSlider
            label="Keberlanjutan finansial"
            value={f.rating_keberlanjutan}
            onChange={(v) => setF({ ...f, rating_keberlanjutan: v })}
            hint="1 = rugi terus, 5 = profit konsisten + saving"
          />
          <RatingSlider
            label="Inovasi produk/layanan"
            value={f.rating_inovasi}
            onChange={(v) => setF({ ...f, rating_inovasi: v })}
            hint="1 = belum ada inovasi, 5 = inovatif rutin"
          />
        </div>
      </Card>

      <Card title="Jaringan Kerjasama" icon={Users}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {JARINGAN_OPTIONS.map((j) => {
            const checked = f.jaringan_kerjasama.includes(j);
            return (
              <label
                key={j}
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-xs transition ${
                  checked
                    ? "border-atr-purple bg-atr-purple-50 text-atr-fg"
                    : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleJaringan(j)}
                  className="h-3 w-3 accent-atr-purple"
                />
                {j}
              </label>
            );
          })}
        </div>
      </Card>

      <Card title="Catatan Tambahan">
        <textarea
          value={f.catatan}
          onChange={(e) => setF({ ...f, catatan: e.target.value })}
          rows={4}
          placeholder="Hal lain yang perlu disampaikan tentang pengelola..."
          className={textarea}
        />
      </Card>

      {err && (
        <div className="rounded-md border border-atr-red/30 bg-atr-red/10 p-3 text-sm text-atr-red">
          {err}
        </div>
      )}
      {saved && (
        <div className="rounded-md border border-atr-arti/30 bg-atr-arti/10 p-3 text-sm text-atr-arti">
          ✓ Tersimpan
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-atr-purple px-5 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan profil pengelola
        </button>
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-atr-purple">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-atr-fg">{label}</label>
      {children}
    </div>
  );
}

function RatingSlider({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-atr-fg">{label}</label>
        <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-atr-purple-50 text-sm font-bold text-atr-purple-600">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-2 w-full accent-atr-purple"
      />
      {hint && <p className="text-[11px] text-atr-fg-muted">{hint}</p>}
    </div>
  );
}

const input =
  "h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";
const textarea =
  "w-full rounded-md border border-atr-outline bg-white p-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";
