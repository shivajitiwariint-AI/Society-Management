import { z } from 'zod';

export const idSchema = z.uuid();
export const nonEmptyText = z.string().trim().min(1).max(200);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

/** Platform setting values accept any JSON payload except undefined. */
export const jsonValueSchema = z.unknown().refine((value) => value !== undefined, {
  message: 'A JSON value is required',
});

export const updateSystemSettingSchema = z.object({
  key: z.string().trim().min(2).max(120),
  value: jsonValueSchema,
  reason: z.string().trim().min(5).max(500),
}).strict();

export type Pagination = z.infer<typeof paginationSchema>;

export function paginationOffset(pagination: Pagination): number {
  return (pagination.page - 1) * pagination.pageSize;
}

/** Reject unexpected keys at every trust boundary (SRS 11.2). */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  return schema.parse(input);
}
