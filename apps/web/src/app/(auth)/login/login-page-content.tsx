import type { LoginIntent } from '@society/validation';
import {
  AuthFooterLinks,
  AuthShell,
  COMPANY_HIGHLIGHTS,
  PLATFORM_HIGHLIGHTS,
} from '@/components/auth-shell';
import { LoginForm } from './login-form';

const portalCopy: Record<
  LoginIntent,
  {
    title: string;
    subtitle: string;
    eyebrow: string;
    badge: string;
    headline: string;
    accent: string;
    lead: string;
    cardEyebrow: string;
    cardTitle: string;
  }
> = {
  COMPANY: {
    title: 'Welcome back',
    subtitle: 'Sign in to pick up where your team left off.',
    eyebrow: 'Company access',
    badge: 'Community operations',
    headline: 'Every society,',
    accent: 'one calm workspace.',
    lead:
      'Properties, residents, billing and daily operations — together in a workspace built for multi-company housing teams.',
    cardEyebrow: 'Secure sign in',
    cardTitle: 'Company workspace access',
  },
  PLATFORM: {
    title: 'Platform sign in',
    subtitle: 'Restricted access for platform administrators.',
    eyebrow: 'Restricted portal',
    badge: 'Platform administration',
    headline: 'One console,',
    accent: 'every company.',
    lead:
      'Manage tenants, module entitlements and platform access with a complete, permission-gated audit trail.',
    cardEyebrow: 'Administrator sign in',
    cardTitle: 'Platform administration access',
  },
};

export function LoginPageContent({ loginIntent }: { loginIntent: LoginIntent }) {
  const copy = portalCopy[loginIntent];
  const otherPortal =
    loginIntent === 'PLATFORM'
      ? { href: '/login', label: 'Sign in as a company user' }
      : { href: '/admin/login', label: 'Super Admin sign in' };

  return (
    <AuthShell
      badge={copy.badge}
      headline={copy.headline}
      accent={copy.accent}
      lead={copy.lead}
      highlights={loginIntent === 'PLATFORM' ? PLATFORM_HIGHLIGHTS : COMPANY_HIGHLIGHTS}
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={copy.subtitle}
      asideNote={
        loginIntent === 'PLATFORM'
          ? 'Platform administration is limited to authorized Super Admins. Every attempt is audited.'
          : 'Access is restricted to authorized users. All sign-in attempts are audited.'
      }
      footer={
        <p>
          Protected by tenant isolation, role-based permissions and an append-only audit trail.
        </p>
      }
    >
      <div className="auth-card-header">
        <p className="auth-card-eyebrow">{copy.cardEyebrow}</p>
        <p className="auth-card-title">{copy.cardTitle}</p>
      </div>

      <LoginForm loginIntent={loginIntent} />

      <div className="auth-divider">or</div>

      <AuthFooterLinks
        primary={{
          href: otherPortal.href,
          label: otherPortal.label,
        }}
        secondary={
          loginIntent === 'COMPANY'
            ? { href: '/register', label: 'Register a new company' }
            : undefined
        }
        hint={loginIntent === 'COMPANY' ? 'New here? Set up a workspace in a few minutes.' : 'Need help? Contact your platform owner.'}
      />
    </AuthShell>
  );
}
