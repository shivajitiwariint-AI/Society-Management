import { z } from 'zod';
import { MAINTENANCE_EXPENSE_CATEGORIES, MAINTENANCE_EXPENSE_SOURCES } from '@society/shared';

/** UI month inputs use YYYY-MM; the database stores the first day of that month. */
export const expenseMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');

export const createMaintenanceExpenseSchema = z.object({
  month: expenseMonthSchema,
  category: z.enum(MAINTENANCE_EXPENSE_CATEGORIES),
  vendorPayee: z.string().trim().max(200).optional(),
  vendorRecordId: z.string().uuid().optional(),
  voucherRef: z.string().trim().max(100).optional(),
  amount: z.number().positive().max(100_000_000),
  remarks: z.string().trim().max(500).optional(),
}).strict();

export const updateMaintenanceExpenseSchema = createMaintenanceExpenseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const maintenanceExpenseQuerySchema = z.object({
  monthFrom: expenseMonthSchema.optional(),
  monthTo: expenseMonthSchema.optional(),
  category: z.enum(MAINTENANCE_EXPENSE_CATEGORIES).optional(),
  source: z.enum(MAINTENANCE_EXPENSE_SOURCES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type CreateMaintenanceExpenseInput = z.infer<typeof createMaintenanceExpenseSchema>;
export type UpdateMaintenanceExpenseInput = z.infer<typeof updateMaintenanceExpenseSchema>;
export type MaintenanceExpenseQuery = z.infer<typeof maintenanceExpenseQuerySchema>;
