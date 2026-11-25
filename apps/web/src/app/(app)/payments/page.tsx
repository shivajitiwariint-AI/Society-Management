import { redirect } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { authorize } from '@society/authorization';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';
import { loadFinanceSection } from '@/lib/services/finance-page-data';
import { FinanceWorkspace } from '@/app/(app)/finance/finance-workspace';

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  const context = await getRequestContext('payments-page');
  if (!context) redirect('/login');
  if (!authorize(context, { moduleKey: 'payments-receipts', resourceKey: 'payment', action: 'READ' }).ok) {
    return <Alert>Payments are unavailable. Enable the Payments module and grant payment:READ to your role.</Alert>;
  }
  if (!context.activeCompanyId || !context.identity) return <Alert>Select an active company workspace.</Alert>;

  const service = { context, actorUserId: context.identity.userId, requestId: 'payments-page' };
  const societiesResult = await listSocieties(service, context.activeCompanyId);
  if (!societiesResult.ok) return <Alert>{societiesResult.message}</Alert>;

  const requestedId = (await searchParams).societyId;
  const requested = Array.isArray(requestedId) ? requestedId[0] : requestedId;
  const societyId = requested && societiesResult.value.some((item) => item.id === requested)
    ? requested
    : societiesResult.value[0]?.id;
  if (!societyId) return <Alert tone="info">Register a society before recording payments.</Alert>;

  const initialData = await loadFinanceSection(service, context.activeCompanyId, societyId, 'payments');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Payments & receipts"
        description="Offline recording first, with approval, reconciliation, refunds and reversal history."
        icon={Receipt}
      />
      <Alert tone="info">Online gateway integration is intentionally disabled until a provider is approved. All records are append-only and audited.</Alert>
      <FinanceWorkspace section="payments" societies={societiesResult.value} societyId={societyId} initialData={initialData} />
    </div>
  );
}
