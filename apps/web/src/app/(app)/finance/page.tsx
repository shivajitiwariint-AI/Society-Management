import { redirect } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { authorize } from '@society/authorization';
import { Alert } from '@/components/ui/alert';
import { RegisterSocietyAlert } from '@/components/register-society-alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';
import { loadFinanceSection } from '@/lib/services/finance-page-data';
import { FinanceWorkspace } from './finance-workspace';

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  const context = await getRequestContext('finance-page');
  if (!context) redirect('/login');
  if (!authorize(context, { moduleKey: 'finance-billing', resourceKey: 'invoice', action: 'READ' }).ok) {
    return <Alert>Billing is unavailable. Enable the Finance module and grant invoice:READ to your role.</Alert>;
  }
  if (!context.activeCompanyId || !context.identity) return <Alert>Select an active company workspace.</Alert>;

  const service = { context, actorUserId: context.identity.userId, requestId: 'finance-page' };
  const societiesResult = await listSocieties(service, context.activeCompanyId);
  if (!societiesResult.ok) return <Alert>{societiesResult.message}</Alert>;

  const requestedId = (await searchParams).societyId;
  const requested = Array.isArray(requestedId) ? requestedId[0] : requestedId;
  const societyId = requested && societiesResult.value.some((item) => item.id === requested)
    ? requested
    : societiesResult.value[0]?.id;
  if (!societyId) return <RegisterSocietyAlert action="managing billing" />;

  const initialData = await loadFinanceSection(service, context.activeCompanyId, societyId, 'billing');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Billing & dues"
        description="Charge types, issued invoices and outstanding dues with period locks."
        icon={CreditCard}
      />
      <FinanceWorkspace section="billing" societies={societiesResult.value} societyId={societyId} initialData={initialData} />
    </div>
  );
}
