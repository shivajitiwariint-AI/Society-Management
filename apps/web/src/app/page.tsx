import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Landmark,
  Layers3,
  LockKeyhole,
  MapPinned,
  Megaphone,
  MessageSquare,
  Plug,
  Receipt,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { ScrollReveal } from '@/components/scroll-reveal';
import { LandingNav } from '@/components/landing-nav';
import { LandingMotion } from '@/components/landing-motion';
import { HomeLink } from '@/components/home-link';
import { BrandMark } from '@/components/brand-logo';

const FEATURES = [
  {
    icon: Building2,
    title: 'Property management',
    text: 'Organize companies, societies, buildings, floors and flats in one clear hierarchy that scales with your portfolio.',
    accent: 'landing-feature-brand',
  },
  {
    icon: Users,
    title: 'Resident operations',
    text: 'Maintain owners, tenants, family members, vehicles and occupancy records with complete relationship history.',
    accent: 'landing-feature-sky',
  },
  {
    icon: Landmark,
    title: 'Finance & billing',
    text: 'Manage dues, invoices, payments, expenses, journals and period closes with a finance-ready audit trail.',
    accent: 'landing-feature-emerald',
  },
  {
    icon: ClipboardList,
    title: 'Daily operations',
    text: 'Track visitors, complaints, amenities, parking, staff and vendor contracts without chasing spreadsheets.',
    accent: 'landing-feature-amber',
  },
  {
    icon: Megaphone,
    title: 'Communication',
    text: 'Publish notices, store documents and run meetings with transparent agendas, quorum and voting.',
    accent: 'landing-feature-violet',
  },
  {
    icon: BarChart3,
    title: 'Reports & insights',
    text: 'Turn everyday operational data into clear, permission-gated reports for every stakeholder.',
    accent: 'landing-feature-rose',
  },
];

const ROLES = [
  {
    icon: Building2,
    title: 'Management companies',
    text: 'Oversee every society in your portfolio from one workspace, with company-level isolation and module control.',
    tags: ['Multi-company', 'Entitlements', 'Consolidated view'],
    accent: 'landing-persona-brand',
  },
  {
    icon: Users,
    title: 'Society committees',
    text: 'Run day-to-day operations with resident directories, notices, meetings and transparent complaint tracking.',
    tags: ['Residents', 'Notices', 'Meetings'],
    accent: 'landing-persona-rose',
  },
  {
    icon: Receipt,
    title: 'Accounts teams',
    text: 'Bill accurately, reconcile payments and close periods with ledgers that are ready for review at any time.',
    tags: ['Billing', 'Reconciliation', 'Audit trail'],
    accent: 'landing-persona-emerald',
  },
];

const MODULES = [
  { icon: MapPinned, label: 'Society setup' },
  { icon: Users, label: 'Residents' },
  { icon: CreditCard, label: 'Billing & dues' },
  { icon: Wallet, label: 'Payments' },
  { icon: BookOpen, label: 'Accounting' },
  { icon: ShieldCheck, label: 'Visitors & security' },
  { icon: CalendarDays, label: 'Amenities & parking' },
  { icon: Megaphone, label: 'Notices & reports' },
];

const MARQUEE = [
  { icon: Building2, label: 'Multi-company', tone: 'marquee-brand' },
  { icon: MapPinned, label: 'Society setup', tone: 'marquee-sky' },
  { icon: Users, label: 'Residents', tone: 'marquee-violet' },
  { icon: CreditCard, label: 'Billing & dues', tone: 'marquee-emerald' },
  { icon: Wallet, label: 'Payments', tone: 'marquee-amber' },
  { icon: BookOpen, label: 'Accounting', tone: 'marquee-rose' },
  { icon: ShieldCheck, label: 'Visitors', tone: 'marquee-teal' },
  { icon: ClipboardList, label: 'Complaints', tone: 'marquee-fuchsia' },
  { icon: CalendarDays, label: 'Amenities', tone: 'marquee-sky' },
  { icon: Briefcase, label: 'Staff & vendors', tone: 'marquee-violet' },
  { icon: Megaphone, label: 'Notices', tone: 'marquee-amber' },
  { icon: FileText, label: 'Documents', tone: 'marquee-emerald' },
  { icon: MessageSquare, label: 'Meetings & voting', tone: 'marquee-brand' },
  { icon: BarChart3, label: 'Reports', tone: 'marquee-rose' },
  { icon: Plug, label: 'Integrations', tone: 'marquee-teal' },
  { icon: LockKeyhole, label: 'Audit trail', tone: 'marquee-fuchsia' },
];

