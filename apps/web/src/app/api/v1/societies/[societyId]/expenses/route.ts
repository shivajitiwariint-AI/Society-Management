import { z } from 'zod';
import { createMaintenanceExpenseSchema, maintenanceExpenseQuerySchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { createExpense, listExpenses } from '@/lib/services/maintenance-expense-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ societyId: string }> };

export async function GET(request: Request, { params }: RouteProps) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  }

  const searchParams = new URL(request.url).searchParams;
  const query = maintenanceExpenseQuerySchema.safeParse(
    Object.fromEntries([...searchParams.entries()].filter(([, value]) => value !== '')),
  );
  if (!query.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid expense filters', 'invalid-expense-query', query.error.flatten());
  }

  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'READ', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await listExpenses(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    query.data,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function POST(request: Request, { params }: RouteProps) {
  const { societyId } = await params;
  if (!z.uuid().safeParse(societyId).success) {
    return apiError(400, 'INVALID', 'Invalid society id', 'invalid-society-id');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');
  }
  const parsed = createMaintenanceExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid expense payload', 'invalid-expense', parsed.error.flatten());
  }

  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'CREATE', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await createExpense(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    parsed.data,
  );
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}
