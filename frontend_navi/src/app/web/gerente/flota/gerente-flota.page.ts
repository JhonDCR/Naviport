import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, input, linkedSignal } from '@angular/core';
import { FLEET_SHIPS_MOCK, FleetShipMock } from '../../../shared/mock-data';

type FleetStatus = FleetShipMock['status'];

@Component({
  selector: 'app-gerente-flota',
  templateUrl: './gerente-flota.page.html',
  styleUrl: './gerente-flota.page.scss',
  imports: [DecimalPipe, PercentPipe],
})
export class GerenteFlotaPage {
  readonly q = input<string>();
  readonly estado = input<string>();
  readonly search = linkedSignal(() => this.q() ?? '');
  readonly status = linkedSignal(() => this.estado() ?? '');
  readonly statusOptions: { value: FleetStatus; label: string }[] = [
    { value: 'EN RUTA', label: 'En ruta' },
    { value: 'EN PUERTO', label: 'En puerto' },
    { value: 'RETRASO CLIMA', label: 'Retraso por clima' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  ];

  readonly ships = computed(() => {
    const q = this.search().trim().toLocaleLowerCase('es-EC');
    const status = this.status();
    return FLEET_SHIPS_MOCK.filter((ship) =>
      (!status || ship.status === status) &&
      [ship.name, ship.imo, ship.captain, ship.route].some((text) =>
        text.toLocaleLowerCase('es-EC').includes(q),
      ),
    );
  });
}
