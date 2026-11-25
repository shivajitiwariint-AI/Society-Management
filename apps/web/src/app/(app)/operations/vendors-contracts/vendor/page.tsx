import { OperationSection } from '../../operation-section';

export default async function VendorPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="vendors-contracts" resourceKey="vendor" searchParams={searchParams} />;
}
