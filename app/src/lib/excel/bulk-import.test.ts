import { describe, expect, it } from "vitest";
import {
  normalizePhone,
  looksLikeIndoPhone,
  normalizeDate,
  bulkRowSchema,
} from "./bulk-import";

describe("normalizePhone", () => {
  it("returns null for empty/nullish", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
  });

  it("keeps 62-prefixed numbers as is (digits only)", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
  });

  it("converts leading 0 to 62", () => {
    expect(normalizePhone("08123456789")).toBe("628123456789");
    expect(normalizePhone("0 821 9999 0000")).toBe("6282199990000");
  });

  it("adds 62 prefix when starting with 8 directly", () => {
    expect(normalizePhone("8123456789")).toBe("628123456789");
  });
});

describe("looksLikeIndoPhone", () => {
  it("accepts well-formed numbers", () => {
    expect(looksLikeIndoPhone("08123456789")).toBe(true);
    expect(looksLikeIndoPhone("+62 821 9999 0000")).toBe(true);
  });
  it("rejects too short / not Indo", () => {
    expect(looksLikeIndoPhone("123")).toBe(false);
    expect(looksLikeIndoPhone("+1 415 555 0100")).toBe(false);
  });
});

describe("normalizeDate", () => {
  it("returns null for empty inputs", () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });

  it("passes ISO YYYY-MM-DD through", () => {
    expect(normalizeDate("2026-06-13")).toBe("2026-06-13");
  });

  it("parses DD/MM/YYYY into ISO", () => {
    expect(normalizeDate("13/06/2026")).toBe("2026-06-13");
    expect(normalizeDate("1/1/2026")).toBe("2026-01-01");
  });

  it("parses Excel serial date numbers (Lotus-bug epoch)", () => {
    // Spot-check known mapping: serial 1 → 1899-12-31 (per Excel's epoch).
    expect(normalizeDate(1)).toBe("1899-12-31");
    expect(normalizeDate(45923)).toBe("2025-09-23");
  });

  it("returns null for non-date strings", () => {
    expect(normalizeDate("not a date")).toBeNull();
    expect(normalizeDate("hello world")).toBeNull();
  });
});

describe("bulkRowSchema", () => {
  it("requires at least email or phone", () => {
    const res = bulkRowSchema.safeParse({ full_name: "Budi" });
    expect(res.success).toBe(false);
  });

  it("accepts a row with email only", () => {
    const res = bulkRowSchema.safeParse({
      full_name: "Budi",
      email: "budi@desa.id",
    });
    expect(res.success).toBe(true);
  });

  it("rejects malformed indo phone", () => {
    const res = bulkRowSchema.safeParse({
      full_name: "Budi",
      phone: "+1 415 555 0100",
    });
    expect(res.success).toBe(false);
  });

  it("defaults role to peserta", () => {
    const res = bulkRowSchema.safeParse({
      full_name: "Budi",
      email: "budi@desa.id",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.role).toBe("peserta");
  });
});
