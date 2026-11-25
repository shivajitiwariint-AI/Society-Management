import { cn } from '@/lib/utils';

/**
 * The Society Management logo mark: an abstract home with a community arch.
 * Rendered on a colourful gradient tile provided by the `brand-mark` styles.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('brand-mark', className)} aria-hidden="true">
      <svg className="brand-mark-glyph" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4.4 11.6 12 5.3l7.6 6.3v8.1"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        <path
          d="M9.1 19.7v-4.9a2.9 2.9 0 0 1 5.8 0v4.9"
          fill="currentColor"
          opacity="0.92"
        />
        <circle cx="12" cy="10.2" r="1.15" fill="currentColor" />
        <path
          d="M3 19.7h18"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}

/**
 * Wordmark used next to the logo mark. The second word carries the brand
 * gradient so the lockup feels colourful without extra decoration.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('brand-wordmark', className)}>
      Society
      <span className="brand-wordmark-accent">Management</span>
    </span>
  );
}
