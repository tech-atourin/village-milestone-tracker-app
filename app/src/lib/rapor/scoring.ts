// =====================================================
// Komposisi penilaian peserta (satu sumber kebenaran)
// =====================================================
// Default (skema BAKTI):
//   Pre-Test    10%
//   Post-Test   10%
//   Tugas       50%
//   Keaktifan   30%
//   Lulus       Nilai Akhir >= 70
//
// Bobot dan batas lulus BISA diatur berbeda per project (mis. BAKTI vs Bank
// Indonesia vs BRI) lewat kolom projects.grading_config. Fungsi di bawah
// menerima override opsional; tanpa override memakai default BAKTI.
//
// Nilai Akhir = jumlah (nilai komponen x bobot). Hanya dihitung bila SEMUA
// komponen berbobot > 0 sudah terisi. Kalau ada yang kosong, hasilnya null
// (bukan 0) supaya peserta tidak melihat nilai yang menyesatkan.
// =====================================================

export type BobotKey = "pre_test" | "post_test" | "tugas" | "keaktifan";

export type GradingWeights = Record<BobotKey, number>;

export type GradingConfig = {
  weights: GradingWeights;
  passing_score: number;
};

// Default = skema BAKTI. Bobot dalam fraksi (0..1).
export const DEFAULT_BOBOT: GradingWeights = {
  pre_test: 0.1,
  post_test: 0.1,
  tugas: 0.5,
  keaktifan: 0.3,
};

export const DEFAULT_NILAI_MINIMUM_LULUS = 70;

export const DEFAULT_GRADING_CONFIG: GradingConfig = {
  weights: DEFAULT_BOBOT,
  passing_score: DEFAULT_NILAI_MINIMUM_LULUS,
};

// Alias lama supaya import yang sudah ada tetap jalan.
export const BOBOT = DEFAULT_BOBOT;
export const NILAI_MINIMUM_LULUS = DEFAULT_NILAI_MINIMUM_LULUS;

const KEY_LABEL: Record<BobotKey, string> = {
  pre_test: "Pre-Test",
  post_test: "Post-Test",
  tugas: "Tugas",
  keaktifan: "Keaktifan",
};

/**
 * Normalisasi konfigurasi mentah (dari DB / form) ke bentuk aman:
 * - Bobot tak dikenal diabaikan, yang hilang diisi 0.
 * - Bobot boleh disimpan sebagai persen (0..100) atau fraksi (0..1); kalau
 *   totalnya jauh di atas 1 dianggap persen lalu dibagi 100.
 * - Kalau semua bobot 0 / tidak valid, jatuh ke default BAKTI.
 */
export function resolveGradingConfig(
  raw: Partial<GradingConfig> | null | undefined,
): GradingConfig {
  if (!raw || typeof raw !== "object")
    return { ...DEFAULT_GRADING_CONFIG, weights: { ...DEFAULT_BOBOT } };

  const rawWeights = (raw.weights ?? {}) as Partial<Record<BobotKey, unknown>>;
  const cleaned: GradingWeights = { pre_test: 0, post_test: 0, tugas: 0, keaktifan: 0 };
  let sum = 0;
  for (const key of Object.keys(cleaned) as BobotKey[]) {
    const n = Number(rawWeights[key]);
    const v = Number.isFinite(n) && n > 0 ? n : 0;
    cleaned[key] = v;
    sum += v;
  }
  if (sum <= 0)
    return {
      weights: { ...DEFAULT_BOBOT },
      passing_score: normalizePassing(raw.passing_score),
    };
  // Kalau tersimpan sebagai persen (total ~100), ubah ke fraksi.
  if (sum > 1.5) {
    for (const key of Object.keys(cleaned) as BobotKey[])
      cleaned[key] = cleaned[key] / sum;
  }
  return { weights: cleaned, passing_score: normalizePassing(raw.passing_score) };
}

function normalizePassing(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) return DEFAULT_NILAI_MINIMUM_LULUS;
  return n;
}

/** Label + persen untuk ditampilkan, dari config (default BAKTI). */
export function bobotLabels(
  config?: Partial<GradingConfig> | null,
): Array<{ key: BobotKey; label: string; percent: string }> {
  const { weights } = resolveGradingConfig(config);
  return (Object.keys(weights) as BobotKey[])
    .filter((k) => weights[k] > 0)
    .map((k) => ({
      key: k,
      label: KEY_LABEL[k],
      percent: `${Math.round(weights[k] * 100)}%`,
    }));
}

// Alias lama (default BAKTI) untuk komponen yang belum meneruskan config.
export const BOBOT_LABEL = bobotLabels();

export type NilaiKomponen = {
  pre_test_score: number | null | undefined;
  post_test_score: number | null | undefined;
  tugas_score: number | null | undefined;
  keaktifan_score: number | null | undefined;
};

/**
 * Lengkap bila semua komponen yang BERBOBOT (weight > 0) sudah terisi.
 * Komponen berbobot 0 tidak wajib.
 */
export function isNilaiLengkap(
  n: NilaiKomponen,
  config?: Partial<GradingConfig> | null,
): boolean {
  const { weights } = resolveGradingConfig(config);
  return (Object.keys(weights) as BobotKey[]).every(
    (k) => weights[k] <= 0 || n[`${k}_score` as keyof NilaiKomponen] != null,
  );
}

/**
 * Nilai Akhir berbobot, dibulatkan 2 desimal.
 * Mengembalikan null bila ada komponen berbobot yang belum diisi.
 */
export function hitungNilaiAkhir(
  n: NilaiKomponen,
  config?: Partial<GradingConfig> | null,
): number | null {
  const { weights } = resolveGradingConfig(config);
  if (!isNilaiLengkap(n, config)) return null;
  let total = 0;
  for (const key of Object.keys(weights) as BobotKey[]) {
    if (weights[key] <= 0) continue;
    const v = n[`${key}_score` as keyof NilaiKomponen] as number;
    total += v * weights[key];
  }
  return Math.round(total * 100) / 100;
}

/**
 * Lulus bila Nilai Akhir sudah lengkap dan >= batas lulus.
 * Nilai yang belum lengkap (null) dianggap belum lulus, bukan gagal.
 */
export function isLulus(
  nilaiAkhir: number | null | undefined,
  config?: Partial<GradingConfig> | null,
): boolean {
  const { passing_score } = resolveGradingConfig(config);
  return nilaiAkhir != null && nilaiAkhir >= passing_score;
}

/** Predikat huruf dari nilai akhir (relatif terhadap batas lulus). */
export function predikat(
  nilai: number | null,
  config?: Partial<GradingConfig> | null,
): string {
  if (nilai == null) return "-";
  const { passing_score } = resolveGradingConfig(config);
  if (nilai >= passing_score + 15) return "Sangat Baik";
  if (nilai >= passing_score) return "Baik";
  if (nilai >= Math.max(passing_score - 15, 0)) return "Cukup";
  return "Perlu Peningkatan";
}
