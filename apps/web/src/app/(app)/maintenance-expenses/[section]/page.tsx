import { redirect } from 'next/navigation';
import { authorize } from '@society/authorization';
import { ClipboardList } from 'lucide-react';
import { prisma } from '@society/database';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { RegisterSocietyAlert } from '@/components/register-society-alert';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';
import { listExpenses } from '@/lib/services/maintenance-expense-service';
import { MAINTENANCE_EXPENSE_CATEGORIES } from '@society/shared';
import { ExpenseWorkspace } from '../expense-workspace';

const SECTIONS = {
  dashboard: 'Dashboard',
  entries: 'Expense entries',
  'month-wise': 'Month-wise summary',
  'financial-year': 'Financial year summary',
  categories: 'Expense categories',
  vendors: 'Vendors / payees',
  documents: 'Bills, vouchers and documents',
  payments: 'Payments',
  reconciliation: 'Bank reconciliation',
  'import-export': 'Excel import / export',
} as const;

type PageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ societyId?: string | string[] }>;
};

export default async function MaintenanceSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params;
  if (!(section in SECTIONS)) redirect('/maintenance-expenses/dashboard');

  const context = await getRequestContext(`maintenance-${section}`);
  if (!context) redirect('/login');

  const can = (action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'REFUND') =>
    authorize(context, { moduleKey: 'finance-billing', resourceKey: 'maintenance-expense', action }).ok;

  if (!can('READ')) {
    return (
      <Alert>
        Maintenance expenses are unavailable. The Finance module must be enabled for this company and your role needs
        <code className="mx-1">finance-billing:maintenance-expense:READ</code>.
      </Alert>
    );
  }
  if (!context.activeCompanyId || !context.identity) {
    return <Alert>Select an active company workspace before managing maintenance expenses.</Alert>;
  }

  const companyId = context.activeCompanyId;
  const service = { context, actorUserId: context.identity.userId, requestId: `maintenance-${section}` };
  const [societyResult, company] = await Promise.all([
    listSocieties(service, companyId),
    prisma.company.findUnique({ where: { id: companyId }, select: { currencyCode: true } }),
  ]);
  if (!societyResult.ok) return <Alert>{societyResult.message}</Alert>;

  const requestedId = (await searchParams).societyId;
  const requested = Array.isArray(requestedId) ? requestedId[0] : requestedId;
  const societyId =
    requested && societyResult.value.some((society) => society.id === requested)
      ? requested
      : societyResult.value[0]?.id;

  if (!societyId) return <RegisterSocietyAlert action="recording maintenance expenses" />;

  const initial = await listExpenses(service, companyId, societyId, { page: 1, pageSize: 20 });
  if (!initial.ok) return <Alert>{initial.message}</Alert>;

  const vendors = await prisma.operationalRecord.findMany({
    where: { companyId, societyId, moduleKey: 'vendors-contracts', resourceKey: 'vendor' },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  const title = SECTIONS[section as keyof typeof SECTIONS];
  const workspaceSection = section === 'month-wise' ? 'monthly'
    : section === 'financial-year' ? 'yearly'
      : section === 'import-export' ? 'tools'
        : section;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance & Accounts → Maintenance Expenses"
        title={title}
        description="Tenant-scoped maintenance expense records, summaries and supporting evidence."
        icon={ClipboardList}
      />
      <ExpenseWorkspace
        societies={societyResult.value}
        societyId={societyId}
        categories={MAINTENANCE_EXPENSE_CATEGORIES}
        vendors={vendors.map((vendor) => ({ id: vendor.id, name: vendor.title }))}
        currencyCode={company?.currencyCode ?? 'INR'}
        canCreate={can('CREATE')}
        canUpdate={can('UPDATE')}
        canDelete={can('DELETE')}
        canApprove={can('APPROVE')}
        canPay={can('UPDATE')}
        currentUserId={context.identity.userId}
        section={workspaceSection}
        initial={initial.value}
      />
    </div>
  );
}
