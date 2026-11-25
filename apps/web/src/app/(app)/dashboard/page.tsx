import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Car,
  Check,
  ClipboardList,
  CreditCard,
  FileText,
  Layers3,
  MapPinned,
  Megaphone,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { prisma } from '@society/database';
import { authorize, visibleModules } from '@society/authorization';
import { getRequestContext } from '@/lib/auth/session';

interface ModuleCard {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const MODULE_CARDS: Record<string, ModuleCard> = {
  'society-foundation': {
    label: 'Society setup',
    description: 'Buildings, floors and flats',
    href: '/societies',
    icon: MapPinned,
  },
  residents: {
    label: 'Residents',
    description: 'Owners, tenants and families',
    href: '/residents',
    icon: Users,
  },
  'finance-billing': {
    label: 'Billing & dues',
    description: 'Charges, invoices and dues',
    href: '/finance',
    icon: CreditCard,
  },
  'payments-receipts': {
    label: 'Payments',
    description: 'Receipts and refunds',
    href: '/payments',
    icon: Receipt,
  },
  accounting: {
    label: 'Accounting',
    description: 'Ledgers, journals and periods',
    href: '/accounting',
    icon: BookOpen,
  },
  visitors: {
    label: 'Visitors',
    description: 'Approvals and gate log',
    href: '/operations/visitors/visitor',
    icon: ShieldCheck,
  },
  'complaints-maintenance': {
    label: 'Complaints',
    description: 'Work orders and SLAs',
    href: '/operations/complaints-maintenance/complaint',
    icon: ClipboardList,
  },
  'amenities-bookings': {
    label: 'Amenities',
    description: 'Facilities and bookings',
    href: '/operations/amenities-bookings/amenity',
    icon: CalendarDays,
  },
  'parking-vehicles': {
    label: 'Parking',
    description: 'Slots and vehicle records',
    href: '/operations/parking-vehicles/parking-slot',
    icon: Car,
  },
  'staff-attendance': {
    label: 'Staff',
    description: 'Employees and attendance',
    href: '/operations/staff-attendance/employee',
    icon: Briefcase,
  },
  'vendors-contracts': {
    label: 'Vendors',
    description: 'Contracts and work orders',
    href: '/operations/vendors-contracts/vendor',
    icon: Briefcase,
  },
  'notices-communication': {
    label: 'Notices',
    description: 'Announcements and updates',
    href: '/operations/notices-communication/notice',
    icon: Megaphone,
  },
  documents: {
    label: 'Documents',
    description: 'Private, controlled files',
    href: '/operations/documents/document',
    icon: FileText,
  },
  'meetings-voting': {
    label: 'Meetings & voting',
    description: 'Agendas, quorum and votes',
    href: '/operations/meetings-voting/meeting',
    icon: FileText,
  },
  'advanced-reports': {
    label: 'Reports',
    description: 'Cross-module insights',
    href: '/reports',
    icon: BarChart3,
  },
  integrations: {
    label: 'Integrations',
    description: 'Approved provider adapters',
    href: '/operations/integrations/integration',
    icon: Plug,
  },
};

const SPARKS: Record<string, number[]> = {
  brand: [34, 48, 42, 63, 55, 78, 72, 92],
  sky: [42, 58, 50, 68, 61, 80, 74, 88],
  violet: [30, 44, 52, 47, 66, 60, 78, 86],
  emerald: [38, 52, 46, 60, 70, 64, 82, 90],
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  const context = await getRequestContext('dashboard-page');
  if (!context) redirect('/login');

  const companyId = context.activeCompanyId;
  const canViewCompanies = authorize(context, {
    moduleKey: 'company', resourceKey: 'profile', action: 'READ', platform: true,
  }).ok;
  const [companyCount, activeCompany, societies, flats, enabledModules, enabledBusinessModules] = await Promise.all([
    canViewCompanies ? prisma.company.count() : Promise.resolve(null),
    companyId
      ? prisma.company.findUnique({ where: { id: companyId }, select: { name: true } })
      : Promise.resolve(null),
    companyId ? prisma.society.count({ where: { companyId } }) : Promise.resolve(0),
    companyId ? prisma.flat.count({ where: { companyId } }) : Promise.resolve(0),
    companyId
      ? prisma.companyModule.count({ where: { companyId, isEnabled: true } })
      : Promise.resolve(0),
    companyId
      ? prisma.companyModule.count({ where: { companyId, isEnabled: true, module: { isCore: false } } })
      : Promise.resolve(0),
  ]);

  const availableModules = visibleModules(context);
  const workspaceActions = [
    { label: 'Manage societies', detail: 'Buildings, floors and flats', href: '/societies', icon: MapPinned, key: 'societies' },
    { label: 'Resident directory', detail: 'Owners and tenants', href: '/residents', icon: Users, key: 'residents' },
    { label: 'Finance workspace', detail: 'Billing and payments', href: '/finance', icon: CreditCard, key: 'finance' },
    { label: 'Operations', detail: 'Visitors, complaints, amenities', href: '/operations', icon: Settings, key: 'operations' },
  ].filter((action) => availableModules.includes(action.key as (typeof availableModules)[number]));

  const metrics = [
    {
      label: companyId ? 'Workspace' : 'Companies',
      value: companyId ? activeCompany?.name ?? 'Workspace' : companyCount ?? '—',
      icon: Building2,
      detail: companyId ? 'Selected company' : canViewCompanies ? 'Platform total' : 'Platform access required',
      accent: 'brand',
    },
    {
      label: 'Societies',
      value: companyId ? societies : '—',
      icon: MapPinned,
      detail: companyId ? 'Managed properties' : 'Select a workspace',
      accent: 'sky',
    },
    {
      label: 'Flats / units',
      value: companyId ? flats : '—',
      icon: Users,
      detail: companyId ? 'Registered units' : 'Select a workspace',
      accent: 'violet',
    },
    {
      label: 'Enabled modules',
      value: companyId ? enabledModules : '—',
      icon: Layers3,
      detail: companyId ? 'Available capabilities' : 'Select a workspace',
      accent: 'emerald',
    },
  ];

  const setupSteps = [
    { label: 'Add your first society', done: societies > 0 },
    { label: 'Create flats and units', done: flats > 0 },
    { label: 'Enable business modules', done: enabledBusinessModules > 0 },
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;
  const progress = Math.round((completedSteps / setupSteps.length) * 100);
  const moduleCards = availableModules
    .map((key) => MODULE_CARDS[key])
    .filter((card): card is ModuleCard => Boolean(card));

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="dash-page">
      {/* Hero ---------------------------------------------------------- */}
      <header className="dash-hero">
        <div className="dash-hero-copy">
          <p className="dash-eyebrow">{greeting()} · {companyId ? 'Company workspace' : 'Platform workspace'}</p>
          <h1 className="dash-title">
            {companyId ? (
              <><span className="dash-title-accent">{activeCompany?.name ?? 'Workspace overview'}</span></>
            ) : (
              <>Your platform <span className="dash-title-accent">overview</span></>
            )}
          </h1>
          <p className="dash-subtitle">
            {companyId
              ? 'A clear view of the properties, units and capabilities in this workspace. Keep operations moving with everything in one place.'
              : 'Choose a workspace to see its property operations, or manage the companies on your platform.'}
          </p>
          <div className="dash-meta">
            <span className={`dash-status-pill${companyId ? '' : ' dash-status-pill-muted'}`}>
              {companyId ? 'Workspace active' : 'Workspace not selected'}
            </span>
            <span className="dash-meta-chip"><CalendarDays className="h-3.5 w-3.5" /> {today}</span>
            <span className="dash-meta-chip"><Layers3 className="h-3.5 w-3.5" /> {availableModules.length} modules available</span>
          </div>
        </div>
        <div className="dash-hero-side">
          <div
            className="dash-ring"
            style={{ background: `conic-gradient(#818cf8 ${progress}%, rgba(255, 255, 255, 0.13) 0)` }}
            role="img"
            aria-label={`Workspace setup ${progress}% complete`}
          >
            <div className="dash-ring-inner">
              <span className="dash-ring-value">{progress}%</span>
              <span className="dash-ring-label">setup</span>
            </div>
          </div>
          <p className="dash-ring-caption">
            {companyId ? `${completedSteps} of ${setupSteps.length} steps complete` : 'Select a workspace to begin'}
          </p>
        </div>
      </header>

      {/* Metrics ------------------------------------------------------- */}
      <section className="dash-metrics" aria-label="Key metrics">
        {metrics.map((metric) => (
          <article className="dash-stat" key={metric.label}>
            <div className="dash-stat-top">
              <div>
                <p className="dash-stat-label">{metric.label}</p>
                <p className={`dash-stat-value ${typeof metric.value === 'string' && metric.value.length > 12 ? 'dash-stat-value-long' : ''}`}>
                  {metric.value}
                </p>
              </div>
              <span className={`dash-stat-icon dash-stat-${metric.accent}`}>
                <metric.icon className="h-5 w-5" />
              </span>
            </div>
            <p className="dash-stat-detail"><Sparkles className="h-3.5 w-3.5" /> {metric.detail}</p>
            <div className="dash-stat-spark" aria-hidden="true">
              {(SPARKS[metric.accent] ?? []).map((height, index) => (
                <span
                  key={index}
                  style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }}
                />
              ))}
            </div>
          </article>
        ))}
      </section>

