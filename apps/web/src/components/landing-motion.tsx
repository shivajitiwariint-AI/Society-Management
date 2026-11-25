'use client';

import * as React from 'react';

/**
 * Landing page motion layer:
 * - reading progress bar
 * - animated hero counters
 * - subtle pointer parallax on the product preview
 * Everything degrades gracefully and respects reduced motion.
 */
export function LandingMotion() {
  const progressRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Reading progress -------------------------------------------------- */
    let frame = 0;
    const updateProgress = () => {
      frame = 0;
      const element = progressRef.current;
      if (!element) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      element.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    /* Animated counters ------------------------------------------------- */
    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));
    const animations: number[] = [];
    let counterObserver: IntersectionObserver | undefined;

    if (!reduceMotion && counters.length > 0) {
      counterObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const element = entry.target as HTMLElement;
            counterObserver?.unobserve(element);
            const target = Number(element.dataset.count ?? 0);
            const duration = 1100;
            const start = performance.now();
            const tick = (now: number) => {
              const elapsed = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - elapsed, 3);
              element.textContent = String(Math.round(target * eased));
              if (elapsed < 1) animations.push(requestAnimationFrame(tick));
            };
            animations.push(requestAnimationFrame(tick));
          });
        },
        { threshold: 0.5 },
      );
      counters.forEach((counter) => {
        counter.textContent = '0';
        counterObserver?.observe(counter);
      });
    }

    /* Pointer parallax -------------------------------------------------- */
    const hero = document.querySelector<HTMLElement>('[data-hero]');
    const product = document.querySelector<HTMLElement>('[data-product]');
    let parallaxFrame = 0;
    let nextX = 0;
    let nextY = 0;

    const applyParallax = () => {
      parallaxFrame = 0;
      if (!product) return;
      product.style.setProperty('--tilt-x', `${nextX.toFixed(2)}deg`);
      product.style.setProperty('--tilt-y', `${nextY.toFixed(2)}deg`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!hero || !product) return;
      if (event.pointerType !== 'mouse') return;
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      nextX = y * -2.2;
      nextY = x * 3.2;
      if (!parallaxFrame) parallaxFrame = requestAnimationFrame(applyParallax);
    };

    const onPointerLeave = () => {
      if (!product) return;
      product.style.setProperty('--tilt-x', '0deg');
      product.style.setProperty('--tilt-y', '0deg');
    };

    if (!reduceMotion && hero && product && window.matchMedia('(pointer: fine)').matches) {
      hero.addEventListener('pointermove', onPointerMove);
      hero.addEventListener('pointerleave', onPointerLeave);
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
      counterObserver?.disconnect();
      animations.forEach((id) => cancelAnimationFrame(id));
      if (parallaxFrame) cancelAnimationFrame(parallaxFrame);
      hero?.removeEventListener('pointermove', onPointerMove);
      hero?.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <div className="landing-progress" ref={progressRef} aria-hidden="true" />;
}
