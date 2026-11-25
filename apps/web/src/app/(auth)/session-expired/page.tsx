import Link from 'next/link';

export const dynamic = 'force-dynamic'; // nonce-based CSP needs per-request rendering
import { ArrowRight, Clock3 } from 'lucide-react';

export default function SessionExpiredPage() {
  return (
    <main className="auth-simple">
      <div className="auth-simple-card">
        <span className="auth-simple-icon"><Clock3 className="h-6 w-6" /></span>
        <p className="auth-eyebrow">Security timeout</p>
        <h1>Session expired</h1>
        <p>Your secure session has ended. Sign in again to continue where you left off.</p>
        <div className="auth-simple-actions">
          <Link href="/login" className="landing-button landing-button-primary">
            Sign in again <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/" className="landing-button landing-button-secondary">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
