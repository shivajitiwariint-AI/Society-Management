import { z } from 'zod';
import {
  approvePaymentSchema,
  createAccountSchema,
  createChargeSchema,
  createInvoiceSchema,
  createJournalSchema,
  createPaymentSchema,
  createRefundSchema,
  lockPeriodSchema,
  postJournalSchema,
  updateAccountSchema,
  updateChargeSchema,
} from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { serviceError } from '@/lib/api/service-result';
import { toServiceContext } from '@/lib/api/service-context';
import {
  approvePayment,
  approveRefund,
  cancelInvoice,
  createAccount,
  createCharge,
  createInvoice,
  createJournal,
  createPayment,
  createRefund,
  getDues,
  getTrialBalance,
  listAccounts,
  listCharges,
  listInvoices,
  listJournals,
  listPayments,
  listPeriods,
  listRefunds,
  postJournal,
  reconcilePayment,
  reverseJournal,
  setPeriodLock,
  updateAccount,
  updateCharge,
} from '@/lib/services/finance-service';

export const runtime = 'nodejs';

type RouteProps = { params: Promise<{ societyId: string; resource: string }> };

const COLLECTIONS = new Set([
  'charges', 'accounts', 'invoices', 'payments', 'refunds', 'journals', 'dues', 'trial-balance', 'periods',
]);

const POLICIES: Record<string, { moduleKey: 'finance-billing' | 'payments-receipts' | 'accounting'; resourceKey: string } | undefined> = {
  charges: { moduleKey: 'finance-billing', resourceKey: 'charge-type' },
  accounts: { moduleKey: 'accounting', resourceKey: 'account' },
  invoices: { moduleKey: 'finance-billing', resourceKey: 'invoice' },
  payments: { moduleKey: 'payments-receipts', resourceKey: 'payment' },
  refunds: { moduleKey: 'payments-receipts', resourceKey: 'refund' },
  journals: { moduleKey: 'accounting', resourceKey: 'journal-entry' },
  dues: { moduleKey: 'finance-billing', resourceKey: 'dues-report' },
  'trial-balance': { moduleKey: 'accounting', resourceKey: 'financial-report' },
  periods: { moduleKey: 'accounting', resourceKey: 'period-close' },
};

function policyFor(resource: string) {
  const policy = POLICIES[resource];
  if (!policy) throw new Error(`Missing finance policy for ${resource}`);
  return policy;
}

async function parseBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function invalidSociety(societyId: string) {
  return !z.uuid().safeParse(societyId).success;
}

export async function GET(request: Request, { params }: RouteProps) {
  const { societyId, resource } = await params;
  if (invalidSociety(societyId) || !COLLECTIONS.has(resource)) {
    return apiError(404, 'NOT_FOUND', 'Finance resource not found', 'unknown-finance-resource');
  }
  const guard = await guardRequest(request, { ...policyFor(resource), action: 'READ', societyId });
  if (!guard.ok) return guard.response;
  const service = toServiceContext(guard, request);
  const companyId = guard.context.activeCompanyId!;
  const searchParams = new URL(request.url).searchParams;
  const periodKey = searchParams.get('periodKey') ?? undefined;

  let result;
  switch (resource) {
    case 'charges': result = await listCharges(service, companyId, societyId); break;
    case 'accounts': result = await listAccounts(service, companyId, societyId); break;
    case 'invoices': result = await listInvoices(service, companyId, societyId); break;
    case 'payments': result = await listPayments(service, companyId, societyId); break;
    case 'refunds': result = await listRefunds(service, companyId, societyId); break;
    case 'journals': result = await listJournals(service, companyId, societyId); break;
    case 'dues': result = await getDues(service, companyId, societyId); break;
    case 'trial-balance': result = await getTrialBalance(service, companyId, societyId, periodKey); break;
    default: result = await listPeriods(service, companyId, societyId);
  }
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}

