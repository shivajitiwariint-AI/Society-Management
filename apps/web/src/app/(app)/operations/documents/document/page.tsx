import { OperationSection } from '../../operation-section';

export default async function DocumentPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="documents" resourceKey="document" searchParams={searchParams} />;
}
