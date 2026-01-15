/**
 * Generic API success response
 */
export interface ApiResponse<T> {
  data: T;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
}

/**
 * Cursor-based pagination metadata
 */
export interface PaginationMeta {
  has_next: boolean;
  has_prev: boolean;
  next_cursor: string;
  prev_cursor: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}