      {/* Contextual guidance ------------------------------------------ */}
      {!companyId ? (
        <section className="dash-guidance" aria-label="Choose a workspace">
          <div className="dash-guidance-icon"><Building2 className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="page-eyebrow">Next step</p>
            <h2>Choose a workspace to get started</h2>
            <p>
              Open Companies from the sidebar to manage tenants, or sign in with a company account to work inside a
              specific workspace.
            </p>
          </div>
          {canViewCompanies ? (
            <Link href="/companies" className="landing-button landing-button-primary">
              Manage companies <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </section>
      ) : societies === 0 && workspaceActions.some((action) => action.key === 'societies') ? (
        <section className="dash-guidance" aria-label="Set up your first society">
          <div className="dash-guidance-icon"><MapPinned className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="page-eyebrow">Get started</p>
            <h2>Add your first society</h2>
            <p>
              Set up a society first, then add its buildings, floors and units to make this dashboard more useful.
            </p>
          </div>
          <Link href="/societies" className="landing-button landing-button-primary">
            Add a society <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : null}

      {/* Quick actions + setup ----------------------------------------- */}
      <div className="dash-grid">
        <section className="dash-panel" aria-label="Quick actions">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">
                <span className="dash-panel-title-icon"><Sparkles className="h-4 w-4" /></span>
                Quick actions
              </h2>
              <p className="dash-panel-subtitle">Jump straight into the work that matters today</p>
            </div>
          </div>
          <div className="dash-panel-body">
            {workspaceActions.length > 0 ? (
              <div className="dash-actions">
                {workspaceActions.map((action) => (
                  <Link key={action.key} href={action.href} className="dash-action">
                    <span className="dash-action-icon"><action.icon className="h-5 w-5" /></span>
                    <span className="dash-action-copy">
                      <span className="dash-action-label">{action.label}</span>
                      <span className="dash-action-detail">{action.detail}</span>
                    </span>
                    <ArrowRight className="dash-action-arrow h-4 w-4" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dash-empty-note">
                <strong>{companyId ? 'No quick actions available yet' : 'Your workspaces will appear here'}</strong>
                <p>
                  {companyId
                    ? 'Available actions appear when the related modules are enabled for this company.'
                    : 'Sign in with a company account to see workspace tasks.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="dash-panel" aria-label="Workspace setup progress">
          <div className="dash-panel-head">
            <div>
              <h2 className="dash-panel-title">
                <span className="dash-panel-title-icon"><Check className="h-4 w-4" /></span>
                Workspace setup
              </h2>
              <p className="dash-panel-subtitle">A little setup unlocks a lot of clarity</p>
            </div>
            <span className="dash-count-pill">{completedSteps}/{setupSteps.length} done</span>
          </div>
          <div className="dash-panel-body">
            <div className="dash-setup-progress">
              <strong>Configuration progress</strong>
              <span>{progress}%</span>
            </div>
            <div className="dash-setup-bar" aria-hidden="true">
              <div className="dash-setup-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <ul className="dash-setup-list">
              {setupSteps.map((step) => (
                <li key={step.label} className={`dash-setup-item${step.done ? ' done' : ''}`}>
                  <span className="dash-setup-check" aria-hidden="true"><Check className="h-3 w-3" /></span>
                  {step.label}
                </li>
              ))}
            </ul>
            {companyId && completedSteps < setupSteps.length ? (
              <Link href="/societies" className="landing-button landing-button-secondary" style={{ marginTop: 18, width: '100%' }}>
                Continue setup <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : null}
            {!companyId ? (
              <p className="mt-4 text-xs leading-5 text-ink-500">
                Select a company workspace to track its configuration here.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* Modules -------------------------------------------------------- */}
      <section className="dash-panel" aria-label="Available modules">
        <div className="dash-panel-head">
          <div>
            <h2 className="dash-panel-title">
              <span className="dash-panel-title-icon"><Layers3 className="h-4 w-4" /></span>
              Available modules
            </h2>
            <p className="dash-panel-subtitle">Only the tools enabled for this workspace appear here</p>
          </div>
          {companyId ? <span className="dash-count-pill">{moduleCards.length} enabled</span> : null}
        </div>
        <div className="dash-panel-body">
          {companyId && moduleCards.length > 0 ? (
            <div className="dash-modules">
              {moduleCards.map((module) => (
                <Link key={module.label} href={module.href} className="dash-module">
                  <span className="dash-module-icon"><module.icon className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="dash-module-name block">{module.label}</span>
                    <span className="dash-module-desc block">{module.description}</span>
                  </span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-300" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="dash-empty-note">
              <strong>{companyId ? 'No modules available yet' : 'Select a workspace'}</strong>
              <p>
                {companyId
                  ? 'Ask your platform administrator to enable the tools your team needs.'
                  : 'Choose a company workspace to see its enabled modules.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
