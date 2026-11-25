import { redirect } from 'next/navigation';
import {
  BellRing,
  BookOpen,
  Briefcase,
  CalendarDays,
  Car,
  ClipboardList,
  FileText,
  Layers3,
  Megaphone,
  Plug,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { authorize } from '@society/authorization';
import { MODULES, getOperationDefinition, type ModuleKey } from '@society/shared';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { listSocieties } from '@/lib/services/society-service';
import { listOperations } from '@/lib/services/operations-service';
import { OperationWorkspace } from './[moduleKey]/[resourceKey]/operation-workspace';

const MODULE_ICONS: Record<string, LucideIcon> = {
  visitors: ShieldCheck,
  'complaints-maintenance': ClipboardList,
  'amenities-bookings': CalendarDays,
  'parking-vehicles': Car,
  'staff-attendance': Briefcase,
  'vendors-contracts': Briefcase,
  'notices-communication': Megaphone,
  documents: FileText,
  'meetings-voting': BookOpen,
  integrations: Plug,
};

const MODULE_EYEBROWS: Record<string, string> = {
  visitors: 'Gate operations',
  'complaints-maintenance': 'Service operations',
  'amenities-bookings': 'Community amenities',
  'parking-vehicles': 'Parking operations',
  'staff-attendance': 'People operations',
  'vendors-contracts': 'Vendor operations',
  'notices-communication': 'Communication',
  documents: 'Document control',
  'meetings-voting': 'Governance',
  integrations: 'Platform integrations',
};

/** Shared server-rendered workspace used by every operations module page. */
export async function OperationSection({
  moduleKey,
  resourceKey,
  searchParams,
}: {
  moduleKey: string;
  resourceKey: string;
  searchParams: Promise<{ societyId?: string | string[] }>;
}) {
  const definition = getOperationDefinition(moduleKey, resourceKey);
  if (!definition) return <Alert tone="error">Unknown operation: {moduleKey}/{resourceKey}.</Alert>;

  const context = await getRequestContext(`operation:${moduleKey}:${resourceKey}`);
  if (!context) redirect('/login');

  const can = (action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE') =>
    authorize(context, { moduleKey: definition.moduleKey as ModuleKey, resourceKey: definition.resourceKey, action }).ok;

  if (!can('READ')) {
    return (
      <Alert>
        This workspace is unavailable. Enable the {definition.moduleKey} module and grant
        <code className="mx-1">{definition.resourceKey}:READ</code> to your role.
      </Alert>
    );
  }
  if (!context.activeCompanyId || !context.identity) {
    return <Alert>Select an active company workspace before using this module.</Alert>;
  }

  const service = { context, actorUserId: context.identity.userId, requestId: `operation:${resourceKey}` };
  const societyResult = await listSocieties(service, context.activeCompanyId);
  if (!societyResult.ok) return <Alert>{societyResult.message}</Alert>;

  const requestedId = (await searchParams).societyId;
  const requested = Array.isArray(requestedId) ? requestedId[0] : requestedId;
  const societyId =
    requested && societyResult.value.some((item) => item.id === requested)
      ? requested
      : societyResult.value[0]?.id;

  if (!societyId) {
    return <Alert tone="info">Register a society in Society Setup before using this module.</Alert>;
  }

  const initial = await listOperations(
    service,
    context.activeCompanyId,
    societyId,
    definition.moduleKey,
    definition.resourceKey,
    { page: 1, pageSize: 20 },
  );
  if (!initial.ok) return <Alert>{initial.message}</Alert>;

  const ModuleIcon = MODULE_ICONS[definition.moduleKey] ?? Layers3;
  const moduleName = MODULES.find((module) => module.key === definition.moduleKey)?.name;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={MODULE_EYEBROWS[definition.moduleKey] ?? moduleName ?? 'Operations'}
        title={definition.label}
        description="Tenant-scoped records with server-enforced permissions, workflow status and a complete audit trail."
        icon={ModuleIcon}
        actions={
          <span className="status-pill status-pill-muted">
            <BellRing className="h-3.5 w-3.5" /> {moduleName ?? definition.moduleKey}
          </span>
        }
      />
      <OperationWorkspace
        definition={definition}
        societies={societyResult.value}
        societyId={societyId}
        initial={initial.value}
        canCreate={can('CREATE')}
        canUpdate={can('UPDATE')}
        canDelete={can('DELETE')}
      />
    </div>
  );
}
