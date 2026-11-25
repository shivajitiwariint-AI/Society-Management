import { z } from 'zod';

function optionalFormValue<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());
}

const timestampSchema = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), 'Use a valid date/time');
const amountSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : typeof value === 'string' ? Number(value) : value),
  z.number().min(0).max(1_000_000_000).optional(),
);

export const operationQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const createOperationSchema = z.object({
  code: optionalFormValue(z.string().trim().max(100)),
  title: z.string().trim().min(1).max(200),
  description: optionalFormValue(z.string().trim().max(1000)),
  status: z.string().trim().min(1).max(40).default('ACTIVE'),
  priority: optionalFormValue(z.string().trim().max(20)),
  startAt: optionalFormValue(timestampSchema),
  endAt: optionalFormValue(timestampSchema),
  amount: amountSchema,
  residentId: optionalFormValue(z.uuid()),
  flatId: optionalFormValue(z.uuid()),
  assigneeUserId: optionalFormValue(z.uuid()),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict();

export const updateOperationSchema = createOperationSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export type OperationQuery = z.infer<typeof operationQuerySchema>;
export type CreateOperationInput = z.infer<typeof createOperationSchema>;
export type UpdateOperationInput = z.infer<typeof updateOperationSchema>;
