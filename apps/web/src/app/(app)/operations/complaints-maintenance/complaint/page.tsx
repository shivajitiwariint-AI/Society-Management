import { OperationSection } from '../../operation-section';

export default async function ComplaintPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="complaints-maintenance" resourceKey="complaint" searchParams={searchParams} />;
}
