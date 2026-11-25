import { visibleModules } from '@society/authorization';
import { guardRequest } from '@/lib/api/guard';
import { apiSuccess } from '@/lib/api/response';

export const runtime = 'nodejs';

/** Safe client bootstrap data: no PII, no internal IDs beyond the active selection. */
export async function GET(request: Request) {
  const guard = await guardRequest(request);
  if (!guard.ok) return guard.response;
  const { context } = guard;
  return apiSuccess({
    user: { email: context.identity?.email ?? null },
    activeCompanyId: context.activeCompanyId,
    activeSocietyId: context.activeSocietyId,
    companies: context.memberships
      .filter((membership) => membership.status === 'ACTIVE')
      .map((membership) => ({ companyId: membership.companyId, societyId: membership.societyId })),
    modules: visibleModules(context),
    roles: context.roles.map((role) => ({ key: role.roleKey, scope: role.scopeType, dataScope: role.dataScope })),
  });
}
