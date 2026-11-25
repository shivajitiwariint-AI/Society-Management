import { redirect } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import { authorize } from '@society/authorization';
import { prisma } from '@society/database';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { SystemSettingEditor, type SystemSettingRow } from './system-setting-editor';

export const dynamic = 'force-dynamic';

export default async function SystemSettingsPage() {
  const context = await getRequestContext('system-settings-page');
  if (!context) redirect('/login');
  const allowed = authorize(context, {
    moduleKey: 'security-settings', resourceKey: 'system-setting', action: 'MANAGE_SETTINGS', platform: true,
  }).ok;
  if (!allowed) return <Alert>Platform settings access is required.</Alert>;

  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: 'asc' },
    select: { key: true, value: true, isSecret: true, updatedAt: true },
  });
  const rows: SystemSettingRow[] = settings.map((setting) => ({
    key: setting.key,
    isSecret: setting.isSecret,
    displayValue: setting.isSecret ? '••••••••' : JSON.stringify(setting.value),
    updatedAt: setting.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Platform administration"
        title="System settings"
        description="Global platform defaults and configuration. Secret values stay hidden; every edit is audited."
        icon={Settings2}
      />
      <SystemSettingEditor settings={rows} />
    </div>
  );
}