const STEPS = [
  {
    icon: Building2,
    title: 'Register your company',
    text: 'Create your tenant workspace and choose the currency and timezone that fit your business.',
    accent: 'landing-step-brand',
  },
  {
    icon: Settings2,
    title: 'Enable your modules',
    text: 'Switch on only the tools you need. Dependencies are handled for you automatically.',
    accent: 'landing-step-sky',
  },
  {
    icon: UserPlus,
    title: 'Invite your team',
    text: 'Assign roles and societies, then start managing operations with full accountability.',
    accent: 'landing-step-emerald',
  },
];

const FAQS = [
  {
    question: 'How does company isolation work?',
    answer:
      'Every request is resolved against a server-derived tenant context. Company data is never shared across workspaces, and permissions are evaluated before any record is read or changed.',
  },
  {
    question: 'Can each company enable different modules?',
    answer:
      'Yes. Modules are entitled per company, with dependencies validated automatically. Core modules stay available, while business modules can be enabled or disabled as each customer needs them.',
  },
  {
    question: 'What happens when a resident or flat changes?',
    answer:
      'Ownership and tenancy history is preserved rather than overwritten, so you keep a reliable record of who lived where and when. Changes flow into billing and operational reports.',
  },
  {
    question: 'Is every action auditable?',
    answer:
      'Sensitive actions produce append-only audit events with the actor, tenant context and outcome. That includes sign-in activity, permission changes, billing actions and payment decisions.',
  },
  {
    question: 'Do we need to migrate everything at once?',
    answer:
      'No. Start with a company, add your first society and its property structure, then enable modules as your team is ready. Historical records remain intact as you expand.',
  },
];

