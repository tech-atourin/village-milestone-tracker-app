"use client";

import { useState } from "react";
import { GraduationCap, Building2, WifiOff } from "lucide-react";

type Role = "peserta" | "desa";

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[36px_1fr] gap-3 rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-atr-purple-50 text-sm font-bold text-atr-purple">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-atr-fg">{title}</h3>
        <div className="mt-1 space-y-1.5 text-sm text-atr-fg-muted [&_strong]:text-atr-fg">
          {children}
        </div>
      </div>
    </li>
  );
}

function Track({ tag, title, subtitle }: { tag: string; title: string; subtitle: string }) {
  return (
    <div className="mt-7 flex items-center gap-3 border-b border-atr-outline pb-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-atr-purple text-sm font-bold text-white">
        {tag}
      </span>
      <div>
        <h3 className="text-[15px] font-bold text-atr-fg">{title}</h3>
        <p className="text-xs text-atr-fg-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-block rounded-full bg-atr-purple-50 px-2 py-0.5 text-[11px] font-bold text-atr-purple-700">
      {children}
    </span>
  );
}

// Tab "Desa Wisata" disembunyikan sementara; hanya Peserta dulu.
// Ubah ke true untuk mengaktifkan kembali pemilih peran + panduan Desa.
const SHOW_DESA = false;

