import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, Users } from 'lucide-react';
import { authorize } from '@society/authorization';
import { prisma } from '@society/database';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { CompanyUserManager, type CompanyUserRow, type RoleOption } from './company-user-manager';

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export default async function CompanyUsersPage({ params }: PageProps) {
  const context = await getRequestContext('company-users-page');
  if (!context) redirect('/login');
  const allowed = authorize(context, {
    moduleKey: 'company', resourceKey: 'membership', action: 'ASSIGN', platform: true,
  }).ok;
  if (!allowed) return <Alert>Platform administrator access is required.</Alert>;

  const companyId = (await params).id;
  if (!z.uuid().safeParse(companyId).success) return <Alert>Invalid company id.</Alert>;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, code: true },
  });
  if (!company) return <Alert>Company not found.</Alert>;

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { memberships: { some: { companyId } } },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        lastLoginAt: true,
        memberships: { where: { companyId }, select: { status: true } },
        userRoles: {
          where: { role: { scopeType: { not: 'PLATFORM' } } },
          select: { role: { select: { id: true, name: true, key: true } } },
        },
      },
      orderBy: { email: 'asc' },
      take: 200,
    }),
    prisma.role.findMany({
      where: {
        scopeType: { not: 'PLATFORM' },
        OR: [{ companyId: null }, { companyId }],
      },
      select: { id: true, name: true, key: true, scopeType: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const rows: CompanyUserRow[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    status: user.status,
    membershipStatus: user.memberships[0]?.status ?? 'INACTIVE',
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    roleId: user.userRoles[0]?.role.id ?? '',
    roleName: user.userRoles[0]?.role.name ?? null,
  }));
  const roleOptions: RoleOption[] = roles.map((role) => ({
    id: role.id,
    label: `${role.name} · ${role.scopeType.toLowerCase()}`,
  }));

  return (
    <div className="space-y-7">
      <Link href={`/companies/${companyId}`} className="back-link">
        <ArrowLeft className="h-3.5 w-3.5" /> {company.name}
      </Link>
      <PageHeader
        eyebrow="Company management"
        title="Company users"
        description={`Manage users, roles and password resets for ${company.name} (${company.code}). Every change is audited.`}
        icon={Users}
      />
      <CompanyUserManager companyId={companyId} rows={rows} roles={roleOptions} />
    </div>
  );
}
