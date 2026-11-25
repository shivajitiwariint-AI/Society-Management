import { OperationSection } from '../../operation-section';

export default async function VisitorPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="visitors" resourceKey="visitor" searchParams={searchParams} />;
}
