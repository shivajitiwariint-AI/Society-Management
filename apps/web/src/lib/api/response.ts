import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'INACTIVE_USER'
  | 'NO_ACTIVE_MEMBERSHIP'
  | 'COMPANY_OUT_OF_SCOPE'
  | 'SOCIETY_OUT_OF_SCOPE'
  | 'MODULE_DISABLED'
  | 'MODULE_READ_ONLY'
  | 'PERMISSION_DENIED'
  | 'DATA_SCOPE_DENIED'
  | 'BUSINESS_RULE_DENIED'
  | 'VALIDATION_ERROR'
  | 'INVALID'
  | 'CSRF_INVALID'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SELF_APPROVAL'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, requestId, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
