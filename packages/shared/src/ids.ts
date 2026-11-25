import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export function newId(): string {
  return randomUUID();
}

/** Opaque, high-entropy token for sessions/invitations; hashed before storage. */
export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
