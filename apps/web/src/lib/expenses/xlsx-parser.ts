import ExcelJS from 'exceljs';
import { MAINTENANCE_EXPENSE_CATEGORIES } from '@society/shared';
import type { ParsedExpenseRow, ParseResult } from './import-types';

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const VALID_CATEGORIES = new Set<string>(MAINTENANCE_EXPENSE_CATEGORIES);

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '');
    if ('result' in value) return String(value.result ?? '');
    return '';
  }
  return String(value);
}

function parseMonth(value: ExcelJS.CellValue): string {
  if (value instanceof Date) return value.toISOString().slice(0, 7);
  if (typeof value === 'number' && value > 30000 && value < 80000) {
    return new Date(EXCEL_EPOCH_UTC + Math.floor(value) * 86400000).toISOString().slice(0, 7);
  }
  const text = cellText(value).trim();
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(text)) return text.slice(0, 7);
  return text;
}

function parseAmount(value: ExcelJS.CellValue): string {
  if (typeof value === 'number') return value.toFixed(2);
  return cellText(value).replace(/[₹,\s]/g, '').trim();
}

/** Parses the OVH "Monthly Expense Detail" sheet into validated-looking rows. */
export async function parseExpenseWorkbook(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);

  const sheet =
    workbook.getWorksheet('Monthly Expense Detail') ??
    workbook.worksheets.find((worksheet) => {
      const values = worksheet.getRow(1).values as ExcelJS.CellValue[];
      return values.some((value: ExcelJS.CellValue) => cellText(value).toLowerCase().includes('expense'));
    }) ??
    workbook.worksheets[0];

  if (!sheet) {
    return { rows: [], errors: [{ row: 0, message: 'The workbook contains no worksheets' }], sheetName: null };
  }

  let headerRow = 0;
  sheet.eachRow((row, rowNumber) => {
    if (headerRow > 0) return;
    const first = cellText(row.getCell(1).value).trim().toLowerCase();
    const second = cellText(row.getCell(2).value).trim().toLowerCase();
    if (first === 'month' && second.includes('category')) headerRow = rowNumber;
  });

  if (headerRow === 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Could not find a "Month / Expense Category" header row' }],
      sheetName: sheet.name,
    };
  }

  const rows: ParsedExpenseRow[] = [];
  const errors: ParseResult['errors'] = [];
  let blankStreak = 0;

  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const month = parseMonth(row.getCell(1).value);
    const category = cellText(row.getCell(2).value).trim();
    const vendorPayee = cellText(row.getCell(3).value).trim() || null;
    const voucherRef = cellText(row.getCell(4).value).trim() || null;
    const amount = parseAmount(row.getCell(5).value);
    const remarks = cellText(row.getCell(6).value).trim() || null;

    if (!month && !category && !amount) {
      blankStreak += 1;
      if (blankStreak >= 3 && rows.length > 0) break;
      continue;
    }
    blankStreak = 0;

    if (!VALID_CATEGORIES.has(category)) {
      errors.push({ row: rowNumber, message: `Unknown category "${category}"` });
      continue;
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      errors.push({ row: rowNumber, message: `Invalid month "${month}"` });
      continue;
    }
    if (!amount || Number.isNaN(Number(amount))) {
      errors.push({ row: rowNumber, message: `Invalid amount "${amount}"` });
      continue;
    }

    rows.push({ month, category, vendorPayee, voucherRef, amount, remarks });
  }

  return { rows, errors, sheetName: sheet.name };
}
