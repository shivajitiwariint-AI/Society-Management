export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Deny-by-default authorization decision reason codes. */
export const DENY_REASONS = [
  'UNAUTHENTICATED',
  'INACTIVE_USER',
  'NO_ACTIVE_MEMBERSHIP',
  'COMPANY_OUT_OF_SCOPE',
  'SOCIETY_OUT_OF_SCOPE',
  'MODULE_DISABLED',
  'MODULE_READ_ONLY',
  'PERMISSION_DENIED',
  'DATA_SCOPE_DENIED',
  'BUSINESS_RULE_DENIED',
] as const;

export type DenyReason = (typeof DENY_REASONS)[number];

export type AuthorizationResult<T = undefined> = Result<T, { reason: DenyReason; message: string }>;
