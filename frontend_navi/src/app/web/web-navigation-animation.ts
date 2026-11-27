import { createAnimation, type Animation } from '@ionic/angular';

export function webNavigationAnimation(
  _outlet: HTMLElement,
  options?: { enteringEl: HTMLElement; leavingEl?: HTMLElement; direction?: string },
): Animation {
  const incoming = options?.enteringEl;
  const outgoing = options?.leavingEl;
  const main = incoming?.querySelector('main');
  if (!main || !incoming?.querySelector('app-web-header') || !outgoing?.querySelector('app-web-header') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return createAnimation().duration(0);
  }

  if (options?.direction === 'back') incoming.style.zIndex = '101';

  return createAnimation()
    .addElement(main)
    .duration(180)
    .easing('ease-out')
    .keyframes([
      { opacity: 0.5, transform: 'translateY(5px)' },
      { opacity: 1, transform: 'none' },
    ]);
}
