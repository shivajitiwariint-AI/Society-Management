import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { authorize } from '@society/authorization';
import { Alert } from '@/components/ui/alert';
import { RegisterSocietyAlert } from '@/components/register-society-alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';
import { loadFinanceSection } from '@/lib/services/finance-page-data';
import { FinanceWorkspace } from '@/app/(app)/finance/finance-workspace';

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  const context = await getRequestContext('accounting-page');
  if (!context) redirect('/login');
  if (!authorize(context, { moduleKey: 'accounting', resourceKey: 'account', action: 'READ' }).ok) {
    return <Alert>Accounting is unavailable. Enable the Accounting module and grant account:READ to your role.</Alert>;
  }
  if (!context.activeCompanyId || !context.identity) return <Alert>Select an active company workspace.</Alert>;

  const service = { context, actorUserId: context.identity.userId, requestId: 'accounting-page' };
  const societiesResult = await listSocieties(service, context.activeCompanyId);
  if (!societiesResult.ok) return <Alert>{societiesResult.message}</Alert>;

  const requestedId = (await searchParams).societyId;
  const requested = Array.isArray(requestedId) ? requestedId[0] : requestedId;
  const societyId = requested && societiesResult.value.some((item) => item.id === requested)
    ? requested
    : societiesResult.value[0]?.id;
  if (!societyId) return <RegisterSocietyAlert action="managing accounting" />;

  const initialData = await loadFinanceSection(service, context.activeCompanyId, societyId, 'accounting');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Accounting"
        description="Chart of accounts, journals, expenses and ledger trial balance."
        icon={BookOpen}
      />
      <FinanceWorkspace section="accounting" societies={societiesResult.value} societyId={societyId} initialData={initialData} />
    </div>
  );
}