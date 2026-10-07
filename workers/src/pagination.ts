export interface Pagination { page: number; pageSize: number; totalItems: number; totalPages: number }

export function parsePagination(url: URL): { page: number; pageSize: number } {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? 20) || 20));
  return { page, pageSize };
}

export function pageOf<T>(items: T[], totalItems: number, page: number, pageSize: number) {
  const pagination: Pagination = { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) };
  return { data: items, pagination };
}
