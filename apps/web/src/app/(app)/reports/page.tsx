import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { authorize } from '@society/authorization';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';
import { loadFinanceSection } from '@/lib/services/finance-page-data';
import { FinanceWorkspace } from '@/app/(app)/finance/finance-workspace';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  const context = await getRequestContext('reports-page');
  if (!context) redirect('/login');
  if (!authorize(context, { moduleKey: 'advanced-reports', resourceKey: 'report', action: 'READ' }).ok) {
    return <Alert>Reports are unavailable. Enable Advanced Reports and grant report:READ to your role.</Alert>;
  }
  if (!context.activeCompanyId || !context.identity) return <Alert>Select an active company workspace.</Alert>;

  const service = { context, actorUserId: context.identity.userId, requestId: 'reports-page' };
  const societiesResult = await listSocieties(service, context.activeCompanyId);
  if (!societiesResult.ok) return <Alert>{societiesResult.message}</Alert>;

  const requestedId = (await searchParams).societyId;
  const requested = Array.isArray(requestedId) ? requestedId[0] : requestedId;
  const societyId = requested && societiesResult.value.some((item) => item.id === requested)
    ? requested
    : societiesResult.value[0]?.id;
  if (!societyId) return <Alert tone="info">Register a society before viewing reports.</Alert>;

  const initialData = await loadFinanceSection(service, context.activeCompanyId, societyId, 'reports');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Dues, invoices and posted-ledger trial balance. Exports are permission-gated and audited."
        icon={BarChart3}
      />
      <FinanceWorkspace section="reports" societies={societiesResult.value} societyId={societyId} initialData={initialData} />
    </div>
  );
}
