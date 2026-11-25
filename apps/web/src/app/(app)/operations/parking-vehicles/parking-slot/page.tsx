import { OperationSection } from '../../operation-section';

export default async function ParkingSlotPage({ searchParams }: { searchParams: Promise<{ societyId?: string | string[] }> }) {
  return <OperationSection moduleKey="parking-vehicles" resourceKey="parking-slot" searchParams={searchParams} />;
}
