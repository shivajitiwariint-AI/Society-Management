import { OperationSection } from '../../operation-section';

export default async function AmenityPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="amenities-bookings" resourceKey="amenity" searchParams={searchParams} />;
}
