import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { authorize } from '@society/authorization';
import { prisma } from '@society/database';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  const context = await getRequestContext('platform-roles-page');
  if (!context) redirect('/login');
  const allowed = authorize(context, {
    moduleKey: 'rbac', resourceKey: 'role', action: 'READ', platform: true,
  }).ok;
  if (!allowed) return <Alert>Platform role access is required.</Alert>;

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        scopeType: true,
        isSystemRole: true,
        company: { select: { name: true, code: true } },
        _count: { select: { permissions: true, userRoles: true } },
      },
      orderBy: [{ scopeType: 'asc' }, { name: 'asc' }],
      take: 200,
    }),
    prisma.permission.findMany({
      select: { id: true, key: true, moduleKey: true, resourceKey: true, action: true },
      orderBy: [{ moduleKey: 'asc' }, { resourceKey: 'asc' }, { action: 'asc' }],
    }),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Platform administration"
        title="Roles & permissions"
        description="Review platform and company roles, their permission counts and the catalog of available permissions."
        icon={ShieldCheck}
        actions={<span className="section-count">{roles.length} roles</span>}
      />

      <section className="data-panel" aria-label="Roles">
        <div className="data-panel-head">
          <div>
            <h2 className="section-title">Roles</h2>
            <p className="section-subtitle">Assign roles to company users from each company&apos;s user page.</p>
          </div>
        </div>
        {roles.length === 0 ? (
          <div className="society-empty">
            <span className="society-empty-icon"><ShieldCheck className="h-6 w-6" /></span>
            <h3>No roles found</h3>
            <p>Roles are seeded on first installation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Scope</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Permissions</th>
                  <th className="px-5 py-3">Assigned</th>
                  <th className="px-5 py-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-ink-100/80 transition-colors last:border-0 hover:bg-ink-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-ink-900">{role.name}</p>
                      <p className="text-[11px] text-ink-500">{role.key}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="status-pill status-pill-brand">{role.scopeType.toLowerCase()}</span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-700">{role.company ? `${role.company.name} (${role.company.code})` : 'Platform'}</td>
                    <td className="px-5 py-3.5 tabular-nums text-ink-700">{role._count.permissions}</td>
                    <td className="px-5 py-3.5 tabular-nums text-ink-700">{role._count.userRoles}</td>
                    <td className="px-5 py-3.5 text-ink-500">{role.isSystemRole ? 'System' : 'Custom'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="data-panel" aria-label="Permission catalog">
        <div className="data-panel-head">
          <div>
            <h2 className="section-title">Permission catalog</h2>
            <p className="section-subtitle">{permissions.length} permissions available to roles.</p>
          </div>
        </div>
        <div className="max-h-[420px] overflow-auto p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {permissions.map((permission) => (
              <div key={permission.id} className="rounded-lg border border-ink-100 bg-ink-50/70 px-3 py-2 text-xs">
                <p className="font-semibold text-ink-800">{permission.moduleKey}</p>
                <p className="text-ink-500">{permission.resourceKey} · {permission.action}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
