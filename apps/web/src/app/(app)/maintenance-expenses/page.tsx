import { redirect } from 'next/navigation';
import { authorize } from '@society/authorization';
import { MAINTENANCE_EXPENSE_CATEGORIES } from '@society/shared';
import { prisma } from '@society/database';
import { ClipboardList } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';
import { listExpenses } from '@/lib/services/maintenance-expense-service';
import { ExpenseWorkspace } from './expense-workspace';

type PageProps = { searchParams: Promise<{ societyId?: string | string[] }> };

export default async function MaintenanceExpensesPage({ searchParams }: PageProps) {
  const context = await getRequestContext('maintenance-expenses-page');
  if (!context) redirect('/login');

  const can = (action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE') =>
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
  const service = { context, actorUserId: context.identity.userId, requestId: 'maintenance-expenses-page' };
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

  if (!societyId) {
    return (
      <Card>
        <CardHeader><CardTitle>No society found</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-ink-500">
            Register a society in Society Setup before recording maintenance expenses.
          </p>
        </CardContent>
      </Card>
    );
  }

  const [initial, vendors] = await Promise.all([
    listExpenses(service, companyId, societyId, { page: 1, pageSize: 20 }),
    prisma.operationalRecord.findMany({
      where: { companyId, societyId, moduleKey: 'vendors-contracts', resourceKey: 'vendor' },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ]);
  if (!initial.ok) return <Alert>{initial.message}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Maintenance expenses"
        description="Monthly expense heads, vouchers, and financial-year rollups for the selected society."
        icon={ClipboardList}
      />

      <Alert tone="info">
        The imported OVH sample workbook contains illustrative estimates only. Replace sample rows with actual bills,
        invoices, vouchers, and reconciled bank entries before using these figures for society accounts.
      </Alert>

      <ExpenseWorkspace
        societies={societyResult.value}
        societyId={societyId}
        categories={MAINTENANCE_EXPENSE_CATEGORIES}
        vendors={vendors.map((vendor) => ({ id: vendor.id, name: vendor.title }))}
        currencyCode={company?.currencyCode ?? 'INR'}
        canCreate={can('CREATE')}
        canUpdate={can('UPDATE')}
        canDelete={can('DELETE')}
        initial={initial.value}
      />
    </div>
  );
}
