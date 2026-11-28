import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { arrowBack, boatOutline, calendarOutline } from 'ionicons/icons';
import { portCity, shipmentDate, shipmentState, type EnvioWeb, type Viaje } from './mis-envios.component';

export interface DetalleEnvio extends Omit<EnvioWeb, 'viaje'> {
  pesoToneladas: number;
  viaje: (Viaje & { fechas?: { llegadaEstimada?: string; llegadaReal?: string } }) | null;
  numeroPrecinto: string | null;
  eventos: { estado: string; fecha: string; ubicacion: string; descripcion: string | null; completado: boolean }[];
}

@Component({
  selector: 'app-detalle-envio',
  imports: [DatePipe, DecimalPipe, IonIcon, RouterLink],
  templateUrl: './detalle-envio.component.html',
  styleUrl: './detalle-envio.component.scss',
})
export class DetalleEnvioComponent {
  readonly load = input.required<DetalleEnvio>();
  readonly icons = { arrowBack, boatOutline, calendarOutline };
  readonly portCity = portCity;
  readonly status = shipmentState;
  readonly arrival = computed(() => {
    const dates = this.load().viaje?.fechas;
    const real = shipmentDate(dates?.llegadaReal);
    return {
      label: real === null ? 'Llegada estimada' : 'Llegada real',
      date: real ?? shipmentDate(dates?.llegadaEstimada),
    };
  });
  readonly timeline = computed(() => this.load().eventos.map((event) => ({
    ...event,
    name: event.estado.replaceAll('_', ' '),
    date: shipmentDate(event.fecha),
  })).sort((a, b) => (b.date ?? 0) - (a.date ?? 0)));
  readonly latest = computed(() => this.timeline().find((event) => event.completado));
}
