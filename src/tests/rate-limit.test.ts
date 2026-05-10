import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under limit", () => {
    const key = "test-under-limit";
    expect(rateLimit(key, 5, 60000)).toBe(true);
    expect(rateLimit(key, 5, 60000)).toBe(true);
    expect(rateLimit(key, 5, 60000)).toBe(true);
  });

  it("blocks requests over limit", () => {
    const key = "test-over-limit";
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60000);
    }
    // 4th request should be blocked
    expect(rateLimit(key, 3, 60000)).toBe(false);
    expect(rateLimit(key, 3, 60000)).toBe(false);
  });

  it("resets after window expires", () => {
    const key = "test-reset";
    // Use up all requests
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 10000);
    }
    expect(rateLimit(key, 3, 10000)).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(11000);

    // Should be allowed again
    expect(rateLimit(key, 3, 10000)).toBe(true);
  });

  it("different keys are independent", () => {
    const keyA = "test-key-a";
    const keyB = "test-key-b";

    // Fill up key A
    for (let i = 0; i < 2; i++) {
      rateLimit(keyA, 2, 60000);
    }
    expect(rateLimit(keyA, 2, 60000)).toBe(false);

    // Key B should still work
    expect(rateLimit(keyB, 2, 60000)).toBe(true);
    expect(rateLimit(keyB, 2, 60000)).toBe(true);
    expect(rateLimit(keyB, 2, 60000)).toBe(false);
  });

  it("first request always succeeds", () => {
    expect(rateLimit("fresh-key", 1, 60000)).toBe(true);
  });

  it("limit of 1 blocks second request", () => {
    const key = "limit-one";
    expect(rateLimit(key, 1, 60000)).toBe(true);
    expect(rateLimit(key, 1, 60000)).toBe(false);
  });

  it("count resets precisely at window boundary", () => {
    const key = "boundary-test";
    rateLimit(key, 1, 5000);
    expect(rateLimit(key, 1, 5000)).toBe(false);

    // Advance to just before window expires
    vi.advanceTimersByTime(4999);
    expect(rateLimit(key, 1, 5000)).toBe(false);

    // Advance past window
    vi.advanceTimersByTime(2);
    expect(rateLimit(key, 1, 5000)).toBe(true);
  });
});
