import Link from 'next/link';

export const dynamic = 'force-dynamic'; // nonce-based CSP needs per-request rendering
import { ArrowRight, ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <main className="auth-simple">
      <div className="auth-simple-card">
        <span className="auth-simple-icon auth-simple-icon-danger"><ShieldAlert className="h-6 w-6" /></span>
        <p className="auth-eyebrow">Restricted area</p>
        <h1>Access denied</h1>
        <p>
          You do not have permission to view this page or perform this action. Ask your company
          administrator if you believe this is a mistake.
        </p>
        <div className="auth-simple-actions">
          <Link href="/dashboard" className="landing-button landing-button-primary">
            Return to dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/" className="landing-button landing-button-secondary">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
