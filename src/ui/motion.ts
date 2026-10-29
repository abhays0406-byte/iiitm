import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
gsap.defaults({ ease: 'power3.out', duration: 0.45 });

/**
 * Animations are skipped when the viewer asks for reduced motion, and in
 * environments without matchMedia (jsdom in tests), so nothing waits on a tween.
 */
export function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Targets = Element | null | undefined | ArrayLike<Element>;

function hasTargets(targets: Targets): targets is Element | ArrayLike<Element> {
  if (!targets) return false;
  return targets instanceof Element || targets.length > 0;
}

const ENTER_PROPS = 'transform,opacity,visibility';

/**
 * gsap.from for entrances. It does nothing when a page has none of the targets (GSAP warns
 * otherwise), and it always leaves the elements with no inline styles — on completion and if
 * the tween is interrupted — so CSS hover and press transforms keep working and nothing is
 * left half-faded.
 */
export function enter(targets: Targets, vars: gsap.TweenVars, tl?: gsap.core.Timeline, position?: gsap.Position) {
  if (!hasTargets(targets)) return;
  const full: gsap.TweenVars = {
    ...vars,
    clearProps: ENTER_PROPS,
    onInterrupt(this: gsap.core.Tween) { gsap.set(this.targets(), { clearProps: ENTER_PROPS }); },
  };
  if (tl) tl.from(targets, full, position);
  else gsap.from(targets, full);
}

export { gsap, useGSAP };
