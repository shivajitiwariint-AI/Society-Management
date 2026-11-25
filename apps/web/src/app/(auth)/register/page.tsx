import type { Metadata } from 'next';
import { AuthFooterLinks, AuthShell, REGISTER_HIGHLIGHTS } from '@/components/auth-shell';
import { RegistrationForm } from './registration-form';

export const dynamic = 'force-dynamic'; // nonce-based CSP needs per-request rendering
export const metadata: Metadata = { title: 'Register company | Society Management' };

export default function RegisterPage() {
  return (
    <AuthShell
      wide
      badge="Get started in minutes"
      headline="Set up your company"
      accent="workspace."
      lead="Create a dedicated tenant for your housing business, then add societies, enable modules and invite your team."
      highlights={REGISTER_HIGHLIGHTS}
      eyebrow="New company"
      title="Register your company"
      subtitle="Create a tenant workspace and its first administrator. You can invite the rest of your team afterwards."
      asideNote="Company data is isolated per tenant. Registration creates the first administrator with full company setup access."
      footer={
        <p>
          By registering you agree to keep company data accurate and access limited to authorized team members.
        </p>
      }
    >
      <div className="auth-card-header">
        <p className="auth-card-eyebrow">Company details</p>
        <p className="auth-card-title">Tell us about your workspace</p>
      </div>

      <RegistrationForm />

      <div className="auth-divider">already have a workspace?</div>

      <AuthFooterLinks
        primary={{ href: '/login', label: 'Sign in to your company' }}
        hint="Platform administrators can use the Super Admin portal."
      />
    </AuthShell>
  );
}
