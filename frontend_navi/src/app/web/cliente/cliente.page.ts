import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { WebSessionService } from '../acceso/web-session.service';
import { WebFrameComponent } from '../referencia/web-frame.component';

interface Viaje {
  codigo: string;
  buque: string;
  origen: string;
  destino: string;
  estado: string;
}

interface Carga {
  id: string;
  codigoContenedor: string;
  tipo: string;
  pesoToneladas: number;
  viaje: Viaje & { llegadaEstimada: string | null };
}

interface Resumen {
  totalContenedores: number;
  enCurso: number;
  completados: number;
  cargaDestacada: Carga | null;
}

interface Detalle extends Omit<Carga, 'viaje'> {
  viaje: (Viaje & { fechas?: { llegadaEstimada?: string; llegadaReal?: string } }) | null;
  numeroPrecinto: string | null;
  eventos: { estado: string; fecha: string; ubicacion: string; descripcion: string | null; completado: boolean }[];
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
  | { tipo: 'envios'; data: Carga[] }
  | { tipo: 'detalle'; data: Detalle }
  | { tipo: 'notificaciones'; data: Aviso[] };

@Component({
  selector: 'app-portal-cliente',
  templateUrl: './cliente.page.html',
  imports: [DatePipe, DecimalPipe, RouterLink, WebFrameComponent],
})
export class ClientePage {
  private readonly session = inject(WebSessionService);
  private readonly router = inject(Router);
  private readonly retry = signal(0);

  readonly seccion = input<Vista['tipo']>('resumen');
  readonly id = input('');
  readonly vista = signal<Vista | null>(null);
  readonly error = signal('');
  readonly avisoError = signal('');
  readonly pendingAviso = signal<string | null>(null);
  readonly search = signal('');
  readonly filter = signal('todos');

  readonly envios = computed(() => {
    const view = this.vista();
    if (view?.tipo !== 'envios') return [];

    const term = this.search().trim().toLocaleLowerCase('es-EC');
    const filter = this.filter();
    return view.data.filter(({ codigoContenedor, viaje }) =>
      (filter === 'todos' || (viaje.estado === 'finalizado') === (filter === 'completados')) &&
      [codigoContenedor, viaje.buque, viaje.origen, viaje.destino].some((value) =>
        value.toLocaleLowerCase('es-EC').includes(term),
      ),
    );
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

  estado(value: string): string {
    return value.replaceAll('_', ' ');
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
      case 'envios': return { tipo: section, data: await this.api<Carga[]>('mis-cargas', token, signal) };
      case 'detalle': return { tipo: section, data: await this.api<Detalle>(encodeURIComponent(id), token, signal) };
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
