import { apiSuccess } from '@/lib/api/response';
import { issueAnonymousCsrf } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET() {
  const csrfToken = await issueAnonymousCsrf();
  return apiSuccess({ csrfToken });
}
