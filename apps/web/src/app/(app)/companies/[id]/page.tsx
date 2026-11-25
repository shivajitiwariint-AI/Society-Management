import Link from 'next/link';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, Building2, Layers3, Mail, Users } from 'lucide-react';
import { authorize } from '@society/authorization';
import { prisma } from '@society/database';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { CompanyProfileForm } from './company-profile-form';
import { OpenCompanyButton } from './open-company-button';

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export default async function CompanyDetailPage({ params }: PageProps) {
  const context = await getRequestContext('company-detail-page');
  if (!context) redirect('/login');
  const allowed = authorize(context, {
    moduleKey: 'company', resourceKey: 'profile', action: 'READ', platform: true,
  }).ok;
  if (!allowed) return <Alert>Platform administrator access is required.</Alert>;

  const companyId = (await params).id;
  if (!z.uuid().safeParse(companyId).success) return <Alert>Invalid company id.</Alert>;

  const [company, adminUser] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true, name: true, code: true, status: true,
        countryCode: true, currencyCode: true, timezone: true,
        createdAt: true,
        _count: { select: { societies: true, memberships: true, modules: true } },
        modules: { where: { isEnabled: true }, select: { module: { select: { name: true } } } },
      },
    }),
    prisma.user.findFirst({
      where: {
        memberships: { some: { companyId } },
        userRoles: { some: { role: { key: 'company-admin' } } },
      },
      select: { email: true, name: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  if (!company) return <Alert>Company not found.</Alert>;

  return (
    <div className="space-y-7">
      <Link href="/companies" className="back-link">
        <ArrowLeft className="h-3.5 w-3.5" /> All companies
      </Link>

      <PageHeader
        eyebrow="Company configuration"
        title={company.name}
        description={`${company.code} · ${company.currencyCode} · ${company.timezone} · Created ${company.createdAt.toLocaleDateString('en-IN')}`}
        icon={Building2}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`status-pill ${company.status === 'ACTIVE' ? 'status-pill-success' : company.status === 'SUSPENDED' ? 'status-pill-warning' : 'status-pill-muted'}`}>
              {company.status === 'ACTIVE' ? 'Active' : company.status === 'SUSPENDED' ? 'Disabled' : 'Archived'}
            </span>
            <Link href={`/companies/${companyId}/modules`} className="btn-modern btn-secondary">
              <Layers3 className="h-4 w-4" /> Configure modules
            </Link>
            <OpenCompanyButton companyId={company.id} />
          </div>
        }
      />

      <section className="summary-strip" aria-label="Company summary">
        <div className="summary-item">
          <span className="summary-icon summary-icon-brand"><Building2 className="h-5 w-5" /></span>
          <div>
            <p className="summary-label">Societies</p>
            <p className="summary-value">{company._count.societies}</p>
          </div>
        </div>
        <div className="summary-item">
          <span className="summary-icon summary-icon-emerald"><Users className="h-5 w-5" /></span>
          <div>
            <p className="summary-label">Members</p>
            <p className="summary-value">{company._count.memberships}</p>
          </div>
        </div>
        <div className="summary-item">
          <span className="summary-icon summary-icon-violet"><Layers3 className="h-5 w-5" /></span>
          <div>
            <p className="summary-label">Enabled modules</p>
            <p className="summary-value">{company.modules.length}</p>
          </div>
        </div>
      </section>

      <section className="create-panel" aria-label="Edit company profile">
        <div className="create-panel-head">
          <span className="create-panel-icon"><Building2 className="h-5 w-5" /></span>
          <div>
            <h2 className="section-title">Company profile</h2>
            <p className="section-subtitle">Update the company details. A reason is recorded in the audit trail.</p>
          </div>
        </div>
        <div className="create-panel-body">
          <div className="profile-email">
            <span className="summary-icon summary-icon-sky"><Mail className="h-4 w-4" /></span>
            <div>
              <p className="summary-label">Company administrator email</p>
              <p className="profile-email-value">{adminUser?.email ?? 'No administrator assigned'}</p>
            </div>
          </div>
          <CompanyProfileForm
            companyId={company.id}
            initial={{
              name: company.name,
              code: company.code,
              countryCode: company.countryCode,
              currencyCode: company.currencyCode,
              timezone: company.timezone,
            }}
          />
        </div>
      </section>
    </div>
  );
}
