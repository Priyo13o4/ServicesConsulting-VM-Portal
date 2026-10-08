import { describe, expect, it } from "vitest";
import { buildPagination, formatPaginatedResult } from "./helpers";

describe("Database Pagination & Helpers", () => {
  it("computes default pagination limits and offsets", () => {
    const { limit, offset, page, pageSize } = buildPagination();
    expect(page).toBe(1);
    expect(pageSize).toBe(20);
    expect(limit).toBe(20);
    expect(offset).toBe(0);
  });

  it("handles custom page and page sizes accurately", () => {
    const { limit, offset, page, pageSize } = buildPagination(3, 10);
    expect(page).toBe(3);
    expect(pageSize).toBe(10);
    expect(limit).toBe(10);
    expect(offset).toBe(20);
  });

  it("caps maximum page size to prevent unbounded memory queries", () => {
    const { pageSize } = buildPagination(1, 500);
    expect(pageSize).toBe(100);
  });

  it("normalizes negative or invalid page parameters", () => {
    const { page, pageSize, offset } = buildPagination(-5, 0);
    expect(page).toBe(1);
    expect(pageSize).toBe(20);
    expect(offset).toBe(0);
  });

  it("formats paginated result with metadata", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const res = formatPaginatedResult(items, 45, 2, 10);
    expect(res.items).toEqual(items);
    expect(res.total).toBe(45);
    expect(res.totalPages).toBe(5);
    expect(res.page).toBe(2);
    expect(res.pageSize).toBe(10);
  });
});
