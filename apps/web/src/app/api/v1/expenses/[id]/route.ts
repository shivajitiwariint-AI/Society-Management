import { z } from 'zod';
import { updateMaintenanceExpenseSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import { deleteExpense, updateExpense } from '@/lib/services/maintenance-expense-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ id: string }> };

function societyIdFrom(request: Request): string | null {
  const value = new URL(request.url).searchParams.get('societyId');
  return value && z.uuid().safeParse(value).success ? value : null;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const societyId = societyIdFrom(request);
  if (!z.uuid().safeParse(id).success || !societyId) {
    return apiError(400, 'INVALID', 'Invalid expense id or society id', 'invalid-expense-id');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');
  }
  const parsed = updateMaintenanceExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid expense payload', 'invalid-expense', parsed.error.flatten());
  }

  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'UPDATE', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await updateExpense(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    id,
    parsed.data,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const societyId = societyIdFrom(request);
  if (!z.uuid().safeParse(id).success || !societyId) {
    return apiError(400, 'INVALID', 'Invalid expense id or society id', 'invalid-expense-id');
  }

  const guard = await guardRequest(request, {
    moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action: 'DELETE', societyId,
  });
  if (!guard.ok) return guard.response;

  const result = await deleteExpense(
    toServiceContext(guard, request),
    guard.context.activeCompanyId!,
    societyId,
    id,
  );
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
