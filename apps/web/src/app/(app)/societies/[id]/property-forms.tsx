'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createBuildingSchema, createFlatSchema, createFloorSchema } from '@society/validation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { csrfToken } from '@/lib/client/csrf';

type Message = { tone: 'error' | 'success'; text: string };
type SetMessage = (message: Message | null) => void;

async function postEntity(
  endpoint: string,
  body: Record<string, unknown>,
  setMessage: SetMessage,
  reset: () => void,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  setMessage(null);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: { message?: string } };
      setMessage({ tone: 'error', text: payload.error?.message ?? 'Unable to save record' });
      return;
    }
    setMessage({ tone: 'success', text: 'Saved.' });
    reset();
    router.refresh();
  } catch {
    setMessage({ tone: 'error', text: 'Network error. Please try again.' });
  }
}

function Feedback({ message }: { message: Message | null }) {
  return message ? <Alert tone={message.tone}>{message.text}</Alert> : null;
}

export function BuildingForm({ societyId }: { societyId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<
    z.input<typeof createBuildingSchema>,
    unknown,
    z.infer<typeof createBuildingSchema>
  >({
    resolver: zodResolver(createBuildingSchema),
    defaultValues: { name: '', code: '', floorCount: 0 },
  });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        postEntity(`/api/v1/societies/${societyId}/buildings`, values, setMessage, reset, router)
      )}
      className="grid gap-3 sm:grid-cols-3"
      noValidate
    >
      <Feedback message={message} />
      <div className="space-y-1">
        <Label htmlFor="building-name">Building name</Label>
        <Input id="building-name" {...register('name')} />
        {formState.errors.name ? <p className="text-xs text-red-700">{formState.errors.name.message}</p> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="building-code">Code</Label>
        <Input id="building-code" {...register('code')} />
        {formState.errors.code ? <p className="text-xs text-red-700">{formState.errors.code.message}</p> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="building-floors">Floor count</Label>
        <Input id="building-floors" type="number" min={0} {...register('floorCount', { valueAsNumber: true })} />
      </div>
      <div className="sm:col-span-3"><Button type="submit" disabled={formState.isSubmitting}>Add building</Button></div>
    </form>
  );
}

export function FloorForm({ societyId, buildingId }: { societyId: string; buildingId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<
    z.input<typeof createFloorSchema>,
    unknown,
    z.infer<typeof createFloorSchema>
  >({
    resolver: zodResolver(createFloorSchema),
    defaultValues: { buildingId, name: '', floorNumber: 0 },
  });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        postEntity(
          `/api/v1/buildings/${buildingId}/floors`,
          { ...values, societyId },
          setMessage,
          reset,
          router,
        )
      )}
      className="grid gap-3 sm:grid-cols-3"
      noValidate
    >
      <Feedback message={message} />
      <div className="space-y-1">
        <Label htmlFor={`floor-name-${buildingId}`}>Floor name</Label>
        <Input id={`floor-name-${buildingId}`} {...register('name')} />
        {formState.errors.name ? <p className="text-xs text-red-700">{formState.errors.name.message}</p> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`floor-number-${buildingId}`}>Floor number</Label>
        <Input id={`floor-number-${buildingId}`} type="number" {...register('floorNumber', { valueAsNumber: true })} />
        {formState.errors.floorNumber ? <p className="text-xs text-red-700">{formState.errors.floorNumber.message}</p> : null}
      </div>
      <div className="sm:col-span-3"><Button type="submit" disabled={formState.isSubmitting}>Add floor</Button></div>
    </form>
  );
}

export function FlatForm({ societyId, buildingId, floorId }: { societyId: string; buildingId: string; floorId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<
    z.input<typeof createFlatSchema>,
    unknown,
    z.infer<typeof createFlatSchema>
  >({
    resolver: zodResolver(createFlatSchema),
    defaultValues: { buildingId, floorId, number: '' },
  });

  return (
    <form
      onSubmit={handleSubmit((values) =>
        postEntity(
          `/api/v1/floors/${floorId}/flats`,
          { ...values, societyId },
          setMessage,
          reset,
          router,
        )
      )}
      className="grid gap-3 sm:grid-cols-3"
      noValidate
    >
      <Feedback message={message} />
      <div className="space-y-1">
        <Label htmlFor={`flat-number-${floorId}`}>Flat number</Label>
        <Input id={`flat-number-${floorId}`} {...register('number')} />
        {formState.errors.number ? <p className="text-xs text-red-700">{formState.errors.number.message}</p> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`flat-area-${floorId}`}>Area (sq. m.)</Label>
        <Input
          id={`flat-area-${floorId}`}
          type="number"
          step="0.001"
          {...register('areaSqMt', {
            setValueAs: (value) => (value === '' || value === undefined ? undefined : Number(value)),
          })}
        />
      </div>
      <div className="sm:col-span-3"><Button type="submit" disabled={formState.isSubmitting}>Add flat</Button></div>
    </form>
  );
}
