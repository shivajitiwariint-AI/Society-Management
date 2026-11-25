import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { authorize } from '@society/authorization';
import { prisma } from '@society/database';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { CreateCompanyDialog } from './create-company-dialog';
import { CompanyActions, type CompanyUserOption } from './company-actions';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage() {
  const context = await getRequestContext('companies-page');
  if (!context) redirect('/login');
  const decision = authorize(context, {
    moduleKey: 'company', resourceKey: 'profile', action: 'READ', platform: true,
  });

  if (!decision.ok) {
    return <Alert>You do not have permission to view companies.</Alert>;
  }
  const canUpdateCompany = authorize(context, {
    moduleKey: 'company', resourceKey: 'profile', action: 'UPDATE', platform: true,
  }).ok;
  const canDeleteCompany = authorize(context, {
    moduleKey: 'company', resourceKey: 'profile', action: 'DELETE', platform: true,
  }).ok;

  const companies = await prisma.company.findMany({
    select: {
      id: true, name: true, code: true, status: true, currencyCode: true,
      createdAt: true,
      _count: { select: { societies: true, modules: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const companyIds = companies.map((company) => company.id);
  const users = companyIds.length > 0
    ? await prisma.user.findMany({
        where: { memberships: { some: { companyId: { in: companyIds } } } },
        select: {
          id: true,
          name: true,
          email: true,
          memberships: { where: { companyId: { in: companyIds } }, select: { companyId: true } },
        },
        orderBy: { email: 'asc' },
      })
    : [];

  const usersByCompany = new Map<string, CompanyUserOption[]>();
  for (const user of users) {
    for (const membership of user.memberships) {
      const list = usersByCompany.get(membership.companyId) ?? [];
      list.push({ id: user.id, name: user.name ?? '', email: user.email });
      usersByCompany.set(membership.companyId, list);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Platform administration"
        title="Companies"
        description="Create companies, open their dashboards, configure modules and reset company logins."
        icon={Building2}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="status-pill status-pill-brand">{companies.length} companies</span>
            <CreateCompanyDialog />
          </div>
        }
      />

      <section className="data-panel companies-panel" aria-label="Registered companies">
        <div className="data-panel-head">
          <div>
            <h2 className="section-title">Your companies</h2>
            <p className="section-subtitle">Use Actions to open a dashboard, configure modules or reset a login.</p>
          </div>
        </div>

        {companies.length === 0 ? (
          <div className="society-empty">
            <span className="society-empty-icon"><Building2 className="h-6 w-6" /></span>
            <h3>No companies yet</h3>
            <p>Add your first company above to start setting up workspaces.</p>
          </div>
        ) : (
          <div className="company-table-wrap overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Societies</th>
                  <th className="px-5 py-3">Modules</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-ink-100/80 transition-colors last:border-0 hover:bg-ink-50/70">
                    <td className="px-5 py-3.5">
                      <Link href={`/companies/${company.id}`} className="flex items-center gap-3">
                        <span className="table-avatar"><Building2 className="h-4 w-4" /></span>
                        <span>
                          <span className="block font-semibold text-ink-900 hover:text-brand-700">{company.name}</span>
                          <span className="block text-[11px] text-ink-500">{company.code} · {company.currencyCode}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`status-pill ${company.status === 'ACTIVE' ? 'status-pill-success' : company.status === 'SUSPENDED' ? 'status-pill-warning' : 'status-pill-muted'}`}>
                        {company.status === 'ACTIVE' ? 'Active' : company.status === 'SUSPENDED' ? 'Disabled' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-ink-700">{company._count.societies}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-ink-700">{company._count.modules} configured</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        <CompanyActions
                          companyId={company.id}
                          companyName={company.name}
                          companyCode={company.code}
                          initialStatus={company.status}
                          canUpdate={canUpdateCompany}
                          canDelete={canDeleteCompany}
                          users={usersByCompany.get(company.id) ?? []}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
