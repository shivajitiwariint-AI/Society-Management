import { redirect } from 'next/navigation';
import { authorize } from '@society/authorization';
import {
  DOCUMENT_VERIFICATION_STATUSES,
  FAMILY_RELATIONSHIPS,
  RESIDENT_STATUSES,
  RESIDENT_TYPES,
  VEHICLE_TYPES,
} from '@society/shared';
import { Users } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';
import { listResidents } from '@/lib/services/resident-service';
import { ResidentWorkspace } from './resident-workspace';

type PageProps = { searchParams: Promise<{ societyId?: string | string[] }> };

export default async function ResidentsPage({ searchParams }: PageProps) {
  const context = await getRequestContext('residents-page');
  if (!context) redirect('/login');

  const can = (action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE') =>
    authorize(context, { moduleKey: 'residents', resourceKey: 'resident', action }).ok;

  if (!can('READ')) {
    return (
      <Alert>
        Resident management is unavailable. The Residents module must be enabled and your role needs
        <code className="mx-1">residents:resident:READ</code>.
      </Alert>
    );
  }
  if (!context.activeCompanyId || !context.identity) {
    return <Alert>Select an active company workspace before managing residents.</Alert>;
  }

  const service = { context, actorUserId: context.identity.userId, requestId: 'residents-page' };
  const societyResult = await listSocieties(service, context.activeCompanyId);
  if (!societyResult.ok) return <Alert>{societyResult.message}</Alert>;

  const requestedId = (await searchParams).societyId;
  const requested = Array.isArray(requestedId) ? requestedId[0] : requestedId;
  const societyId =
    requested && societyResult.value.some((society) => society.id === requested)
      ? requested
      : societyResult.value[0]?.id;

  if (!societyId) {
    return (
      <Alert tone="info">
        Register a society and at least one flat in Society Setup before adding residents.
      </Alert>
    );
  }

  const initial = await listResidents(service, context.activeCompanyId, societyId, { page: 1, pageSize: 20 });
  if (!initial.ok) return <Alert>{initial.message}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        title="Residents"
        description="Owners, tenants, family members, vehicles, and ownership/tenancy history."
        icon={Users}
      />
      <Alert tone="info">
        Resident records contain personal data. Access is restricted by company, society, role, and data scope; every
        profile, ownership, and verification change is audited.
      </Alert>
      <ResidentWorkspace
        societies={societyResult.value}
        societyId={societyId}
        categories={{
          residentTypes: RESIDENT_TYPES,
          residentStatuses: RESIDENT_STATUSES,
          documentStatuses: DOCUMENT_VERIFICATION_STATUSES,
          relationships: FAMILY_RELATIONSHIPS,
          vehicleTypes: VEHICLE_TYPES,
        }}
        canCreate={can('CREATE')}
        canUpdate={can('UPDATE')}
        canDelete={can('DELETE')}
        initial={initial.value}
      />
    </div>
  );
}