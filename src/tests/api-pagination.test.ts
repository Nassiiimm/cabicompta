import { describe, it, expect } from "vitest";

/**
 * Unit tests for pagination logic used across API routes.
 * Pattern from /api/invoices/route.ts:
 *   const page = parseInt(searchParams.get("page") ?? "1");
 *   const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
 *   const offset = (page - 1) * limit;
 */
function parsePagination(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

describe("Pagination logic", () => {
  it("defaults to page=1, limit=50", () => {
    const params = new URLSearchParams();
    const { page, limit, offset } = parsePagination(params);
    expect(page).toBe(1);
    expect(limit).toBe(50);
    expect(offset).toBe(0);
  });

  it("limit is capped at 200", () => {
    const params = new URLSearchParams({ limit: "500" });
    const { limit } = parsePagination(params);
    expect(limit).toBe(200);
  });

  it("limit=200 is allowed", () => {
    const params = new URLSearchParams({ limit: "200" });
    const { limit } = parsePagination(params);
    expect(limit).toBe(200);
  });

  it("offset is calculated correctly: (page-1)*limit", () => {
    const params = new URLSearchParams({ page: "3", limit: "20" });
    const { page, limit, offset } = parsePagination(params);
    expect(page).toBe(3);
    expect(limit).toBe(20);
    expect(offset).toBe(40);
  });

  it("page=1 gives offset=0", () => {
    const params = new URLSearchParams({ page: "1", limit: "25" });
    const { offset } = parsePagination(params);
    expect(offset).toBe(0);
  });

  it("page=2 with default limit gives offset=50", () => {
    const params = new URLSearchParams({ page: "2" });
    const { offset } = parsePagination(params);
    expect(offset).toBe(50);
  });

  it("page=0 results in negative offset (edge case)", () => {
    const params = new URLSearchParams({ page: "0" });
    const { page, offset } = parsePagination(params);
    expect(page).toBe(0);
    expect(offset).toBe(-50);
  });

  it("negative page results in negative offset (edge case)", () => {
    const params = new URLSearchParams({ page: "-1" });
    const { page, offset } = parsePagination(params);
    expect(page).toBe(-1);
    expect(offset).toBe(-100);
  });

  it("non-numeric page falls back to NaN", () => {
    const params = new URLSearchParams({ page: "abc" });
    const { page } = parsePagination(params);
    expect(Number.isNaN(page)).toBe(true);
  });

  it("limit=1 works for single-item queries", () => {
    const params = new URLSearchParams({ page: "5", limit: "1" });
    const { limit, offset } = parsePagination(params);
    expect(limit).toBe(1);
    expect(offset).toBe(4);
  });

  it("large page number computes correct offset", () => {
    const params = new URLSearchParams({ page: "100", limit: "10" });
    const { offset } = parsePagination(params);
    expect(offset).toBe(990);
  });
});