export function BantuanGuide({ defaultRole = "peserta" }: { defaultRole?: Role }) {
  const [role, setRole] = useState<Role>(SHOW_DESA ? defaultRole : "peserta");

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-atr-fg">
          Panduan Penggunaan
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Tutorial langkah demi langkah. Ikuti urutannya sesuai program yang
          Anda ikuti.
        </p>
      </header>

      {SHOW_DESA && (
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: "peserta", label: "Peserta", Icon: GraduationCap },
              { key: "desa", label: "Desa Wisata", Icon: Building2 },
            ] as const
          ).map(({ key, label, Icon }) => {
            const active = role === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRole(key)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  active
                    ? "border-atr-purple bg-atr-purple text-white shadow-atr-1"
                    : "border-atr-outline bg-white text-atr-fg-muted hover:bg-atr-bg-soft"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {role === "peserta" ? (
        <div>
          <Track tag="A" title="Langkah Umum" subtitle="Berlaku untuk semua peserta" />
          <ol className="mt-3 space-y-3">
            <Step n="1" title="Masuk ke akun Anda">
              <p>
                Buka <strong>vmt.atourin.com</strong>, masukkan email dan password
                dari admin/mitra penyelenggara. Akun dibuat oleh penyelenggara
                (tidak ada pendaftaran mandiri). Lupa password? Hubungi admin Anda.
              </p>
            </Step>
            <Step n="2" title="Kenali Beranda">
              <p>
                Beranda menampilkan <strong>Pelatihan Saya</strong>,{" "}
                <strong>Pendampingan Desa</strong>, dan{" "}
                <strong>Hasil Kuis Saya</strong>. Anda mungkin hanya punya salah
                satu, tergantung program.
              </p>
            </Step>
            <Step n="3" title="Buka Materi & Tautan">
              <p>
                Menu <Pill>Materi &amp; Tautan</Pill> berisi file dan tautan
                yang dibagikan penyelenggara: <strong>materi pelatihan</strong>{" "}
                (PDF/Excel), <strong>video &amp; rekaman</strong>, foto, serta{" "}
                <strong>link pre-test, post-test, dan form evaluasi</strong>.
                Tekan sebuah item untuk mengunduh file atau membuka tautannya.
              </p>
            </Step>
          </ol>

          <Track tag="B" title="Program Pelatihan" subtitle='Buka lewat kartu di "Pelatihan Saya"' />
          <ol className="mt-3 space-y-3">
            <Step n="1" title="Check-in kehadiran tiap topik">
              <p>
                Di halaman pelatihan, kartu <Pill>Check-in Kehadiran</Pill> ada di
                paling atas. Tekan <strong>Check-in</strong> pada tiap topik saat
                Anda hadir.
              </p>
            </Step>
            <Step n="2" title="Kerjakan Kuis (Pre-test & Post-test)">
              <p>
                Buka <strong>link kuis</strong> dari admin, isi nama & email, tekan{" "}
                <strong>Mulai Kerjakan</strong>. Perhatikan timer bila ada.
                Pre-test menampilkan skor saja; post-test menampilkan skor +
                pembahasan. Gunakan email yang sama dengan akun Anda.
              </p>
            </Step>
            <Step n="3" title="Lihat Hasil Kuis & pembahasan">
              <p>
                Dari beranda buka <Pill>Hasil Kuis Saya</Pill>. Untuk post-test,
                tekan <strong>Pembahasan</strong> untuk melihat jawaban benar.
              </p>
            </Step>
            <Step n="4" title="Rapor & Sertifikat">
              <p>
                Di halaman pelatihan, lihat skor pre/post-test dan modul. Bila
                tersedia, buka <strong>Rapor</strong> dan unduh{" "}
                <strong>Sertifikat</strong>.
              </p>
            </Step>
          </ol>

          <Track tag="C" title="Program Pendampingan Desa" subtitle='Buka lewat kartu di "Pendampingan Desa"' />
          <ol className="mt-3 space-y-3">
            <Step n="1" title="Isi checklist tugas tiap topik + unggah bukti">
              <p>
                Pilih sebuah <strong>Topik</strong>, lalu untuk tiap item tugas:
                centang, tambahkan <strong>bukti pendukung</strong> (foto/dokumen,
                bisa beberapa file), dan <strong>tandai diserahkan</strong> untuk
                direview.
              </p>
            </Step>
            <Step n="2" title="Tanggapi catatan reviewer">
              <p>
                Item ber-label <strong>perlu respons</strong> berarti diminta
                revisi. Buka item itu, baca catatan reviewer, perbaiki bukti, dan
                kirim ulang.
              </p>
            </Step>
            <Step n="3" title="Lengkapi Data Baseline desa">
              <p>
                Buka <Pill>Data Baseline</Pill> untuk mengisi profil lengkap desa
                (kondisi awal sebelum pendampingan).
              </p>
            </Step>
            <Step n="4" title="Susun Rencana Aksi">
              <p>
                Di <Pill>Rencana Aksi</Pill>, susun tindak lanjut bersama
                narasumber: tambahkan rencana, target, dan pantau statusnya.
              </p>
            </Step>
            <Step n="5" title="Beri penilaian narasumber">
              <p>
                Di bagian <Pill>Penilaian Narasumber</Pill>, beri rating bintang +
                komentar untuk tiap narasumber yang mendampingi.
              </p>
            </Step>
            <Step n="6" title="Kumpulan Bukti Pendukung">
              <p>
                Menu <Pill>Kumpulan Bukti Pendukung</Pill> menampilkan semua
                dokumen yang pernah Anda unggah dalam satu tempat.
              </p>
            </Step>
          </ol>

          <div className="mt-6 rounded-2xl border-2 border-atr-purple/30 bg-atr-purple-50/40 p-4">
            <h4 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-atr-purple-700">
              <WifiOff className="h-3.5 w-3.5" />
              Bekerja tanpa sinyal (offline)
            </h4>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-atr-fg-muted [&_strong]:text-atr-fg">
              <li>
                Saat sinyal mati, isian Anda <strong>tersimpan di HP</strong> dan
                akan <strong>otomatis terkirim</strong> begitu koneksi kembali.
              </li>
              <li>
                Indikator kecil di bawah layar menampilkan status: Offline,
                menunggu sinkronisasi, atau Tersinkronisasi.
              </li>
              <li>Jangan hapus aplikasi sebelum data tersinkron.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <ol className="mt-3 space-y-3">
            <Step n="1" title="Masuk ke akun desa">
              <p>
                Buka <strong>vmt.atourin.com</strong>, masuk dengan email &
                password dari Atourin/mitra. Anda diarahkan ke Dashboard Desa.
              </p>
            </Step>
            <Step n="2" title="Pahami Dashboard">
              <p>
                Dashboard menampilkan <strong>klasifikasi desa</strong> saat ini
                (Rintisan, Berkembang, Maju, Mandiri) dan ringkasan progres.
              </p>
            </Step>
            <Step n="3" title="Isi Self-Assessment">
              <p>
                Buka <Pill>Self-Assessment</Pill>. Ada dua format:{" "}
                <strong>V1 Permenpar</strong> (kriteria klasifikasi nasional) dan{" "}
                <strong>Assessment Desa V2</strong> (format Hub). Isi kriteria,
                unggah bukti, lalu kirim untuk verifikasi. Bila ditolak, baca
                catatan verifikator, perbaiki, dan kirim ulang.
              </p>
            </Step>
            <Step n="4" title="Lengkapi Profil Desa & Pengelola">
              <p>
                Buka <Pill>Profil Desa</Pill> dan <Pill>Profil Pengelola</Pill>.
                Isi manual atau tekan <strong>Sinkron dari Hub</strong> untuk
                menarik data yang sudah ada.
              </p>
            </Step>
            <Step n="5" title="Kelola Rencana Aksi">
              <p>
                Di <Pill>Rencana Aksi</Pill>, pantau dan perbarui tindak lanjut
                hasil pendampingan beserta target & statusnya.
              </p>
            </Step>
            <Step n="6" title="Pantau Hasil Kuis Peserta">
              <p>
                Buka <Pill>Hasil Kuis</Pill> untuk melihat skor kuis peserta
                perwakilan desa: nama, nilai, dan status lulus.
              </p>
            </Step>
            <Step n="7" title="Lihat Riwayat Program">
              <p>
                Menu <Pill>Riwayat Program</Pill> menyimpan rekam jejak
                pendampingan & penghargaan desa dari waktu ke waktu.
              </p>
            </Step>
            <Step n="8" title="Notifikasi, Profil & Password">
              <p>
                Ikon lonceng memberi tahu komentar/verifikasi baru. Dari menu akun,
                lengkapi profil dan ganti password.
              </p>
            </Step>
          </ol>
        </div>
      )}

      <div className="rounded-2xl border border-atr-outline bg-white p-4 shadow-atr-1">
        <h4 className="text-xs font-bold uppercase tracking-wide text-atr-fg-muted">
          Tips
        </h4>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-atr-fg-muted [&_strong]:text-atr-fg">
          <li>
            Bisa dibuka dari HP. Tambahkan ke layar utama (Add to Home Screen)
            agar seperti aplikasi.
          </li>
          <li>Selalu tekan Simpan setelah mengisi, dan tunggu tanda tersimpan.</li>
          <li>
            <strong>Profil & ganti password</strong> ada di menu akun Anda.
          </li>
        </ul>
      </div>

      <p className="pt-1 text-center text-xs text-atr-fg-muted">
        Didukung oleh Village Milestone Tracker by Atourin
      </p>
    </div>
  );
}
