export const EXPENSE_IMPORT_SOURCES = ['MANUAL', 'IMPORTED', 'SAMPLE'] as const;
export type ExpenseImportSource = (typeof EXPENSE_IMPORT_SOURCES)[number];

export interface ParsedExpenseRow {
  month: string;
  category: string;
  vendorPayee: string | null;
  voucherRef: string | null;
  amount: string;
  remarks: string | null;
}

export interface ParseResult {
  rows: ParsedExpenseRow[];
  errors: Array<{ row: number; message: string }>;
  sheetName: string | null;
}
