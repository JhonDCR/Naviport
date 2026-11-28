import { Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { boatOutline, cubeOutline, listOutline, logOutOutline, menuOutline, notificationsOutline } from 'ionicons/icons';
import { WebSessionService } from '../acceso/web-session.service';
import { WebFrameComponent } from '../referencia/web-frame.component';
import type { ClientePage } from './cliente.page';

const portal = '/portal-cliente';
const navigation = [
  { path: portal + '/envios', label: 'Mis envíos', icon: cubeOutline, exact: false },
  { path: portal + '/notificaciones', label: 'Notificaciones', icon: notificationsOutline, exact: true },
  { path: portal, label: 'Resumen', icon: listOutline, exact: true },
];
const sections = new Set(navigation.map(({ path }) => path));

function pathname(url: string): string {
  return url.split(/[?#]/, 1)[0];
}

function inPortal(path: string): boolean {
  return path === portal || path.startsWith(portal + '/');
}

@Component({
  selector: 'app-portal-cliente-shell',
  imports: [IonIcon, RouterLink, RouterLinkActive, RouterOutlet, WebFrameComponent],
  templateUrl: './portal-cliente-shell.component.html',
  styleUrl: './portal-cliente-shell.component.scss',
})
export class PortalClienteShellComponent {
  private readonly router = inject(Router);
  private readonly account = inject(WebSessionService);
  private readonly destroy = inject(DestroyRef);
  private readonly frame = viewChild.required(WebFrameComponent);
  private readonly view = viewChild<ElementRef<HTMLElement>>('view');
  private readonly scroll = signal<HTMLElement | null>(null);
  private readonly positions = new Map<string, number>();
  private readonly pendingTop = signal<number | null>(null);
  private readonly sidebar = viewChild.required<ElementRef<HTMLElement>>('sidebar');
  readonly activeView = signal<ClientePage | null>(null);
  readonly listViewport = computed(() => {
    const section = this.activeView()?.seccion();
    return section === 'envios' || section === 'notificaciones';
  });
  readonly compact = signal(false);
  readonly navigation = navigation;
  readonly icons = { boatOutline, logOutOutline, menuOutline };

  constructor() {
    afterNextRender(() => {
      void this.frame().getScrollElement().then((element) => this.scroll.set(element));
      const breakpoint = window.matchMedia('(max-width: 800px)');
      const sync = () => this.compact.set(breakpoint.matches);
      sync();
      breakpoint.addEventListener('change', sync);
      this.destroy.onDestroy(() => breakpoint.removeEventListener('change', sync));
    });
    effect(() => {
      this.account.session();
      this.positions.clear();
    });
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.closeSidebar();
        this.rememberScroll(pathname(event.url));
      }
      if (event instanceof NavigationEnd) {
        const next = pathname(event.urlAfterRedirects);
        if (inPortal(next)) this.pendingTop.set(this.positions.get(next) ?? 0);
      }
      if (event instanceof NavigationCancel || event instanceof NavigationError) {
        const view = this.view()?.nativeElement;
        if (view) view.style.minHeight = '';
      }
    });
    afterRenderEffect(() => {
      const top = this.pendingTop();
      const scroll = this.activeScroll();
      if (top === null || !scroll || (top > 0 && !this.activeView()?.ready())) return;

      const view = this.view()?.nativeElement;
      if (view) view.style.minHeight = '';
      scroll.scrollTo({ top, behavior: 'instant' });
      this.pendingTop.set(null);
    });
  }

  closeSidebar(): void {
    if (this.compact() && this.sidebar().nativeElement.matches(':popover-open')) {
      this.sidebar().nativeElement.hidePopover();
    }
  }

  async signOut(): Promise<void> {
    this.closeSidebar();
    await this.account.signOut().catch(() => undefined);
    await this.router.navigateByUrl('/servicios');
  }

  private rememberScroll(next: string): void {
    const current = pathname(this.router.url);
    const scroll = this.activeScroll();
    if (!scroll || !inPortal(current) || current === next) return;

    if (sections.has(current) && this.pendingTop() === null) this.positions.set(current, scroll.scrollTop);
    this.pendingTop.set(null);
    const view = this.view()?.nativeElement;
    // Keep the scroll range while the incoming view replaces the outgoing content.
    if (view) view.style.minHeight = inPortal(next) && scroll === this.scroll() && scroll.scrollTop > 0
      ? `${view.offsetHeight}px` : '';
  }

  private activeScroll(): HTMLElement | null {
    const list = this.view()?.nativeElement.querySelector<HTMLElement>('[data-list-scroll]');
    return list && getComputedStyle(list).overflowY === 'auto' ? list : this.scroll();
  }
}
