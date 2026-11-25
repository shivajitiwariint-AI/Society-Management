import type { Metadata } from 'next';
import { LoginPageContent } from '../../login/login-page-content';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Super Admin sign in | Society Management' };

export default function PlatformAdminLoginPage() {
  return <LoginPageContent loginIntent="PLATFORM" />;
}
