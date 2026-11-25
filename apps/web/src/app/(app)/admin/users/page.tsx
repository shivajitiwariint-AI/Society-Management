import { redirect } from 'next/navigation';
import { authorize } from '@society/authorization';
import { prisma } from '@society/database';
import { ShieldCheck } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { UserAdmin, type AdminUserRow } from './user-admin';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const context = await getRequestContext('admin-users-page');
  if (!context) redirect('/login');
  if (!authorize(context, { moduleKey: 'auth', resourceKey: 'account', action: 'UPDATE', platform: true }).ok) {
    return <Alert>Platform administrator access is required.</Alert>;
  }

  const requestedCompanyId = (await searchParams).companyId;
  const companyFilter = requestedCompanyId && /^[0-9a-f-]{36}$/i.test(requestedCompanyId) ? requestedCompanyId : undefined;

  const [companies, users] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: {
        memberships: {
          some: {
            status: 'ACTIVE',
            ...(companyFilter ? { companyId: companyFilter } : {}),
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        lastLoginAt: true,
        memberships: { where: { status: 'ACTIVE' }, select: { companyId: true } },
        userRoles: {
          select: { companyId: true, role: { select: { key: true, scopeType: true } } },
        },
      },
      orderBy: { email: 'asc' },
      take: 200,
    }),
  ]);
  const companyIds = [...new Set(users.flatMap((user) => user.memberships.map((row) => row.companyId)))];
  const companyNames = new Map(companies.map((company) => [company.id, `${company.name} (${company.code})`]));

  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    companyId: user.memberships[0]?.companyId ?? null,
    companies: user.memberships.map((row) => companyNames.get(row.companyId) ?? row.companyId),
    roles: [
      ...new Set(
        user.userRoles
          .filter((row) => row.companyId !== null)
          .map((row) => `${row.role.key} (${row.role.scopeType.toLowerCase()})`),
      ),
    ],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform administration"
        title="Company users"
        description="Reset any company user's password, review roles and jump into company-specific user management. Resets revoke active sessions and are audited."
        icon={ShieldCheck}
      />
      <section className="create-panel" aria-label="Filter company users">
        <div className="create-panel-body">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <label htmlFor="user-company-filter" className="mb-1.5 block text-[13px] font-semibold text-ink-700">Company</label>
              <select
                id="user-company-filter"
                name="companyId"
                defaultValue={companyFilter ?? ''}
                className="h-10 w-full rounded-[10px] border border-ink-200 bg-white px-3 text-sm"
              >
                <option value="">All companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name} ({company.code})</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-modern btn-primary">Apply filter</button>
          </form>
        </div>
      </section>
      <UserAdmin rows={rows} />
    </div>
  );
}
