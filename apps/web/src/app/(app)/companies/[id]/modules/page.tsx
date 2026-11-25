import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authorize } from '@society/authorization';
import { ArrowLeft, Layers3, Link2 } from 'lucide-react';
import { MODULES, MODULE_DEPENDENCIES } from '@society/shared';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { getRequestContext } from '@/lib/auth/session';
import { listCompanyModules } from '@/lib/services/entitlement-service';
import { ModuleManager, type ModuleManagerRow } from './entitlement-control';

type PageProps = { params: Promise<{ id: string }> };

export default async function CompanyModulesPage({ params }: PageProps) {
  const context = await getRequestContext('modules-page');
  if (!context) redirect('/login');
  const decision = authorize(context, {
    moduleKey: 'company', resourceKey: 'settings', action: 'READ', platform: true,
  });
  if (!decision.ok) return <Alert>You do not have permission to manage module entitlements.</Alert>;

  const companyId = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) return <Alert>Invalid company id.</Alert>;
  const modules = await listCompanyModules(companyId);

  const nameByKey = new Map(MODULES.map((module) => [module.key, module.name]));
  const dependencies = MODULE_DEPENDENCIES.map(([moduleKey, dependsOn]) => ({
    moduleKey,
    dependsOn,
    module: nameByKey.get(moduleKey) ?? moduleKey,
    dependsOnName: nameByKey.get(dependsOn) ?? dependsOn,
  }));
  const moduleRows: ModuleManagerRow[] = modules.map((module) => ({
    moduleKey: module.moduleKey,
    name: module.name,
    isCore: module.isCore,
    isEnabled: module.isEnabled,
    accessMode: module.accessMode,
    requires: dependencies
      .filter((dependency) => dependency.moduleKey === module.moduleKey)
      .map((dependency) => ({ key: dependency.dependsOn, name: dependency.dependsOnName })),
  }));

  return (
    <div className="space-y-6">
      <Link href={`/companies/${companyId}`} className="back-link">
        <ArrowLeft className="h-3.5 w-3.5" /> Company details
      </Link>
      <PageHeader
        eyebrow="Platform administration"
        title="Module entitlements"
        description="Core modules are always on. Business modules are disabled by default and check dependencies on enable."
        icon={Layers3}
      />

      <details className="data-panel dependency-details">
        <summary className="data-panel-head">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-brand-600" />
            <span>
              <span className="block font-semibold text-ink-900">Module dependencies</span>
              <span className="block text-xs text-ink-500">{dependencies.length} rules · expand to review requirements</span>
            </span>
          </span>
          <span className="section-count">View rules</span>
        </summary>
        <div className="grid gap-2 border-t border-ink-100 p-5 sm:grid-cols-2">
            {dependencies.map((dependency) => (
              <div
                key={`${dependency.module}-${dependency.dependsOn}`}
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ink-100 bg-ink-50/70 px-3 py-2 text-xs text-ink-700"
              >
                <span className="font-semibold">{dependency.module}</span>
                <span className="text-ink-400">requires</span>
                <span className="font-medium text-brand-700">{dependency.dependsOnName}</span>
              </div>
            ))}
          </div>
      </details>

      <Card className="overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <CardContent className="p-0">
          <ModuleManager companyId={companyId} modules={moduleRows} />
        </CardContent>
      </Card>
    </div>
  );
}
