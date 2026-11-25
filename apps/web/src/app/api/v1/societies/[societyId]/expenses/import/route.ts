import { z } from 'zod';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { parseExpenseWorkbook } from '@/lib/expenses/xlsx-parser';
import { importExpenses } from '@/lib/services/expense-import-service';

export const runtime = 'nodejs';

async function readFile(request: Request): Promise<Buffer | null> {
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return null;
  return Buffer.from(await file.arrayBuffer());
}

export async function POST(request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  }
  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'CREATE', societyId,
  });
  if (!guard.ok) return guard.response;

  const buffer = await readFile(request);
  if (!buffer || buffer.length === 0) return apiError(400, 'VALIDATION_ERROR', 'An .xlsx file is required', guard.requestId);
  if (buffer.length > 10 * 1024 * 1024) return apiError(400, 'VALIDATION_ERROR', 'File exceeds 10 MB', guard.requestId);

  let rows;
  try {
    const parsed = await parseExpenseWorkbook(buffer);
    rows = parsed.rows;
    if (rows.length === 0) {
      return apiError(400, 'VALIDATION_ERROR', 'No valid expense rows were found in the workbook', guard.requestId);
    }
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'Unable to read the workbook. Use the OVH .xlsx format.', guard.requestId);
  }

  const result = await importExpenses(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    rows,
    'IMPORTED',
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
