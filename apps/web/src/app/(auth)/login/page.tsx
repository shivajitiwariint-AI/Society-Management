import type { Metadata } from 'next';
export const dynamic = 'force-dynamic'; // nonce-based CSP needs per-request rendering
import { LoginPageContent } from './login-page-content';

export const metadata: Metadata = { title: 'Company sign in | Society Management' };

export default function LoginPage() {
  return <LoginPageContent loginIntent="COMPANY" />;
}
