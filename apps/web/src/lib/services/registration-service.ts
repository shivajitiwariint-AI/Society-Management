import { prisma, recordAudit } from '@society/database';
import type { Prisma } from '@society/database';
import { newId } from '@society/shared';
import type { CompanyRegistrationInput } from '@society/validation';
import { hashPassword } from '@/lib/auth/password';
import { seedCompanyModules, type ServiceResult } from './company-service';

const COMPANY_ADMIN_ROLE_SCOPE_KEY = 'COMPANY:::company-admin';
const CONFLICT_MESSAGE = 'Company code or administrator email is already registered';

export interface RegistrationMeta {
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Public self-service tenant onboarding. One transaction creates the company,
 * the default entitlement matrix (Finance & Accounts only), and the first
 * company administrator with an active membership and the system
 * company-admin role.
 */
export async function registerCompany(
  input: CompanyRegistrationInput,
  meta: RegistrationMeta,
): Promise<ServiceResult<{ companyId: string; userId: string }>> {
  const [companyByCode, userByEmail] = await Promise.all([
    prisma.company.findUnique({ where: { code: input.code }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: input.adminEmail }, select: { id: true } }),
  ]);
  if (companyByCode || userByEmail) return { ok: false, code: 'CONFLICT', message: CONFLICT_MESSAGE };

  const companyId = newId();
  const userId = newId();
  const passwordHash = await hashPassword(input.adminPassword);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.company.create({
        data: {
          id: companyId,
          name: input.name,
          code: input.code,
          countryCode: input.countryCode,
          currencyCode: input.currencyCode,
          timezone: input.timezone,
          status: 'ACTIVE',
        },
      });
      await seedCompanyModules(tx, companyId, userId);
      await tx.user.create({
        data: { id: userId, email: input.adminEmail, name: input.adminName, passwordHash, status: 'ACTIVE' },
      });
      await tx.userMembership.create({
        data: { id: newId(), userId, companyId, societyId: null, status: 'ACTIVE' },
      });
      const role = await tx.role.findUniqueOrThrow({ where: { scopeKey: COMPANY_ADMIN_ROLE_SCOPE_KEY } });
      await tx.userRole.create({
        data: { id: newId(), userId, roleId: role.id, companyId, societyId: null, assignedBy: userId },
      });
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return { ok: false, code: 'CONFLICT', message: CONFLICT_MESSAGE };
    }
    throw error;
  }

  await recordAudit({
    companyId,
    actorUserId: userId,
    action: 'COMPANY_SELF_REGISTERED',
    resourceType: 'company',
    resourceId: companyId,
    result: 'SUCCESS',
    reason: 'Public company registration with first company administrator',
    requestId: meta.requestId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { ok: true, value: { companyId, userId } };
}
