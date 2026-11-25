import * as React from 'react';
import Link from 'next/link';
import { HomeLink } from '@/components/home-link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileText as FileTextIcon,
  Layers as LayersIcon,
  ShieldCheck as ShieldIcon,
  UserRound as UserIcon,
  type LucideIcon,
} from 'lucide-react';

export interface AuthHighlight {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface AuthShellProps {
  badge: string;
  headline: string;
  accent: string;
  lead: string;
  highlights: readonly AuthHighlight[];
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  asideNote?: string;
}

/**
 * Shared split-screen shell for every authentication screen.
 * Purely presentational — forms keep their own behaviour.
 */
export function AuthShell({
  badge,
  headline,
  accent,
  lead,
  highlights,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  asideNote = 'Access is restricted to authorized users. All sign-in attempts are audited.',
}: AuthShellProps) {
  return (
    <div className="auth-page">
      <aside className="auth-aside" aria-hidden="true">
        <div className="auth-aside-brand">
          <HomeLink className="auth-aside-home" />
          <div>
            <span className="auth-aside-badge">{badge}</span>
            <h2>
              {headline} <span>{accent}</span>
            </h2>
            <p className="auth-aside-lead">{lead}</p>
          </div>
          <div className="auth-features">
            {highlights.map((highlight) => (
              <div className="auth-feature" key={highlight.title}>
                <span className="auth-feature-icon">
                  <highlight.icon className="h-4 w-4" />
                </span>
                <div>
                  <strong>{highlight.title}</strong>
                  <span>{highlight.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-aside-card">
          <div className="auth-aside-card-top">
            <span className="auth-aside-card-title">Workspace readiness</span>
            <span className="auth-aside-card-tag">Live</span>
          </div>
          <div className="auth-aside-bars">
            {[38, 54, 46, 68, 60, 78, 70, 90].map((height, index) => (
              <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }} />
            ))}
          </div>
        </div>

        <p className="auth-aside-footer">{asideNote}</p>
      </aside>

      <main className="auth-main">
        <div className={`auth-panel${wide ? ' auth-panel-wide' : ''}`}>
          <div className="auth-mobile-brand">
            <HomeLink className="brand-lockup" />
          </div>

          <div className="auth-header">
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          <div className="auth-card">{children}</div>

          {footer ? <div className="auth-footnote">{footer}</div> : null}

          <div className="auth-back">
            <Link href="/" className="auth-back-link">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

interface AuthFooterLinksProps {
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  hint?: string;
}

export function AuthFooterLinks({ primary, secondary, hint }: AuthFooterLinksProps) {
  return (
    <div className="auth-links">
      <Link className="auth-link" href={primary.href}>
        {primary.label} <ArrowRight className="inline h-3.5 w-3.5 align-[-2px]" />
      </Link>
      {secondary ? (
        <Link className="auth-link-muted" href={secondary.href}>
          {secondary.label}
        </Link>
      ) : null}
      {hint ? <span className="auth-hint">{hint}</span> : null}
    </div>
  );
}

export const COMPANY_HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    icon: Building2,
    title: 'Tenant-isolated by design',
    text: 'Every request resolves against one company workspace.',
  },
  {
    icon: ShieldIcon,
    title: 'Hardened sessions',
    text: 'CSRF protection, secure cookies and rotation.',
  },
  {
    icon: FileTextIcon,
    title: 'Complete audit trail',
    text: 'Sensitive actions are recorded, never overwritten.',
  },
];

export const PLATFORM_HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    icon: Building2,
    title: 'Multi-company control',
    text: 'One console for every tenant on the platform.',
  },
  {
    icon: LayersIcon,
    title: 'Module entitlements',
    text: 'Enable capabilities and dependencies per company.',
  },
  {
    icon: ShieldIcon,
    title: 'Platform-wide audit',
    text: 'Administrative actions stay fully accountable.',
  },
];

export const REGISTER_HIGHLIGHTS: readonly AuthHighlight[] = [
  {
    icon: Building2,
    title: 'Your own workspace',
    text: 'A dedicated company tenant with isolated data.',
  },
  {
    icon: LayersIcon,
    title: 'Start with what you need',
    text: 'Enable modules as your team finds its rhythm.',
  },
  {
    icon: UserIcon,
    title: 'First admin included',
    text: 'Create the company and its administrator together.',
  },
];
