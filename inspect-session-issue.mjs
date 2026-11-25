import { prisma } from '@society/database';

const companies = await prisma.company.findMany({ select: { id: true, name: true, status: true } });
const users = await prisma.user.findMany({
  select: { id: true, email: true, status: true, userRoles: { select: { companyId: true, societyId: true, role: { select: { key: true, scopeType: true, companyId: true } } } }, memberships: { select: { companyId: true, status: true } } },
});
const sessions = await prisma.session.findMany({ select: { userId: true, activeCompanyId: true, revokedAt: true, expiresAt: true } });
console.log('companies', companies);
console.log('users', JSON.stringify(users, null, 2));
console.log('sessions', sessions.map((s) => ({ ...s, expired: s.expiresAt <= new Date() })));
await prisma.$disconnect();