export async function POST(request: Request, { params }: RouteProps) {
  const { societyId, resource } = await params;
  if (invalidSociety(societyId) || !COLLECTIONS.has(resource)) {
    return apiError(404, 'NOT_FOUND', 'Finance resource not found', 'unknown-finance-resource');
  }
  const body = await parseBody(request);
  if (body === null) return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');

  const guard = await guardRequest(request, { ...policyFor(resource), action: 'CREATE', societyId });
  if (!guard.ok) return guard.response;
  const service = toServiceContext(guard, request);
  const companyId = guard.context.activeCompanyId!;

  let result;
  switch (resource) {
    case 'charges': {
      const parsed = createChargeSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid charge payload', 'invalid-charge', parsed.error.flatten());
      result = await createCharge(service, companyId, societyId, parsed.data);
      break;
    }
    case 'accounts': {
      const parsed = createAccountSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid account payload', 'invalid-account', parsed.error.flatten());
      result = await createAccount(service, companyId, societyId, parsed.data);
      break;
    }
    case 'invoices': {
      const parsed = createInvoiceSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid invoice payload', 'invalid-invoice', parsed.error.flatten());
      result = await createInvoice(service, companyId, societyId, parsed.data);
      break;
    }
    case 'payments': {
      const parsed = createPaymentSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid payment payload', 'invalid-payment', parsed.error.flatten());
      result = await createPayment(service, companyId, societyId, parsed.data);
      break;
    }
    case 'refunds': {
      const parsed = createRefundSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid refund payload', 'invalid-refund', parsed.error.flatten());
      const envelope = z.object({ paymentId: z.uuid(), amount: z.number().positive(), reason: z.string().min(3) }).safeParse(body);
      if (!envelope.success) return apiError(400, 'VALIDATION_ERROR', 'paymentId is required', 'invalid-refund', envelope.error.flatten());
      result = await createRefund(service, companyId, societyId, envelope.data.paymentId, parsed.data);
      break;
    }
    case 'journals': {
      const parsed = createJournalSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid journal payload', 'invalid-journal', parsed.error.flatten());
      result = await createJournal(service, companyId, societyId, parsed.data);
      break;
    }
    case 'periods': {
      const parsed = lockPeriodSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid period payload', 'invalid-period', parsed.error.flatten());
      result = await setPeriodLock(service, companyId, societyId, parsed.data);
      break;
    }
    default:
      return apiError(404, 'NOT_FOUND', 'This finance resource does not accept POST', 'unsupported-finance-operation');
  }
  return result.ok ? apiSuccess(result.value, 201) : serviceError(result, guard.requestId);
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { societyId, resource } = await params;
  if (invalidSociety(societyId) || !COLLECTIONS.has(resource)) {
    return apiError(404, 'NOT_FOUND', 'Finance resource not found', 'unknown-finance-resource');
  }
  const body = await parseBody(request);
  if (body === null) return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', 'invalid-json');

  const envelope = z.object({ id: z.uuid(), action: z.string().trim().min(1).max(30).optional() }).safeParse(body);
  if (!envelope.success) {
    return apiError(400, 'VALIDATION_ERROR', 'An id is required', 'invalid-finance-action', envelope.error.flatten());
  }

  const guard = await guardRequest(request, { ...policyFor(resource), action: 'UPDATE', societyId });
  if (!guard.ok) return guard.response;
  const service = toServiceContext(guard, request);
  const companyId = guard.context.activeCompanyId!;
  const id = envelope.data.id;

  let result;
  switch (resource) {
    case 'charges': {
      const parsed = updateChargeSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid charge payload', 'invalid-charge', parsed.error.flatten());
      result = await updateCharge(service, companyId, societyId, id, parsed.data);
      break;
    }
    case 'accounts': {
      const parsed = updateAccountSchema.safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid account payload', 'invalid-account', parsed.error.flatten());
      result = await updateAccount(service, companyId, societyId, id, parsed.data);
      break;
    }
    case 'invoices': {
      const parsed = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'A reason is required', 'invalid-invoice-action', parsed.error.flatten());
      result = await cancelInvoice(service, companyId, societyId, id, parsed.data.reason);
      break;
    }
    case 'payments': {
      if (envelope.data.action === 'RECONCILE') {
        const parsed = z.object({ reference: z.string().trim().min(3).max(120) }).safeParse(body);
        if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'A reconciliation reference is required', 'invalid-reconciliation', parsed.error.flatten());
        result = await reconcilePayment(service, companyId, societyId, id, parsed.data.reference);
      } else {
        const parsed = approvePaymentSchema.safeParse(body);
        if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid payment decision', 'invalid-payment-decision', parsed.error.flatten());
        result = await approvePayment(service, companyId, societyId, id, parsed.data);
      }
      break;
    }
    case 'refunds': {
      const parsed = z.object({ approve: z.boolean() }).safeParse(body);
      if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'An approve flag is required', 'invalid-refund-decision', parsed.error.flatten());
      result = await approveRefund(service, companyId, societyId, id, parsed.data.approve);
      break;
    }
    case 'journals': {
      if (envelope.data.action === 'REVERSE') {
        const parsed = z.object({ reason: z.string().trim().min(3).max(500) }).safeParse(body);
        if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'A reason is required', 'invalid-journal-reversal', parsed.error.flatten());
        result = await reverseJournal(service, companyId, societyId, id, parsed.data.reason);
      } else {
        const parsed = postJournalSchema.safeParse(body);
        if (!parsed.success) return apiError(400, 'VALIDATION_ERROR', 'Invalid journal decision', 'invalid-journal-decision', parsed.error.flatten());
        result = await postJournal(service, companyId, societyId, id, parsed.data);
      }
      break;
    }
    default:
      return apiError(404, 'NOT_FOUND', 'This finance resource does not accept PATCH', 'unsupported-finance-operation');
  }
  return result.ok ? apiSuccess(result.value) : serviceError(result, guard.requestId);
}
