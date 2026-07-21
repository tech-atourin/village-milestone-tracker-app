// =====================================================
// Komposisi penilaian peserta (satu sumber kebenaran)
// =====================================================
//   Pre-Test    10%
//   Post-Test   10%
//   Tugas       50%
//   Keaktifan   30%
//
// Nilai Akhir = (Pre x 10%) + (Post x 10%) + (Tugas x 50%) + (Keaktifan x 30%)
//
// Nilai Akhir hanya dihitung bila KEEMPAT komponen terisi. Kalau ada yang
// kosong, hasilnya null (bukan 0) supaya peserta tidak melihat nilai yang
// menyesatkan saat penilaian belum lengkap.
// =====================================================

export const BOBOT = {
  pre_test: 0.1,
  post_test: 0.1,
  tugas: 0.5,
  keaktifan: 0.3,
} as const;

export const BOBOT_LABEL: Array<{ key: keyof typeof BOBOT; label: string; percent: string }> = [
  { key: "pre_test", label: "Pre-Test", percent: "10%" },
  { key: "post_test", label: "Post-Test", percent: "10%" },
  { key: "tugas", label: "Tugas", percent: "50%" },
  { key: "keaktifan", label: "Keaktifan", percent: "30%" },
];

export type NilaiKomponen = {
  pre_test_score: number | null | undefined;
  post_test_score: number | null | undefined;
  tugas_score: number | null | undefined;
  keaktifan_score: number | null | undefined;
};

export function isNilaiLengkap(n: NilaiKomponen): boolean {
  return (
    n.pre_test_score != null &&
    n.post_test_score != null &&
    n.tugas_score != null &&
    n.keaktifan_score != null
  );
}

/**
 * Nilai Akhir berbobot, dibulatkan 2 desimal.
 * Mengembalikan null bila ada komponen yang belum diisi.
 */
export function hitungNilaiAkhir(n: NilaiKomponen): number | null {
  if (!isNilaiLengkap(n)) return null;
  const total =
    (n.pre_test_score as number) * BOBOT.pre_test +
    (n.post_test_score as number) * BOBOT.post_test +
    (n.tugas_score as number) * BOBOT.tugas +
    (n.keaktifan_score as number) * BOBOT.keaktifan;
  return Math.round(total * 100) / 100;
}

/** Nilai Akhir minimum untuk lulus / berhak atas sertifikat. */
export const NILAI_MINIMUM_LULUS = 70;

/**
 * Lulus bila Nilai Akhir sudah lengkap dan >= NILAI_MINIMUM_LULUS.
 * Nilai yang belum lengkap (null) dianggap belum lulus, bukan gagal.
 */
export function isLulus(nilaiAkhir: number | null | undefined): boolean {
  return nilaiAkhir != null && nilaiAkhir >= NILAI_MINIMUM_LULUS;
}

/** Predikat huruf dari nilai akhir. */
export function predikat(nilai: number | null): string {
  if (nilai == null) return "-";
  if (nilai >= 85) return "Sangat Baik";
  if (nilai >= 70) return "Baik";
  if (nilai >= 55) return "Cukup";
  return "Perlu Peningkatan";
}
