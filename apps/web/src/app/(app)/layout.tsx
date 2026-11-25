import { redirect } from 'next/navigation';
import { canAccessModule } from '@society/authorization';
import { prisma } from '@society/database';
import { NAV_ITEMS } from '@/lib/navigation';
import { AppShell } from '@/components/app-shell';

const PLATFORM_NAV_HREFS = new Set(['/companies', '/societies']);
import { csrfTokenForClient, getRequestContext, getSession } from '@/lib/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const context = await getRequestContext('page-request');
  if (!context) redirect('/login');

  const isPlatformUser = context.roles.some((role) => role.scopeType === 'PLATFORM');
  // Platform admins manage tenants and their property setup; day-to-day
  // operational modules belong to the company-side workspace.
  const navItems = NAV_ITEMS.filter((item) =>
    isPlatformUser
      ? PLATFORM_NAV_HREFS.has(item.href)
      : !PLATFORM_NAV_HREFS.has(item.href) && canAccessModule(context, item.moduleKey).ok,
  );

  const companies = isPlatformUser
    ? await prisma.company.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : (
        await prisma.userMembership.findMany({
          where: { userId: session.userId, status: 'ACTIVE', company: { status: 'ACTIVE' } },
          select: { companyId: true, company: { select: { name: true } } },
        })
      ).map((membership) => ({ id: membership.companyId, name: membership.company.name }));

  const csrfToken = await csrfTokenForClient();

  return (
    <AppShell
      items={navItems.map((item) => ({
        key: item.href,
        label: item.label,
        href: item.href,
        icon: item.moduleKey,
      }))}
      companies={companies}
      activeCompanyId={session.activeCompanyId}
      canSwitchCompany={isPlatformUser}
      userName={isPlatformUser
        ? session.user.name ?? session.user.email
        : (session.user.name ?? session.user.email).replace(/\badmin\b/gi, '').replace(/\s+/g, ' ').trim() || session.user.email}
      csrfToken={csrfToken}
    >
      {children}
    </AppShell>
  );
}
