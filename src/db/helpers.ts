/**
 * Central Drizzle ORM and Database Query Utilities
 * Provides standardized pagination, transaction execution, and query helpers
 * so that queries across modules don't duplicate boilerplate.
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function buildPagination(
  rawPage?: number,
  rawPageSize?: number
): PaginationMeta {
  const page = Math.max(1, Math.floor(rawPage ?? 1));
  const rawSize = Math.floor(rawPageSize ?? DEFAULT_PAGE_SIZE);
  const pageSize = rawSize > 0 ? Math.min(rawSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  const limit = pageSize;
  const offset = (page - 1) * pageSize;

  return { page, pageSize, limit, offset };
}

export function formatPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    total,
    totalPages,
    page,
    pageSize,
  };
}
