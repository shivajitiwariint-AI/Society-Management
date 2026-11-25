import type { ServiceResult } from '@/lib/services/company-service';
import { apiError } from './response';

type FailedResult = Extract<ServiceResult<unknown>, { ok: false }>;

/** Converts a service denial into the consistent API error envelope. */
export function serviceError(result: FailedResult, requestId: string) {
  const status = result.code === 'INVALID' ? 400 : result.code === 'NOT_FOUND' ? 404 : result.code === 'CONFLICT' ? 409 : 403;
  return apiError(status, result.code, result.message, requestId);
}
