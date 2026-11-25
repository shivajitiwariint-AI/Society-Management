import { z } from 'zod';
import { prisma } from '@society/database';
import { createCompanySchema, paginationSchema } from '@society/validation';
import { guardRequest } from '@/lib/api/guard';
import { apiError, apiSuccess } from '@/lib/api/response';
import { createCompany } from '@/lib/services/company-service';

export const runtime = 'nodejs';

const createBodySchema = createCompanySchema.extend({
  reason: z.string().trim().min(5).max(500),
});

export async function GET(request: Request) {
  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'profile', action: 'READ', platform: true,
  });
  if (!guard.ok) return guard.response;

  const query = paginationSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid pagination parameters', guard.requestId);
  }
  const { page, pageSize } = query.data;
  const [items, total] = await Promise.all([
    prisma.company.findMany({
      select: { id: true, name: true, code: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.company.count(),
  ]);
  return apiSuccess({ items, total, page, pageSize });
}

export async function POST(request: Request) {
  const guard = await guardRequest(request, {
    moduleKey: 'company', resourceKey: 'profile', action: 'CREATE', platform: true,
  });
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'A JSON body is required', guard.requestId);
  }
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION_ERROR', 'Invalid company payload', guard.requestId, parsed.error.flatten());
  }

  const result = await createCompany(
    {
      context: guard.context,
      actorUserId: guard.actorUserId,
      requestId: guard.requestId,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
    parsed.data,
    parsed.data.reason,
  );
  if (!result.ok) {
    return apiError(result.code === 'CONFLICT' ? 409 : 403, result.code, result.message, guard.requestId);
  }
  return apiSuccess(result.value, 201);
}
