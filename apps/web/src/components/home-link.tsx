'use client';

import * as React from 'react';
import Link from 'next/link';
import { BrandMark, BrandWordmark } from '@/components/brand-logo';
import { animateScrollTo } from '@/lib/scroll';

/** Brand link that scrolls smoothly to the top when already on the home page. */
export function HomeLink({ className = 'brand-lockup' }: { className?: string }) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.location.pathname !== '/') return;
    event.preventDefault();
    animateScrollTo(0);
  }

  return (
    <Link href="/" className={className} aria-label="Society Management home" onClick={handleClick}>
      <BrandMark />
      <BrandWordmark />
    </Link>
  );
}
