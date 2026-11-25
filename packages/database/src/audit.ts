import { newId } from '@society/shared';
import type { Prisma } from './generated/prisma/client';
import { prisma } from './client';

export interface AuditEntry {
  companyId?: string | null;
  societyId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  reason?: string;
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/** Append-only audit writes; no ordinary admin UI may update these rows (SRS 16). */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      id: newId(),
      companyId: entry.companyId ?? null,
      societyId: entry.societyId ?? null,
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      result: entry.result,
      reason: entry.reason ?? null,
      requestId: entry.requestId,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
