import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, MapPinned } from 'lucide-react';
import { authorize } from '@society/authorization';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { getRequestContext } from '@/lib/auth/session';
import { CreateSocietyForm } from '../create-society-form';

export default async function CreateSocietyPage() {
  const context = await getRequestContext('create-society-page');
  if (!context) redirect('/login');

  const canCreate = authorize(context, {
    moduleKey: 'company', resourceKey: 'society', action: 'CREATE',
  }).ok;

  if (!canCreate) {
    return (
      <Alert>
        You do not have permission to register a society for this company.
      </Alert>
    );
  }
  if (!context.activeCompanyId) {
    return (
      <Alert>
        Select an active company workspace before registering a society.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Property foundation"
        title="Register a society"
        description="Add a society to the active company, then set up its buildings, floors and flats."
        icon={MapPinned}
        actions={
          <Link href="/societies" className="btn btn-ghost flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to societies
          </Link>
        }
      />
      <Card>
        <CardHeader><CardTitle>Society details</CardTitle></CardHeader>
        <CardContent>
          <CreateSocietyForm companyId={context.activeCompanyId} />
        </CardContent>
      </Card>
    </div>
  );
}
