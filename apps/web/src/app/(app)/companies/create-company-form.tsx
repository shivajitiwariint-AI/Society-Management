'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createCompanySchema } from '@society/validation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formSchema = createCompanySchema.extend({ reason: z.string().trim().min(5, 'A change reason is required') });
type FormValues = z.infer<typeof formSchema>;

function csrfToken(): string {
  return document.cookie.split('; ').find((entry) => entry.startsWith('society_csrf='))?.split('=')[1] ?? '';
}

export function CreateCompanyForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof formSchema>, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', code: '', countryCode: 'IN', currencyCode: 'INR', timezone: 'Asia/Kolkata', reason: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const response = await fetch('/api/v1/companies', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken() },
      body: JSON.stringify(values),
    });
    const body = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      setMessage({ tone: 'error', text: body.error?.message ?? 'Unable to create company' });
      return;
    }
    setMessage({ tone: 'success', text: 'Company created with deny-by-default business modules.' });
    reset();
    onSuccess?.();
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {message ? <div className="sm:col-span-2"><Alert tone={message.tone}>{message.text}</Alert></div> : null}
      <div className="space-y-2">
        <Label htmlFor="company-name">Company name</Label>
        <Input id="company-name" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name ? <p className="text-xs text-red-700">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="company-code">Code (lowercase, hyphens)</Label>
        <Input id="company-code" {...register('code')} aria-invalid={!!errors.code} />
        {errors.code ? <p className="text-xs text-red-700">{errors.code.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="company-currency">Currency</Label>
        <Input id="company-currency" maxLength={3} {...register('currencyCode')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company-timezone">Timezone</Label>
        <Input id="company-timezone" {...register('timezone')} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="company-reason">Reason for audit log</Label>
        <Input id="company-reason" {...register('reason')} aria-invalid={!!errors.reason} />
        {errors.reason ? <p className="text-xs text-red-700">{errors.reason.message}</p> : null}
      </div>
      <div className="sm:col-span-2"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create company'}</Button></div>
    </form>
  );
}
