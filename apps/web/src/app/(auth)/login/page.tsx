import type { Metadata } from 'next';
export const dynamic = 'force-dynamic'; // nonce-based CSP needs per-request rendering
import { LoginPageContent } from './login-page-content';

export const metadata: Metadata = { title: 'Company sign in | Society Management' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const params = await searchParams;
  return <LoginPageContent loginIntent="COMPANY" expired={params.expired === '1'} />;
}
