import { z } from 'zod';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import sampleRows from '@/data/maintenance-expenses-sample.json';
import { importExpenses, type ExpenseImportRow } from '@/lib/services/expense-import-service';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ societyId: string }> }) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  }
  const guard = await guardRequest(_request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'CREATE', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await importExpenses(
    toServiceContext(guard, _request),
    guard.context.activeCompanyId!,
    societyId,
    (sampleRows as ExpenseImportRow[]).map((row) => ({ ...row, month: row.month.slice(0, 7) })),
    'SAMPLE',
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
