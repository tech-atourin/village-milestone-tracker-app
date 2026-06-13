import { describe, expect, it } from "vitest";
import { computeScore } from "./scoring";
import type { HubAssessmentDefinition } from "@/server/queries/hub-assessment";

const def: HubAssessmentDefinition = {
  pillars: [
    {
      key: "daya_tarik",
      title: "Daya Tarik",
      questions: [
        {
          id: "dt1",
          type: "single",
          label: "single q",
          options: ["A", "B", "C", "D"],
          weight: 4,
        },
        {
          id: "dt2",
          type: "multi",
          label: "multi q",
          options: ["x", "y", "z"],
          weight: 3,
        },
        { id: "dt3", type: "slider", label: "slider q", min: 1, max: 5, weight: 2 },
        { id: "dt4", type: "text", label: "text q", weight: 1 },
      ],
    },
  ],
  scoring: {
    tiers: [
      { min: 0, max: 40, label: "Rintisan" },
      { min: 40, max: 60, label: "Berkembang" },
      { min: 60, max: 80, label: "Maju" },
      { min: 80, max: 100, label: "Mandiri" },
    ],
  },
};

describe("hub-assessment scoring", () => {
  it("returns 0 for empty answers", () => {
    const r = computeScore(def, {});
    expect(r.skor_total).toBe(0);
    expect(r.level_hasil).toBe("Rintisan");
  });

  it("single select: last option = full weight", () => {
    const r = computeScore(def, { dt1: "D" });
    expect(r.skor_pilar.daya_tarik.skor).toBeGreaterThanOrEqual(4);
  });

  it("multi select: all options selected = full weight", () => {
    const r = computeScore(def, { dt2: ["x", "y", "z"] });
    expect(r.skor_pilar.daya_tarik.skor).toBe(3);
  });

  it("slider at max = full weight", () => {
    const r = computeScore(def, { dt3: 5 });
    expect(r.skor_pilar.daya_tarik.skor).toBe(2);
  });

  it("text with content >= 3 chars = full weight", () => {
    const r = computeScore(def, { dt4: "ok!" });
    expect(r.skor_pilar.daya_tarik.skor).toBe(1);
  });

  it("text below threshold = 0", () => {
    const r = computeScore(def, { dt4: "no" });
    expect(r.skor_pilar.daya_tarik.skor).toBe(0);
  });

  it("perfect answers reach Mandiri tier", () => {
    const r = computeScore(def, {
      dt1: "D",
      dt2: ["x", "y", "z"],
      dt3: 5,
      dt4: "long answer here",
    });
    expect(r.skor_total).toBe(100);
    expect(r.level_hasil).toBe("Mandiri");
  });

  it("middle-ish answers land in Berkembang", () => {
    const r = computeScore(def, {
      dt1: "B",
      dt2: ["x"],
      dt3: 3,
      dt4: "abc",
    });
    expect(r.skor_total).toBeGreaterThan(40);
    expect(r.skor_total).toBeLessThan(80);
  });

  it("invalid option for single returns 0 for that question", () => {
    const r = computeScore(def, { dt1: "NOT-AN-OPTION" });
    expect(r.skor_pilar.daya_tarik.skor).toBe(0);
  });

  it("slider out-of-range clamps", () => {
    const r1 = computeScore(def, { dt3: 100 });
    const r2 = computeScore(def, { dt3: -10 });
    expect(r1.skor_pilar.daya_tarik.skor).toBe(2);
    expect(r2.skor_pilar.daya_tarik.skor).toBe(0);
  });
});
