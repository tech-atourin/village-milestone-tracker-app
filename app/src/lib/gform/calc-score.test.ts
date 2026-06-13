import { describe, expect, it } from "vitest";
import { calcScore } from "./score";

describe("calcScore", () => {
  it("returns null when there are no answer fields", () => {
    expect(calcScore({ "Email Address": "a@b.id", Timestamp: "x" }, "Email Address")).toBeNull();
  });

  it("counts non-empty answers, excluding identifier+meta columns", () => {
    const r = calcScore(
      {
        "Email Address": "a@b.id",
        Timestamp: "2026-06-01",
        Q1: "A",
        Q2: "B",
        Q3: "",
        Q4: "D",
      },
      "Email Address",
    );
    expect(r).toEqual({ score: 3, max: 4 });
  });

  it("treats whitespace-only as empty", () => {
    const r = calcScore({ "Email Address": "a@b.id", Q1: "   ", Q2: "ok" }, "Email Address");
    expect(r).toEqual({ score: 1, max: 2 });
  });

  it("respects custom identifier field", () => {
    const r = calcScore({ NIK: "1234567890123456", Q1: "yes" }, "NIK");
    expect(r).toEqual({ score: 1, max: 1 });
  });
});
