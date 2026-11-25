'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createSocietySchema } from '@society/validation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { csrfToken } from '@/lib/client/csrf';

export function CreateSocietyForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createSocietySchema),
    defaultValues: { name: '', registrationNumber: '', city: '', countryCode: 'IN', timezone: 'Asia/Kolkata' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      const response = await fetch(`/api/v1/companies/${companyId}/societies`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setMessage({ tone: 'error', text: body.error?.message ?? 'Unable to create society' });
        return;
      }
      setMessage({ tone: 'success', text: 'Society created.' });
      reset();
      router.push('/societies');
      router.refresh();
    } catch {
      setMessage({ tone: 'error', text: 'Network error. Please try again.' });
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      {message ? <div className="sm:col-span-2"><Alert tone={message.tone}>{message.text}</Alert></div> : null}
      <div className="space-y-2">
        <Label htmlFor="society-name">Society name</Label>
        <Input id="society-name" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name ? <p className="text-xs text-red-700">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="society-registration">Registration number</Label>
        <Input id="society-registration" {...register('registrationNumber')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="society-city">City</Label>
        <Input id="society-city" {...register('city')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="society-country">Country code</Label>
        <Input id="society-country" maxLength={2} {...register('countryCode')} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="society-timezone">Timezone</Label>
        <Input id="society-timezone" {...register('timezone')} />
      </div>
      <div className="sm:col-span-2"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create society'}</Button></div>
    </form>
  );
}
