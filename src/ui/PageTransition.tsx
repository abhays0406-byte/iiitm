import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap, useGSAP, motionAllowed, enter } from './motion';

/** A short, quiet fade-in for the header and cards whenever the route changes. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useGSAP(() => {
    if (!motionAllowed()) return;
    const q = gsap.utils.selector(ref);
    const tl = gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.35 } });
    enter(q('.page-header'), { y: 6, autoAlpha: 0 }, tl);
    enter(q('.page-body .card, .priority-options > *'), { y: 8, autoAlpha: 0, stagger: 0.04 }, tl, '-=0.25');
  }, { scope: ref, dependencies: [pathname], revertOnUpdate: true });

  return <div ref={ref} style={{ height: '100%' }}>{children}</div>;
}
