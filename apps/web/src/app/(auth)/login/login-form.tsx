'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput, type LoginIntent } from '@society/validation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm({ loginIntent }: { loginIntent: LoginIntent }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/csrf')
      .then((response) => response.json() as Promise<{ csrfToken: string }>)
      .then((data) => { if (active) setCsrfToken(data.csrfToken); })
      .catch(() => { if (active) setServerError('Unable to initialize the secure sign-in form.'); });
    return () => { active = false; };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ ...values, loginIntent }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setServerError(body.error?.message ?? 'Sign in failed.');
        return;
      }
      router.push(loginIntent === 'PLATFORM' ? '/companies' : '/dashboard');
      router.refresh();
    } catch {
      setServerError('Network error. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError ? <Alert>{serverError}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" autoComplete="username" aria-invalid={!!errors.email} {...register('email')} />
        {errors.email ? <p className="text-xs text-red-700">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
        {errors.password ? <p className="text-xs text-red-700">{errors.password.message}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting || !csrfToken}>
        {isSubmitting ? 'Signing in…' : loginIntent === 'PLATFORM' ? 'Sign in to platform' : 'Sign in to company'}
      </Button>
    </form>
  );
}
