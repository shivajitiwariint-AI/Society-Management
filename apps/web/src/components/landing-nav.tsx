'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { HomeLink } from '@/components/home-link';
import { animateScrollTo } from '@/lib/scroll';

const LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'roles', label: 'For teams' },
  { id: 'modules', label: 'Modules' },
  { id: 'workflow', label: 'How it works' },
  { id: 'security', label: 'Security' },
];

const HEADER_OFFSET = 88;

export function LandingNav({ accountHref, sessionLabel }: { accountHref: string; sessionLabel: string }) {
  const [active, setActive] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const line = HEADER_OFFSET + 24;
      let current: string | null = null;
      for (const link of LINKS) {
        const section = document.getElementById(link.id);
        if (!section) continue;
        if (section.getBoundingClientRect().top <= line) current = link.id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function scrollToSection(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    setMenuOpen(false);
    const section = document.getElementById(id);
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    animateScrollTo(top);
  }

  return (
    <header className="landing-nav">
      <div className="landing-container">
        <div className="landing-nav-inner">
          <HomeLink />
          <nav className="landing-nav-links" aria-label="Landing navigation">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={active === link.id ? 'active' : undefined}
                aria-current={active === link.id ? 'location' : undefined}
                onClick={(event) => scrollToSection(event, link.id)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="landing-nav-actions">
            <Link href="/register" className="landing-nav-register">Register company</Link>
            <Link href={accountHref} className="landing-button landing-button-primary">
              {sessionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="landing-nav-toggle"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className={`landing-mobile-menu${menuOpen ? ' open' : ''}`}>
          {LINKS.map((link) => (
            <a key={link.id} href={`#${link.id}`} onClick={(event) => scrollToSection(event, link.id)}>
              {link.label}
            </a>
          ))}
          <Link href="/register" onClick={() => setMenuOpen(false)}>Register company</Link>
        </div>
      </div>
    </header>
  );
}
