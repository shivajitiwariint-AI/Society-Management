import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const timestampSchema = z.string().trim().refine((value) => !Number.isNaN(Date.parse(value)), 'Use a valid date/time');
const money = z.number().positive().max(1_000_000_000);

function optionalFormValue<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());
}

export const createChargeSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  chargeType: z.enum(['FIXED', 'AREA', 'USAGE', 'ONE_TIME']),
  amount: money,
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME']).default('MONTHLY'),
  isActive: z.boolean().default(true),
}).strict();

export const updateChargeSchema = createChargeSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const createAccountSchema = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(120),
  accountType: z.enum(['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY']),
  isActive: z.boolean().default(true),
}).strict();

export const updateAccountSchema = createAccountSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const lockPeriodSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM'),
  locked: z.boolean(),
  reason: z.string().trim().min(3).max(500),
}).strict();

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().positive().max(100000).default(1),
  unitAmount: money,
  chargeCode: optionalFormValue(z.string().trim().max(40)),
}).strict();

export const createInvoiceSchema = z.object({
  invoiceNumber: optionalFormValue(z.string().trim().min(3).max(40)),
  residentId: optionalFormValue(z.uuid()),
  flatId: optionalFormValue(z.uuid()),
  issueDate: dateSchema,
  dueDate: dateSchema,
  periodKey: optionalFormValue(z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM')),
  notes: optionalFormValue(z.string().trim().max(500)),
  items: z.array(invoiceItemSchema).min(1).max(50),
}).strict().refine((value) => value.dueDate >= value.issueDate, {
  message: 'dueDate must not precede issueDate',
  path: ['dueDate'],
});

export const createPaymentSchema = z.object({
  invoiceId: optionalFormValue(z.uuid()),
  residentId: optionalFormValue(z.uuid()),
  receiptNumber: optionalFormValue(z.string().trim().min(3).max(40)),
  amount: money,
  method: z.enum(['OFFLINE', 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER']).default('OFFLINE'),
  reference: optionalFormValue(z.string().trim().max(120)),
  paidAt: optionalFormValue(timestampSchema),
}).strict();

export const approvePaymentSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().min(3).max(500),
}).strict();

export const createRefundSchema = z.object({
  amount: money,
  reason: z.string().trim().min(3).max(500),
}).strict();

const journalLineSchema = z.object({
  accountId: z.uuid(),
  debit: z.number().min(0).max(1_000_000_000).default(0),
  credit: z.number().min(0).max(1_000_000_000).default(0),
  narrative: optionalFormValue(z.string().trim().max(200)),
}).strict().refine((value) => (value.debit > 0) !== (value.credit > 0), {
  message: 'Each line must have either a debit or a credit, not both',
});

export const createJournalSchema = z.object({
  entryNumber: optionalFormValue(z.string().trim().min(3).max(40)),
  entryDate: dateSchema,
  description: z.string().trim().min(3).max(300),
  periodKey: optionalFormValue(z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM')),
  lines: z.array(journalLineSchema).min(2).max(40),
}).strict().refine(
  (value) => value.lines.reduce((sum, line) => sum + line.debit - line.credit, 0) === 0,
  { message: 'Debits must equal credits', path: ['lines'] },
);

export const postJournalSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type UpdateChargeInput = z.infer<typeof updateChargeSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type LockPeriodInput = z.infer<typeof lockPeriodSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type PostJournalInput = z.infer<typeof postJournalSchema>;
