/** Reads the double-submit CSRF cookie for browser fetch calls. */
export function csrfToken(): string {
  if (typeof document === 'undefined') return '';
  return document.cookie.split('; ').find((entry) => entry.startsWith('society_csrf='))?.split('=')[1] ?? '';
}
