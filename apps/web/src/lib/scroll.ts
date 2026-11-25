/** Animates the window to an absolute Y position with an ease-out curve. */
export function animateScrollTo(targetY: number, onDone?: () => void): void {
  const start = window.scrollY;
  const distance = targetY - start;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || Math.abs(distance) < 2) {
    window.scrollTo({ top: targetY, behavior: 'instant' });
    onDone?.();
    return;
  }

  const duration = 780;
  const startTime = performance.now();

  function frame(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    // 'instant' avoids the browser's native smooth scroll restarting each frame.
    window.scrollTo({ top: start + distance * eased, behavior: 'instant' });
    if (progress < 1) requestAnimationFrame(frame);
    else onDone?.();
  }

  requestAnimationFrame(frame);
}
