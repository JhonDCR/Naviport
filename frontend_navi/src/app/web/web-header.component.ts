import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import {
  arrowForward, boatOutline, chevronDown, clipboardOutline, cubeOutline, locateOutline,
  mapOutline, notificationsOutline, shieldCheckmarkOutline, statsChartOutline,
} from 'ionicons/icons';
import { filter } from 'rxjs';
import { WebSessionService } from './acceso/web-session.service';

let nextHeaderId = 0;

const groups = [
  { name: 'Servicios', links: [
    { title: 'Rutas marítimas', summary: 'Trayectos de referencia hacia Guayaquil.', path: '/rutas-maritimas', icon: mapOutline },
    { title: 'Seguimiento de embarques', summary: 'Entiende cómo se actualiza cada envío.', path: '/seguimiento-maritimo', icon: locateOutline },
  ] },
  { name: 'Contenedores', links: [
    { title: 'Tipos y dimensiones', summary: 'Compara seis tipos de contenedores.', path: '/contenedores', icon: cubeOutline },
    { title: 'Preparar la carga', summary: 'Revisa medidas, acceso y datos del embarque.', path: '/preparar-embarque', icon: clipboardOutline },
  ] },
  { name: 'Mis envíos', client: true, links: [
    { title: 'Ver mis envíos', summary: 'Busca tus contenedores y abre su historial.', path: '/portal-cliente/envios', icon: boatOutline },
    { title: 'Resumen de embarques', summary: 'Consulta lo que está en curso y lo completado.', path: '/portal-cliente', icon: statsChartOutline },
    { title: 'Notificaciones', summary: 'Revisa las novedades de tus embarques.', path: '/portal-cliente/notificaciones', icon: notificationsOutline },
  ] },
  { name: 'Plataforma', links: [
    { title: 'Operación de flota', summary: 'Conoce los paneles del equipo naviero.', path: '/operacion-de-flota', icon: statsChartOutline },
    { title: 'Privacidad', summary: 'Consulta cómo usamos los datos de tu cuenta.', path: '/privacidad', icon: shieldCheckmarkOutline },
  ] },
];

@Component({
  selector: 'app-web-header',
  imports: [IonIcon, RouterLink, RouterLinkActive],
  templateUrl: './web-header.component.html',
  styleUrl: './web-header.component.scss',
  host: {
    '(document:keydown.escape)': 'escape($event)',
    '(document:click)': 'dismissOutside($event)',
  },
})
export class WebHeaderComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly router = inject(Router);
  private readonly account = inject(WebSessionService);

  readonly session = this.account.session;
  readonly groups = computed(() => {
    const role = this.session()?.usuario.rol;
    return groups.filter((group) => !group.client || !role || role === 'cliente');
  });
  readonly open = signal<{ name: string; preview: boolean } | null>(null);
  readonly id = `web-nav-${++nextHeaderId}`;
  readonly icons = { arrowForward, boatOutline, chevronDown };

  constructor() {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationStart),
      takeUntilDestroyed(),
    ).subscribe(() => this.open.set(null));
  }

  show(event: PointerEvent, name: string): void {
    if (event.pointerType === 'mouse' && !this.host.querySelector('.nav-panel :focus')) {
      this.open.set({ name, preview: true });
    }
  }

  leave(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && !this.host.querySelector('.nav-panel :focus')) this.open.set(null);
  }

  leaveFocus(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.open.set(null);
  }

  toggle(name: string): void {
    this.open.update((active) => active?.name === name && !active.preview ? null : { name, preview: false });
  }

  escape(event: Event): void {
    if (!this.open()) return;
    if (this.host.querySelector('.primary-nav :focus')) {
      this.host.querySelector<HTMLButtonElement>('.nav-trigger[aria-expanded="true"]')?.focus();
      event.preventDefault();
    }
    this.open.set(null);
  }

  dismissOutside(event: MouseEvent): void {
    if (this.open() && !this.host.contains(event.target as Node)) this.open.set(null);
  }

}
