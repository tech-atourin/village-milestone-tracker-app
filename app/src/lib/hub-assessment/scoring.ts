import type { HubAssessmentDefinition } from "@/server/queries/hub-assessment";

function scoreSingleSelect(
  answer: unknown,
  options: string[],
  weight: number,
): number {
  if (typeof answer !== "string") return 0;
  const idx = options.indexOf(answer);
  if (idx < 0) return 0;
  const ratio = idx / Math.max(1, options.length - 1);
  return ratio * weight;
}

function scoreMultiSelect(
  answer: unknown,
  options: string[],
  weight: number,
): number {
  if (!Array.isArray(answer)) return 0;
  const checked = (answer as unknown[]).filter(
    (v): v is string => typeof v === "string" && options.includes(v),
  ).length;
  if (options.length === 0) return 0;
  return (checked / options.length) * weight;
}

function scoreSlider(
  answer: unknown,
  min: number,
  max: number,
  weight: number,
): number {
  const n = typeof answer === "number" ? answer : Number(answer);
  if (!Number.isFinite(n)) return 0;
  const range = max - min;
  if (range <= 0) return 0;
  const ratio = (Math.max(min, Math.min(max, n)) - min) / range;
  return ratio * weight;
}

function scoreText(answer: unknown, weight: number): number {
  if (typeof answer !== "string") return 0;
  return answer.trim().length >= 3 ? weight : 0;
}

export function computeScore(
  definisi: HubAssessmentDefinition,
  jawaban: Record<string, unknown>,
) {
  const skorPilar: Record<string, { skor: number; max: number }> = {};
  for (const pilar of definisi.pillars) {
    let pilarSkor = 0;
    let pilarMax = 0;
    for (const q of pilar.questions) {
      pilarMax += q.weight;
      const a = jawaban[q.id];
      switch (q.type) {
        case "single":
          pilarSkor += scoreSingleSelect(a, q.options, q.weight);
          break;
        case "multi":
          pilarSkor += scoreMultiSelect(a, q.options, q.weight);
          break;
        case "slider":
          pilarSkor += scoreSlider(a, q.min, q.max, q.weight);
          break;
        case "text":
          pilarSkor += scoreText(a, q.weight);
          break;
      }
    }
    skorPilar[pilar.key] = {
      skor: Math.round(pilarSkor * 10) / 10,
      max: pilarMax,
    };
  }
  const totalSkor = Object.values(skorPilar).reduce((a, b) => a + b.skor, 0);
  const totalMax = Object.values(skorPilar).reduce((a, b) => a + b.max, 0);
  const pct = totalMax > 0 ? (totalSkor / totalMax) * 100 : 0;
  const tier =
    definisi.scoring.tiers.find((t) => pct >= t.min && pct <= t.max) ??
    definisi.scoring.tiers[0];
  return {
    skor_pilar: skorPilar,
    skor_total: Math.round(pct * 10) / 10,
    level_hasil: tier?.label ?? "Rintisan",
  };
}
