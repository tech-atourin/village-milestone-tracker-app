/**
 * Registry modul project - satu sumber kebenaran untuk fitur opsional yang
 * bisa dinyalakan/dimatikan per project (disimpan di projects.enabled_modules
 * sebagai jsonb). Tambah modul baru cukup dengan menambah entri di sini; wizard
 * buat project, tab Pengaturan, dan gating tab/nav semuanya membaca dari sini.
 */

export type ModuleKey =
  | "desa_baseline"
  | "topik_pendampingan"
  | "capacity_building"
  | "klasifikasi_nasional"
  | "public_dashboard"
  | "logbook"
  | "batch"
  | "analisis"
  | "narasumber"
  | "kuis"
  | "kehadiran"
  | "rencana_aksi"
  | "evidence"
  | "materi";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  description: string;
  /** Nilai default saat project baru dibuat. */
  default: boolean;
  /** Hanya relevan untuk program berbasis desa (desa_based). */
  desaOnly?: boolean;
  /** Tidak ditampilkan di checklist modul (punya kontrol sendiri / level program). */
  hidden?: boolean;
};

export const PROJECT_MODULES: ModuleDef[] = [
  {
    key: "desa_baseline",
    label: "Baseline Desa",
    description: "Peserta/desa mengisi data baseline profil desa.",
    default: true,
    desaOnly: true,
  },
  {
    key: "topik_pendampingan",
    label: "Topik Pendampingan",
    description: "Modul/topik pendampingan beserta checklist tugas.",
    default: true,
  },
  {
    key: "capacity_building",
    label: "Capacity Building (Rapor)",
    description: "Rapor peserta: pre/post-test, tugas, nilai akhir, sertifikat.",
    default: true,
  },
  {
    key: "klasifikasi_nasional",
    label: "Klasifikasi Nasional",
    description: "Penilaian klasifikasi desa berbasis Permenpar/ADWI.",
    default: false,
    desaOnly: true,
    // Dikelola di level program/halaman klasifikasi terpisah, bukan tab
    // detail project - jangan tampilkan di checklist modul project.
    hidden: true,
  },
  {
    key: "public_dashboard",
    label: "Shareable Link Publik",
    description: "Dashboard ringkas yang bisa dibagikan ke mitra/sponsor.",
    default: false,
    // Punya kontrol sendiri (tombol Shareable link di header project).
    hidden: true,
  },
  {
    key: "logbook",
    label: "Log Book Personil",
    description:
      "Tim pelaksana project mencatat agenda kegiatan harian selama masa kerja.",
    default: false,
  },
  {
    key: "batch",
    label: "Batch / Gelombang Peserta",
    description:
      "Kelompokkan peserta ke dalam batch (gelombang) dengan jadwal dan laporan per batch.",
    default: false,
  },
  {
    key: "kuis",
    label: "Kuis & Tes",
    description: "Pre-test, post-test, dan kuisioner beserta hasilnya.",
    default: true,
  },
  {
    key: "kehadiran",
    label: "Kehadiran",
    description: "Check-in kehadiran peserta per materi/topik.",
    default: true,
  },
  {
    key: "narasumber",
    label: "Narasumber & Pendampingan",
    description: "Penugasan narasumber dan sesi pendampingan.",
    default: true,
  },
  {
    key: "rencana_aksi",
    label: "Rencana Aksi",
    description: "Rencana tindak lanjut yang disusun peserta/narasumber.",
    default: true,
  },
  {
    key: "evidence",
    label: "Bukti / Evidence",
    description: "Perpustakaan bukti/dokumen pendukung project.",
    default: true,
  },
  {
    key: "materi",
    label: "Materi & Tautan",
    description: "File materi dan tautan yang dibagikan ke peserta.",
    default: true,
  },
  {
    key: "analisis",
    label: "Analisis AI (Ringkasan & SWOT)",
    description: "Ringkasan program dan analisis SWOT berbasis AI per desa.",
    default: true,
    desaOnly: true,
  },
];

export const DEFAULT_ENABLED_MODULES: Record<string, boolean> =
  Object.fromEntries(PROJECT_MODULES.map((m) => [m.key, m.default]));

export function moduleEnabled(
  enabled: Record<string, boolean> | null | undefined,
  key: ModuleKey,
): boolean {
  return enabled?.[key] === true;
}

const MODULE_DEFAULTS: Record<string, boolean> = Object.fromEntries(
  PROJECT_MODULES.map((m) => [m.key, m.default]),
);

/**
 * Apakah modul aktif untuk sebuah project. Bila key belum tersimpan di
 * enabled_modules (project lama), pakai default modul - jadi modul yang
 * default true tetap tampil untuk project lama, dan modul baru (default
 * false) tetap tersembunyi sampai dinyalakan.
 */
export function isModuleOn(
  enabled: Record<string, boolean> | null | undefined,
  key: string,
): boolean {
  const v = enabled?.[key];
  if (typeof v === "boolean") return v;
  return MODULE_DEFAULTS[key] ?? false;
}

/** Modul yang bisa dicentang admin (buang yang hidden). */
export const SELECTABLE_MODULES: ModuleDef[] = PROJECT_MODULES.filter(
  (m) => !m.hidden,
);

/** Modul yang relevan untuk tipe program tertentu (sembunyikan desaOnly di pelaku_pariwisata + yang hidden). */
export function modulesForProgram(
  programType: "desa_based" | "pelaku_pariwisata",
): ModuleDef[] {
  const base = SELECTABLE_MODULES;
  if (programType === "desa_based") return base;
  return base.filter((m) => !m.desaOnly);
}
