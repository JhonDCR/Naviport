import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonBadge, IonIcon, IonProgressBar, IonToast } from '@ionic/angular';
import { DesktopTopbarComponent } from '../../../shared/components/desktop-topbar/desktop-topbar.component';
import { FLEET_SHIPS_MOCK, FleetShipMock } from '../../../shared/mock-data';

type FleetFilter = 'ALL' | 'EN RUTA' | 'EN PUERTO' | 'RETRASO CLIMA' | 'MANTENIMIENTO';

@Component({
  selector: 'app-gerente-flota',
  templateUrl: './gerente-flota.page.html',
  styleUrls: ['./gerente-flota.page.scss'],
  imports: [DecimalPipe, FormsModule, DesktopTopbarComponent, IonIcon, IonBadge, IonProgressBar, IonToast],
})
export class GerenteFlotaPage {
  readonly fleetSearch = signal('');
  readonly fleetFilter = signal<FleetFilter>('ALL');
  readonly toastMessage = signal<string | null>(null);
  readonly ships = signal<FleetShipMock[]>(FLEET_SHIPS_MOCK);

  readonly fleetCounts = computed(() => {
    const all = this.ships();
    return {
      ALL: all.length,
      'EN RUTA': all.filter((s) => s.status === 'EN RUTA').length,
      'EN PUERTO': all.filter((s) => s.status === 'EN PUERTO').length,
      'RETRASO CLIMA': all.filter((s) => s.status === 'RETRASO CLIMA').length,
      MANTENIMIENTO: all.filter((s) => s.status === 'MANTENIMIENTO').length,
    };
  });

  readonly filteredFleet = computed(() => {
    const q = this.fleetSearch().trim().toLowerCase();
    const filter = this.fleetFilter();

    return this.ships().filter((ship) => {
      const matchesStatus = filter === 'ALL' || ship.status === filter;
      const matchesQuery =
        !q ||
        ship.name.toLowerCase().includes(q) ||
        ship.captain.toLowerCase().includes(q) ||
        ship.route.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  });

  onFleetSearch(val: string): void {
    this.fleetSearch.set(val);
  }

  getBadgeClass(status: FleetShipMock['status']): string {
    switch (status) {
      case 'EN RUTA':
        return 'badge-ruta-soft';
      case 'RETRASO CLIMA':
        return 'badge-retraso';
      case 'MANTENIMIENTO':
        return 'badge-mantenimiento';
      case 'EN PUERTO':
        return 'badge-puerto';
    }
  }
}
