// Simplify recursive partial to avoid union distribution across primitives
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Pagination metadata shared by cursor-based endpoints.
 * `total` is omitted when not supplied by the backend (e.g., keywords listing).
 */
export interface CursorPageInfo {
  nextCursor: string | null;
  total?: number | null;
}

export interface PaginationResponse<TItem> {
  items: TItem[];
  pageInfo: CursorPageInfo;
}
