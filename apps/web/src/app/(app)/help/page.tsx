import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MapPinned,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { visibleModules } from '@society/authorization';
import { MODULES } from '@society/shared';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { HelpFaq } from './help-faq';

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  const context = await getRequestContext('help-page');
  if (!context) redirect('/login');
  const isPlatformUser = context.roles.some((role) => role.scopeType === 'PLATFORM');
  const enabled = new Set(visibleModules(context));

  const quickStarts = isPlatformUser
    ? [
        { label: 'Companies', detail: 'Add companies and open their dashboards', href: '/companies', icon: Building2 },
        { label: 'Dashboard', detail: 'See the active company overview', href: '/dashboard', icon: LayoutDashboard },
      ]
    : [
        { label: 'Societies', detail: 'Set up buildings, floors and flats', href: '/societies', icon: MapPinned },
        { label: 'Residents', detail: 'Manage owners, tenants and families', href: '/residents', icon: Users },
        { label: 'Billing & dues', detail: 'Issue invoices and track dues', href: '/finance', icon: CreditCard },
      ];

  const guides = MODULES.filter((module) => enabled.has(module.key)).slice(0, 12);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Help centre"
        title="Help & support"
        description="Find your way around the workspace, understand how modules work and get answers to common questions."
        icon={LifeBuoy}
      />

      <section className="summary-strip" aria-label="Help summary">
        <div className="summary-item">
          <span className="summary-icon summary-icon-brand"><BookOpen className="h-5 w-5" /></span>
          <div>
            <p className="summary-label">Quick starts</p>
            <p className="summary-value">{quickStarts.length}</p>
          </div>
        </div>
        <div className="summary-item">
          <span className="summary-icon summary-icon-violet"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <p className="summary-label">Modules available</p>
            <p className="summary-value">{enabled.size}</p>
          </div>
        </div>
        <p className="summary-note">
          <ShieldCheck className="h-3.5 w-3.5" />
          Every action is permission-checked and recorded in the audit trail.
        </p>
      </section>

      <section aria-label="Quick start guides">
        <div className="section-heading">
          <h2 className="section-title">Start here</h2>
          <span className="section-count">Most used</span>
        </div>
        <div className="society-grid">
          {quickStarts.map((item) => (
            <Link key={item.href} href={item.href} className="society-card">
              <span className="society-card-icon"><item.icon className="h-5 w-5" /></span>
              <span className="society-card-copy">
                <span className="society-card-name">{item.label}</span>
                <span className="society-card-meta">{item.detail}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-brand-600" />
            </Link>
          ))}
        </div>
      </section>

      <section className="data-panel" aria-label="Module guide">
        <div className="data-panel-head">
          <div>
            <h2 className="section-title">Module guide</h2>
            <p className="section-subtitle">Capabilities available to your account.</p>
          </div>
          <span className="section-count">{guides.length} shown</span>
        </div>
        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((module) => (
            <div key={module.key} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
              <p className="text-[13px] font-semibold text-ink-900">{module.name}</p>
              <p className="mt-1 text-[11px] leading-5 text-ink-500">{module.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="create-panel" aria-label="Common questions">
        <div className="create-panel-head">
          <span className="create-panel-icon"><BarChart3 className="h-5 w-5" /></span>
          <div>
            <h2 className="section-title">Common questions</h2>
            <p className="section-subtitle">Search the topics below for a quick answer.</p>
          </div>
        </div>
        <div className="create-panel-body">
          <HelpFaq />
        </div>
      </section>

      <section className="dash-guidance" aria-label="Security and audit help">
        <div className="dash-guidance-icon"><ShieldCheck className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="page-eyebrow">Security</p>
          <h2>Every change is recorded.</h2>
          <p>
            {isPlatformUser
              ? 'Company, module and password changes require a reason and are recorded with your administrator identity.'
              : 'Your company administrator can review the workspace history. Contact them if you need details about a specific change.'}
          </p>
        </div>
      </section>
    </div>
  );
}