export default async function HomePage() {
  const session = await getSession();
  const accountHref = session ? '/dashboard' : '/login';

  return (
    <main className="landing-page">
      <LandingMotion />
      <LandingNav accountHref={accountHref} sessionLabel={session ? 'Open dashboard' : 'Sign in'} />

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-hero" data-hero>
        <div className="landing-orb landing-orb-one" />
        <div className="landing-orb landing-orb-two" />
        <div className="landing-orb landing-orb-three" />
        <div className="landing-orb landing-orb-four" />
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">
              <span className="landing-eyebrow-dot" />
              Multi-company society management
            </div>
            <h1 className="landing-headline">
              Every society.<br />
              <span className="landing-headline-accent">One calm workspace.</span>
            </h1>
            <span className="landing-headline-rule" aria-hidden="true" />
            <p className="landing-lead">
              Manage properties, residents, billing, payments and daily operations across every company you
              serve — with the security and audit trail modern housing teams expect.
            </p>
            <div className="landing-hero-actions">
              <Link href={accountHref} className="landing-button landing-button-primary landing-button-lg">
                {session ? 'Go to dashboard' : 'Access your workspace'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="landing-button landing-button-secondary landing-button-lg">
                Explore the platform
              </a>
            </div>
            <div className="landing-trust-points">
              <span><Check className="h-4 w-4" /> Company-level isolation</span>
              <span><Check className="h-4 w-4" /> Role-based access</span>
              <span><Check className="h-4 w-4" /> Immutable audit trail</span>
            </div>
            <div className="landing-hero-stats">
              <div>
                <strong><span data-count="21">21</span></strong>
                <span>Business modules</span>
              </div>
              <div>
                <strong><span data-count="100">100</span>%</strong>
                <span>Tenant isolation</span>
              </div>
              <div>
                <strong><span data-count="24">24</span>/7</strong>
                <span>Audit coverage</span>
              </div>
            </div>
          </div>

          <div className="landing-product" data-product aria-label="Product dashboard preview">
            <div className="landing-product-glow" />
            <div className="landing-browser">
              <div className="landing-browser-top">
                <div><span /><span /><span /></div>
                <div className="landing-browser-address">
                  <LockKeyhole className="h-3 w-3" />
                  society management / dashboard
                </div>
              </div>
              <div className="landing-app-preview">
                <aside>
                  <BrandMark className="preview-logo" />
                  <div className="preview-nav preview-nav-active" />
                  <div className="preview-nav" /><div className="preview-nav" /><div className="preview-nav" />
                  <div className="preview-nav" /><div className="preview-nav" />
                </aside>
                <div className="preview-main">
                  <div className="preview-heading">
                    <div>
                      <div className="preview-kicker">SAMPLE WORKSPACE</div>
                      <div className="preview-title">Company overview</div>
                    </div>
                    <div className="preview-avatar" />
                  </div>
                  <div className="preview-metrics">
                    <div><span>Societies</span><strong>08</strong><small>+2 this year</small></div>
                    <div><span>Residents</span><strong>1,248</strong><small>94% active</small></div>
                    <div><span>Collection</span><strong>₹8.4L</strong><small>Current month</small></div>
                  </div>
                  <div className="preview-panels">
                    <div className="preview-chart">
                      <div className="preview-panel-title">Monthly collection</div>
                      <div className="preview-bars">
                        {[42, 58, 48, 72, 64, 82, 74, 92].map((height, index) => (
                          <span
                            key={index}
                            style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="preview-activity">
                      <div className="preview-panel-title">Recent activity</div>
                      {[1, 2, 3].map((item) => (
                        <div className="preview-activity-row" key={item}><span /><div><b /><small /></div></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-floating-card">
              <span className="landing-floating-icon"><Bell className="h-4 w-4" /></span>
              <div>
                <strong>Visitor approved</strong>
                <small>Gate entry · Oasis Venetia Heights</small>
              </div>
              <span className="landing-floating-dot" />
            </div>

            <div className="landing-floating-card landing-floating-card-two">
              <span className="landing-floating-icon landing-floating-icon-emerald"><Wallet className="h-4 w-4" /></span>
              <div>
                <strong>Payment reconciled</strong>
                <small>₹18,500 · Maintenance dues</small>
              </div>
              <span className="landing-floating-dot" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Proof strip                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-proof reveal">
        <div className="landing-container landing-proof-inner">
          <span>Everything a housing team needs, in one connected workspace</span>
          <div className="landing-proof-items">
            <span><Building2 className="h-4 w-4" /> Multi-company</span>
            <span><Users className="h-4 w-4" /> Resident-first</span>
            <span><BarChart3 className="h-4 w-4" /> Finance-ready</span>
            <span><LockKeyhole className="h-4 w-4" /> Audit-ready</span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Colour rail                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-marquee" aria-hidden="true">
        <div className="landing-marquee-track">
          {[...MARQUEE, ...MARQUEE].map((item, index) => (
            <span className={`landing-marquee-pill ${item.tone}`} key={`${item.label}-${index}`}>
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </span>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">Built for everyday operations</p>
              <h2>Everything your community team needs</h2>
            </div>
            <p>Replace disconnected spreadsheets and scattered updates with one dependable operating system.</p>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <article className={`landing-feature reveal ${feature.accent}`} key={feature.title}>
                <div className="landing-feature-icon"><feature.icon className="h-6 w-6" /></div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
                <a href="#modules" className="landing-feature-link">
                  Explore module <ArrowUpRight className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Roles                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section id="roles" className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">Made for every seat at the table</p>
              <h2>One workspace. Three points of view.</h2>
            </div>
            <p>Each team sees exactly what it needs — nothing more, nothing less — with shared records underneath.</p>
          </div>
          <div className="landing-personas">
            {ROLES.map((role) => (
              <article className={`landing-persona reveal ${role.accent}`} key={role.title}>
                <div className="landing-persona-icon"><role.icon className="h-5 w-5" /></div>
                <h3>{role.title}</h3>
                <p>{role.text}</p>
                <div className="landing-persona-tags">
                  {role.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Modules                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section id="modules" className="landing-section">
        <div className="landing-container landing-module-grid">
          <div className="reveal">
            <p className="landing-kicker">Modular by design</p>
            <h2>21 modules. Only the ones you need.</h2>
            <p className="landing-module-lead">
              Turn on only the tools relevant to each customer while preserving historical records and
              company-wide isolation. Dependencies are validated for you.
            </p>
            <div className="landing-module-note">
              <Sparkles className="h-4 w-4" /> Deny-by-default entitlements keep every workspace secure.
            </div>
            <div className="landing-module-note landing-module-note-quiet">
              <Layers3 className="h-4 w-4" /> Add capabilities as your teams grow — no re-platforming.
            </div>
          </div>
          <div className="landing-module-list reveal">
            {MODULES.map((module) => (
              <div key={module.label}>
                <span className="landing-module-icon"><module.icon className="h-4 w-4" /></span>
                <span>{module.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Workflow                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section id="workflow" className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">How it works</p>
              <h2>From setup to daily use in three steps</h2>
            </div>
            <p>A clear path to getting your housing operations online without the usual complexity.</p>
          </div>
          <div className="landing-steps">
            {STEPS.map((step, index) => (
              <article className={`landing-step reveal ${step.accent}`} key={step.title}>
                <div className="landing-step-top">
                  <span className="landing-step-number">0{index + 1}</span>
                  <span className="landing-step-icon"><step.icon className="h-5 w-5" /></span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {index < 2 ? <ChevronRight className="landing-step-arrow" aria-hidden="true" /> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Security                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section id="security" className="landing-section landing-security-section">
        <div className="landing-container">
          <div className="landing-security reveal">
            <div className="landing-security-icon"><ShieldCheck className="h-9 w-9" /></div>
            <div>
              <p className="landing-kicker">Security at every boundary</p>
              <h2>Designed for controlled access.</h2>
            </div>
            <p>
              Opaque sessions, CSRF protection, server-derived tenant context, role permissions and immutable
              audit events work together to keep operations accountable.
            </p>
            <div className="landing-security-badges">
              <span><LockKeyhole className="h-4 w-4" /> CSRF protected</span>
              <span><Zap className="h-4 w-4" /> Session rotation</span>
              <span><Plug className="h-4 w-4" /> Server-derived context</span>
              <span><FileText className="h-4 w-4" /> Append-only audit</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section id="faq" className="landing-section">
        <div className="landing-container landing-faq-grid">
          <div className="landing-faq-intro reveal">
            <p className="landing-kicker">Good to know</p>
            <h2>Questions, answered.</h2>
            <p>Everything you need to understand how the platform keeps each company separate, secure and ready to grow.</p>
            <Link href="/register" className="landing-button landing-button-primary" style={{ marginTop: 24 }}>
              Start with your company <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="landing-faq-list reveal">
            {FAQS.map((faq) => (
              <details className="landing-faq-item" key={faq.question}>
                <summary className="landing-faq-question">
                  {faq.question}
                  <ChevronDown className="landing-faq-chevron h-4 w-4" />
                </summary>
                <p className="landing-faq-answer">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CTA                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="landing-cta">
        <div className="landing-container landing-cta-inner reveal">
          <div>
            <p className="landing-cta-kicker">Ready when you are</p>
            <h2>Bring your societies into one clear workspace.</h2>
            <p>Start with a company, enable the modules you need, and give your team a better way to work.</p>
          </div>
          <div className="landing-cta-actions">
            <Link href="/register" className="landing-button landing-button-light landing-button-lg">
              Register your company <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={accountHref} className="landing-button landing-button-ghost landing-button-lg">
              {session ? 'Open dashboard' : 'Sign in'}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div className="landing-footer-brand reveal">
              <HomeLink />
              <p>Secure community operations, in one place. Built for multi-company housing teams.</p>
              <div className="landing-footer-badges">
                <span><ShieldCheck className="h-3.5 w-3.5" /> Tenant isolated</span>
                <span><Briefcase className="h-3.5 w-3.5" /> Multi-company</span>
              </div>
            </div>
            <div className="landing-footer-links">
              <div>
                <strong>Platform</strong>
                <a href="#features">Features</a>
                <a href="#roles">For teams</a>
                <a href="#modules">Modules</a>
                <a href="#workflow">How it works</a>
              </div>
              <div>
                <strong>Security</strong>
                <a href="#security">Access control</a>
                <a href="#security">Audit trail</a>
                <a href="#security">Tenant isolation</a>
                <a href="#faq">Common questions</a>
              </div>
              <div>
                <strong>Account</strong>
                <Link href="/register">Register company</Link>
                <Link href="/login">Company sign in</Link>
                <Link href="/admin/login">Platform sign in</Link>
                <a href="#faq">FAQs</a>
              </div>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} Society Management. All rights reserved.</span>
            <span>Built for modern housing teams.</span>
          </div>
        </div>
      </footer>
      <ScrollReveal />
    </main>
  );
}
