import { describe, it, expect } from "vitest";
import {
  hitungNilaiAkhir,
  isLulus,
  resolveGradingConfig,
  bobotLabels,
  DEFAULT_BOBOT,
} from "./scoring";

const komplet = {
  pre_test_score: 80,
  post_test_score: 90,
  tugas_score: 70,
  keaktifan_score: 60,
};

describe("scoring - default (BAKTI)", () => {
  it("hitung nilai akhir dengan bobot default", () => {
    // 80*.1 + 90*.1 + 70*.5 + 60*.3 = 8 + 9 + 35 + 18 = 70
    expect(hitungNilaiAkhir(komplet)).toBe(70);
  });
  it("null bila ada komponen berbobot yang kosong", () => {
    expect(hitungNilaiAkhir({ ...komplet, tugas_score: null })).toBeNull();
  });
  it("lulus default di ambang 70", () => {
    expect(isLulus(70)).toBe(true);
    expect(isLulus(69.99)).toBe(false);
    expect(isLulus(null)).toBe(false);
  });
});

describe("scoring - config per project", () => {
  it("bobot custom (persen) dinormalisasi ke fraksi", () => {
    const cfg = resolveGradingConfig({
      weights: { pre_test: 0, post_test: 40, tugas: 40, keaktifan: 20 },
      passing_score: 75,
    });
    const total =
      cfg.weights.pre_test +
      cfg.weights.post_test +
      cfg.weights.tugas +
      cfg.weights.keaktifan;
    expect(Math.round(total * 100) / 100).toBe(1);
    expect(cfg.passing_score).toBe(75);
  });

  it("komponen berbobot 0 tidak wajib diisi", () => {
    const cfg = {
      weights: { pre_test: 0, post_test: 0.4, tugas: 0.4, keaktifan: 0.2 },
      passing_score: 75,
    };
    // pre_test kosong tapi bobotnya 0 -> tetap dianggap lengkap
    const nilai = hitungNilaiAkhir(
      { ...komplet, pre_test_score: null },
      cfg,
    );
    // 90*.4 + 70*.4 + 60*.2 = 36 + 28 + 12 = 76
    expect(nilai).toBe(76);
  });

  it("batas lulus mengikuti config", () => {
    const cfg = { weights: DEFAULT_BOBOT, passing_score: 80 };
    expect(isLulus(76, cfg)).toBe(false);
    expect(isLulus(80, cfg)).toBe(true);
  });

  it("config kosong jatuh ke default BAKTI", () => {
    expect(hitungNilaiAkhir(komplet, {})).toBe(70);
    expect(isLulus(70, null)).toBe(true);
  });

  it("label hanya komponen berbobot > 0", () => {
    const labels = bobotLabels({
      weights: { pre_test: 0, post_test: 0.4, tugas: 0.4, keaktifan: 0.2 },
      passing_score: 75,
    });
    expect(labels.map((l) => l.key)).toEqual(["post_test", "tugas", "keaktifan"]);
    expect(labels.find((l) => l.key === "post_test")?.percent).toBe("40%");
  });
});
