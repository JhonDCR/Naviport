import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { arrowForward, boatOutline, notificationsOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { WebSessionService } from '../acceso/web-session.service';
import { DetalleEnvioComponent, type DetalleEnvio } from './detalle-envio.component';
import { MisEnviosComponent, portCity, shipmentDate, shipmentState, type EnvioWeb } from './mis-envios.component';

interface Resumen {
  totalContenedores: number;
  enCurso: number;
  completados: number;
  cargaDestacada: EnvioWeb | null;
}

interface Aviso {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

type Vista =
  | { tipo: 'resumen'; data: Resumen }
  | { tipo: 'envios'; data: EnvioWeb[] }
  | { tipo: 'detalle'; data: DetalleEnvio }
  | { tipo: 'notificaciones'; data: Aviso[] };

@Component({
  selector: 'app-portal-cliente',
  templateUrl: './cliente.page.html',
  styleUrl: './cliente.page.scss',
  imports: [DatePipe, DetalleEnvioComponent, IonIcon, MisEnviosComponent, RouterLink],
})
export class ClientePage {
  private readonly session = inject(WebSessionService);
  private readonly router = inject(Router);
  private readonly retry = signal(0);

  readonly seccion = input<Vista['tipo']>('resumen');
  readonly id = input('');
  readonly vista = signal<Vista | null>(null);
  readonly error = signal('');
  readonly ready = computed(() => this.vista() !== null || !!this.error());
  readonly avisoError = signal('');
  readonly pendingAviso = signal<string | null>(null);
  readonly onlyUnread = signal(false);
  readonly portCity = portCity;
  readonly shipmentDate = shipmentDate;
  readonly shipmentState = shipmentState;
  readonly icons = { arrowForward, boatOutline, notificationsOutline };
  readonly notifications = computed(() => {
    const view = this.vista();
    return view?.tipo === 'notificaciones' ? view.data : [];
  });
  readonly unread = computed(() => this.notifications().filter((item) => !item.leida));
  readonly cargas = computed(() => {
    const view = this.vista();
    return view?.tipo === 'envios' ? view.data : null;
  });

  constructor() {
    effect((onCleanup) => {
      const section = this.seccion();
      const id = this.id();
      const active = this.session.session();
      this.retry();
      this.vista.set(null);
      this.error.set('');
      this.avisoError.set('');
      if (!active) return;

      const request = new AbortController();
      onCleanup(() => request.abort());
      void this.load(section, id, active.accessToken, request.signal).then(
        (view) => { if (!request.signal.aborted) this.vista.set(view); },
        (error: unknown) => {
          if (!request.signal.aborted) this.error.set(this.message(error));
        },
      );
    });
  }

  reload(): void {
    this.retry.update((attempt) => attempt + 1);
  }

  async leer(aviso: Aviso): Promise<void> {
    const active = this.session.session();
    if (!active || aviso.leida || this.pendingAviso()) return;

    this.pendingAviso.set(aviso.id);
    this.avisoError.set('');
    try {
      await this.api(`notificaciones/${encodeURIComponent(aviso.id)}/leer`, active.accessToken, undefined, 'PATCH');
      this.vista.update((current) => current?.tipo === 'notificaciones'
        ? { tipo: 'notificaciones', data: current.data.map((item) => item.id === aviso.id ? { ...item, leida: true } : item) }
        : current);
    } catch (error) {
      if (this.seccion() === 'notificaciones') this.avisoError.set(this.message(error));
    } finally {
      this.pendingAviso.set(null);
    }
  }

  private async load(section: Vista['tipo'], id: string, token: string, signal: AbortSignal): Promise<Vista> {
    switch (section) {
      case 'resumen': return { tipo: section, data: await this.api<Resumen>('resumen-cliente', token, signal) };
      case 'envios': return { tipo: section, data: await this.api<EnvioWeb[]>('mis-cargas', token, signal) };
      case 'detalle': return { tipo: section, data: await this.api<DetalleEnvio>(encodeURIComponent(id), token, signal) };
      case 'notificaciones': return { tipo: section, data: await this.api<Aviso[]>('notificaciones', token, signal) };
    }
  }

  private async api<T>(path: string, token: string, signal?: AbortSignal, method = 'GET'): Promise<T> {
    const timeout = AbortSignal.timeout(10_000);
    const response = await fetch(`${environment.webApiBaseUrl}/cargas/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });

    if (response.status === 401) {
      if (this.session.expire(token)) void this.router.navigateByUrl('/login', { replaceUrl: true });
      throw new Error('La sesión venció. Vuelve a ingresar.');
    }
    if (response.status === 403 || response.status === 404) {
      throw new Error('Este registro no está disponible para tu cuenta.');
    }
    if (!response.ok) throw new Error('No pudimos completar la consulta. Vuelve a intentar.');
    return ((await response.json()) as { data: T }).data;
  }

  private message(error: unknown): string {
    return error instanceof Error && !(error instanceof TypeError || error instanceof DOMException)
      ? error.message
      : 'No pudimos conectar con el servicio. Intenta de nuevo.';
  }
}
