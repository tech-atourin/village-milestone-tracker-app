"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { submitQuizRegistration } from "@/server/actions/quiz-registration";

type DesaOption = { id: string; name: string };

export function RegistrationForm({
  slug,
  quizTitle,
  desaOptions,
}: {
  slug: string;
  quizTitle: string;
  desaOptions: DesaOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nik, setNik] = useState("");
  const [gender, setGender] = useState<"" | "L" | "P">("");
  const [birthdate, setBirthdate] = useState("");
  const [desaId, setDesaId] = useState<string>("");
  const [desaOther, setDesaOther] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [instansi, setInstansi] = useState("");
  const [kota, setKota] = useState("");

  const pilihLainnya = desaId === "__other__";

  function submit() {
    setError(null);
    if (fullName.trim().length < 2) return setError("Nama lengkap wajib diisi.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      return setError("Email tidak valid.");
    if (phone.trim().length < 6) return setError("No HP / WhatsApp wajib diisi.");
    if (!desaId) return setError("Pilih desa/instansi asal.");
    if (pilihLainnya && desaOther.trim().length < 2)
      return setError("Isi nama desa/instansi Anda.");

    startTransition(async () => {
      const r = await submitQuizRegistration({
        slug,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        nik: nik.trim() || null,
        gender: gender || null,
        birthdate: birthdate || null,
        desa_id: pilihLainnya ? null : desaId,
        desa_other: pilihLainnya ? desaOther.trim() : null,
        jabatan: jabatan.trim() || null,
        instansi: instansi.trim() || null,
        kota: kota.trim() || null,
      });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      // Lanjut ke halaman pengerjaan dengan identitas terkunci dari pendaftaran.
      router.push(`/public/kuis/${slug}?reg=${r.registration_id}`);
      router.refresh();
    });
  }

  const field =
    "w-full rounded-lg border border-atr-outline bg-white px-3 py-2 text-sm outline-none focus:border-atr-purple focus:ring-2 focus:ring-atr-purple/15";
  const label = "mb-1 block text-xs font-bold text-atr-fg";

  return (
    <div className="rounded-2xl border border-atr-outline bg-white p-6 shadow-atr-1">
      <h1 className="text-lg font-bold text-atr-fg">{quizTitle}</h1>
      <p className="mt-1 text-sm text-atr-fg-muted">
        Lengkapi data diri Anda terlebih dahulu. Data ini dipakai penyelenggara
        untuk membuatkan akun Anda. Setelah ini Anda langsung mengerjakan tes.
      </p>

      <div className="mt-5 space-y-3">
        <div>
          <label className={label}>Nama lengkap *</label>
          <input className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Email *</label>
            <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
          </div>
          <div>
            <label className={label}>No HP / WhatsApp *</label>
            <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
        </div>

        <div>
          <label className={label}>Desa / instansi asal *</label>
          <select className={field} value={desaId} onChange={(e) => setDesaId(e.target.value)}>
            <option value="">Pilih desa/instansi</option>
            {desaOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
            <option value="__other__">Lainnya (tidak ada di daftar)</option>
          </select>
          {pilihLainnya && (
            <input
              className={`${field} mt-2`}
              value={desaOther}
              onChange={(e) => setDesaOther(e.target.value)}
              placeholder="Ketik nama desa / instansi Anda"
            />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Jabatan / peran</label>
            <input className={field} value={jabatan} onChange={(e) => setJabatan(e.target.value)} placeholder="mis. Ketua BUMDes" />
          </div>
          <div>
            <label className={label}>Kota / kabupaten</label>
            <input className={field} value={kota} onChange={(e) => setKota(e.target.value)} />
          </div>
        </div>

        <details className="rounded-lg border border-atr-outline bg-atr-bg-soft/40 p-3">
          <summary className="cursor-pointer text-xs font-bold text-atr-fg-muted">
            Data tambahan (opsional)
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>NIK</label>
                <input className={field} value={nik} onChange={(e) => setNik(e.target.value)} />
              </div>
              <div>
                <label className={label}>Jenis kelamin</label>
                <select className={field} value={gender} onChange={(e) => setGender(e.target.value as "" | "L" | "P")}>
                  <option value="">Pilih</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Tanggal lahir</label>
              <input type="date" className={field} value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
            </div>
            <div>
              <label className={label}>Instansi</label>
              <input className={field} value={instansi} onChange={(e) => setInstansi(e.target.value)} />
            </div>
          </div>
        </details>

        {error && <p className="text-sm font-bold text-atr-red">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-atr-purple px-4 text-sm font-bold text-white transition hover:bg-atr-purple-600 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Lanjut ke Tes <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
