'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { companyRegistrationSchema, type CompanyRegistrationFormInput } from '@society/validation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegistrationForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyRegistrationFormInput>({
    resolver: zodResolver(companyRegistrationSchema),
    defaultValues: {
      name: '',
      code: '',
      countryCode: 'IN',
      currencyCode: 'INR',
      timezone: 'Asia/Kolkata',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    },
  });

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/csrf')
      .then((response) => response.json() as Promise<{ csrfToken: string }>)
      .then((data) => { if (active) setCsrfToken(data.csrfToken); })
      .catch(() => { if (active) setServerError('Unable to initialize the secure registration form.'); });
    return () => { active = false; };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          ...values,
          countryCode: (values.countryCode ?? 'IN').toUpperCase(),
          currencyCode: (values.currencyCode ?? 'INR').toUpperCase(),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setServerError(body.error?.message ?? 'Registration failed.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setServerError('Network error. Please try again.');
    }
  });

  const errorFor = (name: keyof CompanyRegistrationFormInput) =>
    errors[name] ? <p className="text-xs text-red-700">{errors[name]?.message}</p> : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError ? <Alert>{serverError}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Company name</Label>
          <Input id="name" autoComplete="organization" aria-invalid={!!errors.name} {...register('name')} />
          {errorFor('name')}
        </div>
        <div>
          <Label htmlFor="code">Company code</Label>
          <Input id="code" placeholder="my-society" aria-invalid={!!errors.code} {...register('code')} />
          {errorFor('code')}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="countryCode">Country</Label>
          <Input id="countryCode" maxLength={2} aria-invalid={!!errors.countryCode} {...register('countryCode')} />
          {errorFor('countryCode')}
        </div>
        <div>
          <Label htmlFor="currencyCode">Currency</Label>
          <Input id="currencyCode" maxLength={3} aria-invalid={!!errors.currencyCode} {...register('currencyCode')} />
          {errorFor('currencyCode')}
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" aria-invalid={!!errors.timezone} {...register('timezone')} />
          {errorFor('timezone')}
        </div>
      </div>
      <div className="border-t border-ink-100 pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">First company administrator</p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="adminName">Administrator name</Label>
            <Input id="adminName" autoComplete="name" aria-invalid={!!errors.adminName} {...register('adminName')} />
            {errorFor('adminName')}
          </div>
          <div>
            <Label htmlFor="adminEmail">Administrator email</Label>
            <Input id="adminEmail" type="email" autoComplete="username" aria-invalid={!!errors.adminEmail} {...register('adminEmail')} />
            {errorFor('adminEmail')}
          </div>
          <div>
            <Label htmlFor="adminPassword">Administrator password</Label>
            <Input id="adminPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.adminPassword} {...register('adminPassword')} />
            <p className="mt-1 text-xs text-ink-500">Minimum 8 characters.</p>
            {errorFor('adminPassword')}
          </div>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting || !csrfToken}>
        {isSubmitting ? 'Creating workspace…' : 'Register company'}
      </Button>
      <p className="text-xs text-ink-500">
        Your company starts with core modules only. Business modules are enabled by platform administration.
      </p>
    </form>
  );
}
