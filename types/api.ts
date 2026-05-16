export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  meta?: { page?: number; total?: number; limit?: number };
};
