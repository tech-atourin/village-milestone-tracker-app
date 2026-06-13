import { describe, expect, it, vi } from "vitest";
import { rateLimit, ipFromHeaders } from "./rate-limit";

describe("rateLimit", () => {
  it("allows the first N requests within the window", () => {
    const key = `t1-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = rateLimit(key, { limit: 5, windowMs: 60_000 });
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(5 - 1 - i);
    }
  });

  it("blocks the (N+1)th request inside the window", () => {
    const key = `t2-${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, { limit: 3, windowMs: 60_000 });
    const blocked = rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const start = new Date("2026-01-01T00:00:00Z").getTime();
    vi.setSystemTime(start);
    const key = `t3-${Math.random()}`;
    rateLimit(key, { limit: 1, windowMs: 1000 });
    expect(rateLimit(key, { limit: 1, windowMs: 1000 }).ok).toBe(false);
    vi.setSystemTime(start + 1500);
    expect(rateLimit(key, { limit: 1, windowMs: 1000 }).ok).toBe(true);
    vi.useRealTimers();
  });

  it("tracks buckets independently per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, { limit: 1, windowMs: 60_000 });
    expect(rateLimit(a, { limit: 1, windowMs: 60_000 }).ok).toBe(false);
    expect(rateLimit(b, { limit: 1, windowMs: 60_000 }).ok).toBe(true);
  });
});

describe("ipFromHeaders", () => {
  it("prefers x-forwarded-for first hop", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(ipFromHeaders(h)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(ipFromHeaders(h)).toBe("9.9.9.9");
  });

  it("returns 'unknown' when nothing is set", () => {
    expect(ipFromHeaders(new Headers())).toBe("unknown");
  });
});
