import ExcelJS from 'exceljs';
import { z } from 'zod';
import { MAINTENANCE_EXPENSE_CATEGORIES, formatMoney, parseMoney } from '@society/shared';
import { prisma } from '@society/database';
import { guardRequest } from '@/lib/api/guard';
import { apiError } from '@/lib/api/response';

export const runtime = 'nodejs';

type View = 'detail' | 'monthly' | 'yearly' | 'category';

const TITLES: Record<View, string> = {
  detail: 'Monthly Expense Detail',
  monthly: 'Month-wise Summary',
  yearly: 'Year-wise Summary',
  category: 'Category-wise Summary',
};

const NAVY = 'FF111827';
const INDIGO = 'FF4F46E5';
const INDIGO_LIGHT = 'FFEEF2FF';
const INDIGO_MID = 'FFE0E7FF';
const AMBER = 'FFFEF3C7';
const AMBER_TEXT = 'FF92400E';
const SLATE = 'FFF8FAFC';
const BORDER = 'FFE5E7EB';
const GREEN = 'FFECFDF5';

function money(value: string | number): string {
  return formatMoney(parseMoney(String(value).replace(/,/g, '')));
}

function financialYear(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = monthNumber! >= 4 ? year! : year! - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const thinBorder = {
  top: { style: 'thin' as const, color: { argb: BORDER } },
  left: { style: 'thin' as const, color: { argb: BORDER } },
  bottom: { style: 'thin' as const, color: { argb: BORDER } },
  right: { style: 'thin' as const, color: { argb: BORDER } },
};

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

export async function GET(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  }
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const view = (url.searchParams.get('view') ?? 'detail') as View;
  const format = (url.searchParams.get('format') ?? 'xlsx') === 'csv' ? 'csv' : 'xlsx';
  if (!['detail', 'monthly', 'yearly', 'category'].includes(view)) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid export view', guard.requestId);
  }

  const [rows, society, company] = await Promise.all([
    prisma.maintenanceExpense.findMany({
      where: { companyId: guard.context.activeCompanyId!, societyId },
      orderBy: [{ month: 'asc' }, { category: 'asc' }],
      select: { month: true, category: true, vendorPayee: true, voucherRef: true, amount: true, remarks: true, source: true },
    }),
    prisma.society.findFirst({ where: { id: societyId, companyId: guard.context.activeCompanyId! }, select: { name: true } }),
    prisma.company.findUnique({ where: { id: guard.context.activeCompanyId! }, select: { name: true, currencyCode: true } }),
  ]);

  const headers: string[] = [];
  const data: string[][] = [];

  if (view === 'detail') {
    headers.push('Month', 'Expense Category', 'Vendor / Payee', 'Voucher / Bill Ref', 'Amount', 'Remarks', 'Source');
    for (const row of rows) {
      data.push([
        row.month.toISOString().slice(0, 7), row.category, row.vendorPayee ?? '', row.voucherRef ?? '',
        money(row.amount.toString()), row.remarks ?? '', row.source,
      ]);
    }
  } else {
    const grouped = new Map<string, { categories: Map<string, bigint>; total: bigint }>();
    for (const row of rows) {
      const month = row.month.toISOString().slice(0, 7);
      const key = view === 'monthly' ? month : view === 'yearly' ? financialYear(month) : row.category;
      const entry = grouped.get(key) ?? { categories: new Map<string, bigint>(), total: 0n };
      const amount = parseMoney(row.amount.toString());
      entry.total += amount;
      entry.categories.set(row.category, (entry.categories.get(row.category) ?? 0n) + amount);
      grouped.set(key, entry);
    }

    if (view === 'category') {
      headers.push('Expense Category', 'Total', 'Months', 'Average / Month');
      const monthSet = new Set(rows.map((row) => row.month.toISOString().slice(0, 7)));
      for (const [category, entry] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        data.push([
          category, formatMoney(entry.total), String(monthSet.size),
          formatMoney(monthSet.size === 0 ? 0n : entry.total / BigInt(monthSet.size)),
        ]);
      }
    } else {
      headers.push(view === 'monthly' ? 'Month' : 'Financial Year', ...MAINTENANCE_EXPENSE_CATEGORIES, 'Total');
      for (const [key, entry] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        data.push([
          key,
          ...MAINTENANCE_EXPENSE_CATEGORIES.map((category) => formatMoney(entry.categories.get(category) ?? 0n)),
          formatMoney(entry.total),
        ]);
      }
    }
  }

  const filename = `maintenance-expenses-${view}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const disposition = `attachment; filename="${filename}"`;

  if (format === 'csv') {
    const csv = [headers, ...data].map((line) => line.map((cell) => csvEscape(cell)).join(',')).join('\r\n');
    return new Response(`\uFEFF${csv}`, {
      headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': disposition },
    });
  }

  const allSample = rows.length > 0 && rows.every((row) => row.source === 'SAMPLE');
  const caption = allSample
    ? 'ILLUSTRATIVE SAMPLE — Replace these figures with actual bills, invoices, vouchers and reconciled bank entries before using them for society accounts.'
    : 'Generated from recorded expenses. Reconcile monthly totals with bank statements, cash book, vendor ledgers and accounting records.';
  const months = rows.map((row) => row.month.toISOString().slice(0, 7)).sort();
  const period = months.length > 0 ? `${months[0]} to ${months[months.length - 1]}` : 'No expense periods';
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Society Management';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(TITLES[view].slice(0, 31), { properties: { defaultRowHeight: 18 } });

  sheet.columns = headers.map((header) => ({ width: Math.min(40, Math.max(15, header.length + 4)) }));
  const lastColumn = sheet.getColumn(headers.length).letter;

  // Row 1 — main title banner
  const titleRow = sheet.addRow([`${(society?.name ?? 'Society').toUpperCase()}  |  ${TITLES[view].toUpperCase()}`]);
  sheet.mergeCells(`A1:${lastColumn}1`);
  titleRow.height = 38;
  titleRow.fill = fill(NAVY);
  titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Row 2 — context strip
  const subtitleRow = sheet.addRow([`${company?.name ?? 'Company'}   •   Period: ${period}   •   ${rows.length} rows   •   Currency: ${company?.currencyCode ?? 'INR'}`]);
  sheet.mergeCells(`A2:${lastColumn}2`);
  subtitleRow.height = 24;
  subtitleRow.fill = fill(INDIGO_LIGHT);
  subtitleRow.font = { bold: true, size: 11, color: { argb: 'FF312E81' } };
  subtitleRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Row 3 — highlighted caption
  const captionRow = sheet.addRow([caption]);
  sheet.mergeCells(`A3:${lastColumn}3`);
  captionRow.height = 32;
  captionRow.fill = fill(AMBER);
  captionRow.font = { italic: true, bold: true, size: 10, color: { argb: AMBER_TEXT } };
  captionRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };

  // Row 4 — spacer
  const spacerRow = sheet.addRow(['']);
  sheet.mergeCells(`A4:${lastColumn}4`);
  spacerRow.height = 10;

  // Row 5 — column headers
  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  headerRow.fill = fill(INDIGO);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.eachCell((cell) => { cell.border = thinBorder; });

  // Data rows
  data.forEach((line, index) => {
    const row = sheet.addRow(line);
    row.height = 19;
    row.alignment = { vertical: 'middle' };
    row.eachCell((cell, columnNumber) => {
      cell.border = thinBorder;
      cell.font = { size: 10, color: { argb: 'FF334155' } };
      if (index % 2 === 1) cell.fill = fill(SLATE);
      if (columnNumber === 1 || /amount|total|paid|debit|credit|average/i.test(headers[columnNumber - 1] ?? '')) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0.00';
      }
    });
  });

  // Total row
  const totalColumn = view === 'detail' ? 5 : view === 'category' ? 2 : headers.length;
  const grandTotal = data.reduce((sum, line) => sum + (Number(String(line[totalColumn - 1]).replace(/,/g, '')) || 0), 0);
  const totalRowValues = headers.map((_, index) => (index === 0 ? 'TOTAL' : index === totalColumn - 1 ? grandTotal.toFixed(2) : ''));
  const totalRow = sheet.addRow(totalRowValues);
  totalRow.height = 26;
  totalRow.fill = fill(INDIGO_MID);
  totalRow.font = { bold: true, size: 11, color: { argb: 'FF312E81' } };
  totalRow.alignment = { vertical: 'middle', horizontal: totalColumn === 1 ? 'left' : 'right' };
  totalRow.eachCell((cell, columnNumber) => {
    cell.border = { top: { style: 'medium', color: { argb: INDIGO } }, bottom: { style: 'thin', color: { argb: INDIGO } } };
    if (columnNumber === totalColumn) cell.numFmt = '#,##0.00';
  });

  // Footer caption
  const footerRow = sheet.addRow([`END OF REPORT  •  ${TITLES[view]}  •  ${rows.length} source rows  •  Grand total: ${money(grandTotal.toFixed(2))}`]);
  sheet.mergeCells(`A${footerRow.number}:${lastColumn}${footerRow.number}`);
  footerRow.height = 28;
  footerRow.fill = fill(GREEN);
  footerRow.font = { bold: true, size: 10, color: { argb: 'FF047857' } };
  footerRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const metaRow = sheet.addRow([`Generated by Society Management on ${generated}  •  Verify against source documents before posting.`]);
  sheet.mergeCells(`A${metaRow.number}:${lastColumn}${metaRow.number}`);
  metaRow.height = 20;
  metaRow.font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
  metaRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  sheet.views = [{ state: 'frozen', ySplit: 5 }];
  sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, 5 + data.length), column: headers.length } };
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  sheet.headerFooter.oddFooter = '&C&"Calibri,Regular,9"Page &P of &N&R&"Calibri,Regular,9"Society Management';

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': disposition,
    },
  });
}
