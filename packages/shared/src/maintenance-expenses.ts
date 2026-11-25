/** Stable expense heads from the OVH monthly maintenance workbook. */
export const MAINTENANCE_EXPENSE_CATEGORIES = [
  'Common Area Electricity',
  'Plumbing & Sanitary Repairs',
  'Lift Maintenance / AMC',
  'Garbage Collection',
  'Housekeeping',
  'Security Services',
  'Water / STP / Pump Maintenance',
  'DG / Generator Maintenance',
  'Fire Safety & Equipment',
  'Common Area Repairs',
  'Pest Control',
  'Miscellaneous Society Expenses',
] as const;

export type MaintenanceExpenseCategory = (typeof MAINTENANCE_EXPENSE_CATEGORIES)[number];

export const MAINTENANCE_EXPENSE_SOURCES = ['MANUAL', 'IMPORTED', 'SAMPLE'] as const;
export type MaintenanceExpenseSource = (typeof MAINTENANCE_EXPENSE_SOURCES)[number];

/** Supporting-document categories required by the OVH workbook instructions. */
export const EXPENSE_ATTACHMENT_KINDS = [
  'BILL',
  'INVOICE',
  'AMC_AGREEMENT',
  'WORK_ORDER',
  'APPROVAL',
  'BANK_STATEMENT',
  'RECEIPT',
  'OTHER',
] as const;
export type ExpenseAttachmentKind = (typeof EXPENSE_ATTACHMENT_KINDS)[number];

export const EXPENSE_ATTACHMENT_LABELS: Record<ExpenseAttachmentKind, string> = {
  BILL: 'Electricity / utility bill',
  INVOICE: 'Vendor invoice',
  AMC_AGREEMENT: 'Lift / AMC agreement',
  WORK_ORDER: 'Work order',
  APPROVAL: 'Payment approval',
  BANK_STATEMENT: 'Bank statement',
  RECEIPT: 'Receipt',
  OTHER: 'Other document',
};

export const EXPENSE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const EXPENSE_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
] as const;
