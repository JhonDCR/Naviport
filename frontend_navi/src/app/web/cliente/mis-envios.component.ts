import { DatePipe } from '@angular/common';
import { Component, Injectable, computed, inject, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { arrowForward, calendarOutline, searchOutline } from 'ionicons/icons';
import { WebSessionService } from '../acceso/web-session.service';

export interface Viaje {
  id?: string | null;
  codigo: string;
  buque: string;
  origen: string;
  destino: string;
  estado: string;
}

export interface EnvioWeb {
  id: string;
  codigoContenedor: string;
  tipo: string;
  viaje: Viaje & { llegadaEstimada: string | null };
}

const options = [
  { value: 'todos', label: 'Todos' },
  { value: 'curso', label: 'En curso' },
  { value: 'completados', label: 'Completados' },
] as const;
type StatusFilter = (typeof options)[number]['value'];
const initialFilters: { search: string; status: StatusFilter } = { search: '', status: 'todos' };

@Injectable({ providedIn: 'root' })
class ConsultaEnvios {
  readonly filters = linkedSignal({
    source: inject(WebSessionService).session,
    computation: () => initialFilters,
  });
}

const states: Record<string, string> = {
  programado: 'Programado',
  en_ruta: 'En ruta',
  retrasado: 'Retrasado',
  finalizado: 'Completado',
};

function normalize(text: string): string {
  return text.toLocaleLowerCase('es-EC').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function portCity(port: string): string | null {
  const name = port.split(' (', 1)[0].trim();
  return name && name !== 'N/A' ? name : null;
}

export function shipmentRoute(viaje: Viaje): string {
  const origin = portCity(viaje.origen);
  const destination = portCity(viaje.destino);
  return origin || destination
    ? `${origin ?? 'Origen por confirmar'} → ${destination ?? 'Destino por confirmar'}`
    : 'Ruta por confirmar';
}

export function shipmentState(viaje: Viaje | null): string {
  return !viaje || viaje.id === null ? 'Sin viaje asignado' : states[viaje.estado] ?? 'Estado por confirmar';
}

export function shipmentDate(value?: string | null): number | null {
  const date = Date.parse(value ?? '');
  return Number.isFinite(date) ? date : null;
}

@Component({
  selector: 'app-mis-envios',
  imports: [DatePipe, IonIcon, RouterLink],
  templateUrl: './mis-envios.component.html',
  styleUrl: './mis-envios.component.scss',
})
export class MisEnviosComponent {
  readonly loads = input.required<readonly EnvioWeb[] | null>();
  readonly error = input('');
  readonly retry = output<void>();
  readonly filters = inject(ConsultaEnvios).filters;
  readonly options = options;
  readonly icons = { arrowForward, calendarOutline, searchOutline };
  readonly filtered = computed(() => this.filters().search !== '' || this.filters().status !== 'todos');

  private readonly rows = computed(() => (this.loads() ?? []).map(({ viaje, ...load }) => ({
    ...load,
    route: shipmentRoute(viaje),
    vessel: viaje.buque === 'N/A' ? null : viaje.buque,
    arrival: shipmentDate(viaje.llegadaEstimada),
    state: shipmentState(viaje),
    completed: viaje.estado === 'finalizado',
    delayed: viaje.estado === 'retrasado',
    sailing: viaje.id !== null && viaje.estado === 'en_ruta',
    searchable: normalize([load.codigoContenedor, viaje.buque, viaje.origen, viaje.destino]
      .filter((value) => value !== 'N/A').join(' ')),
  })).sort((a, b) => Number(a.completed) - Number(b.completed) || (a.completed ? 0
    : (a.arrival ?? Number.MAX_SAFE_INTEGER) - (b.arrival ?? Number.MAX_SAFE_INTEGER))));

  readonly nextArrival = computed(() => {
    const now = Date.now();
    return this.rows().find((row) => !row.completed && row.arrival !== null && row.arrival >= now);
  });

  readonly visible = computed(() => {
    const { search, status } = this.filters();
    const term = normalize(search.trim());
    return this.rows().filter((row) =>
      (status === 'todos' || row.completed === (status === 'completados')) && row.searchable.includes(term),
    );
  });

  search(search: string): void {
    this.filters.update((current) => ({ ...current, search }));
  }

  choose(status: StatusFilter): void {
    this.filters.update((current) => ({ ...current, status }));
  }

  clear(): void {
    this.filters.set(initialFilters);
  }
}
