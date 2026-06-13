"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { saveDesaProfile } from "@/server/actions/desa-profile";

const FASILITAS_OPTIONS = [
  "Homestay",
  "Toilet umum",
  "Area parkir",
  "Pusat informasi (TIC)",
  "Mushola",
  "Restoran/warung",
  "Tempat sampah terkelola",
  "Spot foto",
  "Jalur evakuasi",
  "WiFi publik",
  "Kios souvenir",
  "Camping ground",
];

type ProfileInput = {
  alamat: string | null;
  deskripsi: string | null;
  keunikan: string | null;
  rekomendasi_kunjungan: string | null;
  nomor_sk_kepala_daerah: string | null;
  fasilitas: string[] | null;
  pengelola_nama: string | null;
  pengelola_kontak_person: string | null;
  pengelola_email: string | null;
  pengelola_whatsapp: string | null;
  social_website: string | null;
  social_facebook: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_youtube: string | null;
};

export function ProfileEditForm({
  desaId,
  initial,
}: {
  desaId: string;
  initial: ProfileInput;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileInput>({
    alamat: initial.alamat ?? "",
    deskripsi: initial.deskripsi ?? "",
    keunikan: initial.keunikan ?? "",
    rekomendasi_kunjungan: initial.rekomendasi_kunjungan ?? "",
    nomor_sk_kepala_daerah: initial.nomor_sk_kepala_daerah ?? "",
    fasilitas: initial.fasilitas ?? [],
    pengelola_nama: initial.pengelola_nama ?? "",
    pengelola_kontak_person: initial.pengelola_kontak_person ?? "",
    pengelola_email: initial.pengelola_email ?? "",
    pengelola_whatsapp: initial.pengelola_whatsapp ?? "",
    social_website: initial.social_website ?? "",
    social_facebook: initial.social_facebook ?? "",
    social_twitter: initial.social_twitter ?? "",
    social_instagram: initial.social_instagram ?? "",
    social_youtube: initial.social_youtube ?? "",
  });

  function toggleFasilitas(f: string) {
    const cur = form.fasilitas ?? [];
    setForm({
      ...form,
      fasilitas: cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f],
    });
  }

  function save() {
    setErr(null);
    startTransition(async () => {
      const r = await saveDesaProfile({ desa_id: desaId, ...form });
      if (r.error) setErr(r.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
      >
        <Pencil className="h-4 w-4" />
        Edit Profil
      </button>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-atr-purple/30 bg-atr-purple-50/30 p-6 shadow-atr-1 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-atr-fg">Edit Profil Desa</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-atr-fg-muted hover:bg-white hover:text-atr-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <F label="Alamat lengkap">
        <input type="text" value={form.alamat ?? ""} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className={input} />
      </F>

      <F label="Deskripsi desa wisata">
        <textarea value={form.deskripsi ?? ""} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={4} className={textarea} placeholder="Cerita singkat tentang desa, sejarah, lokasi geografis..." />
      </F>

      <F label="Keunikan & Keunggulan">
        <textarea value={form.keunikan ?? ""} onChange={(e) => setForm({ ...form, keunikan: e.target.value })} rows={3} className={textarea} placeholder="Apa yang membuat desa Anda unik?" />
      </F>

      <F label="Rekomendasi saat berkunjung">
        <textarea value={form.rekomendasi_kunjungan ?? ""} onChange={(e) => setForm({ ...form, rekomendasi_kunjungan: e.target.value })} rows={3} className={textarea} placeholder="Tips, hal yang harus dicoba, waktu terbaik..." />
      </F>

      <F label="No. SK Kepala Daerah">
        <input type="text" value={form.nomor_sk_kepala_daerah ?? ""} onChange={(e) => setForm({ ...form, nomor_sk_kepala_daerah: e.target.value })} className={input} placeholder="cth: SK Bupati 510/123/2024" />
      </F>

      <F label="Fasilitas yang tersedia">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FASILITAS_OPTIONS.map((f) => {
            const checked = (form.fasilitas ?? []).includes(f);
            return (
              <label key={f} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${checked ? "border-atr-purple bg-atr-purple-50 text-atr-fg" : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft"}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleFasilitas(f)} className="h-3 w-3 accent-atr-purple" />
                {f}
              </label>
            );
          })}
        </div>
      </F>

      <div className="grid gap-4 border-t border-atr-outline pt-4 sm:grid-cols-2">
        <F label="Nama Pengelola">
          <input type="text" value={form.pengelola_nama ?? ""} onChange={(e) => setForm({ ...form, pengelola_nama: e.target.value })} className={input} placeholder="cth: Pokdarwis Wanurejo" />
        </F>
        <F label="Kontak Person">
          <input type="text" value={form.pengelola_kontak_person ?? ""} onChange={(e) => setForm({ ...form, pengelola_kontak_person: e.target.value })} className={input} />
        </F>
        <F label="Email">
          <input type="email" value={form.pengelola_email ?? ""} onChange={(e) => setForm({ ...form, pengelola_email: e.target.value })} className={input} />
        </F>
        <F label="Telp / WhatsApp">
          <input type="text" value={form.pengelola_whatsapp ?? ""} onChange={(e) => setForm({ ...form, pengelola_whatsapp: e.target.value })} className={input} placeholder="6281234567890" />
        </F>
      </div>

      <div className="grid gap-4 border-t border-atr-outline pt-4 sm:grid-cols-2">
        <F label="Website"><input type="url" value={form.social_website ?? ""} onChange={(e) => setForm({ ...form, social_website: e.target.value })} className={input} placeholder="https://" /></F>
        <F label="Instagram"><input type="text" value={form.social_instagram ?? ""} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} className={input} placeholder="@desawisata" /></F>
        <F label="Facebook"><input type="text" value={form.social_facebook ?? ""} onChange={(e) => setForm({ ...form, social_facebook: e.target.value })} className={input} placeholder="https://facebook.com/..." /></F>
        <F label="Twitter / X"><input type="text" value={form.social_twitter ?? ""} onChange={(e) => setForm({ ...form, social_twitter: e.target.value })} className={input} placeholder="@desawisata" /></F>
        <F label="YouTube"><input type="text" value={form.social_youtube ?? ""} onChange={(e) => setForm({ ...form, social_youtube: e.target.value })} className={input} placeholder="https://youtube.com/..." /></F>
      </div>

      {err && <div className="rounded-md border border-atr-red/30 bg-atr-red/10 p-2 text-xs text-atr-red">{err}</div>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-md border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft">Batal</button>
        <button type="button" onClick={save} disabled={pending} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-atr-purple px-4 text-sm font-bold text-white hover:bg-atr-purple-600 disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan profil
        </button>
      </div>
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

const input = "h-10 w-full rounded-md border border-atr-outline bg-white px-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";
const textarea = "w-full rounded-md border border-atr-outline bg-white p-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";
