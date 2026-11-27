import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBadge,
  IonButton,
  IonIcon,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonToast,
} from '@ionic/angular';
import { ADMIN_INITIAL_SHIPS, FleetShipMock } from '../../../shared/mock-data';

@Component({
  selector: 'app-admin-buques',
  templateUrl: './admin-buques.page.html',
  styleUrls: ['./admin-buques.page.scss'],
  imports: [
    DecimalPipe,
    FormsModule,
    IonIcon,
    IonBadge,
    IonModal,
    IonButton,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToast,
  ],
})
export class AdminBuquesPage {
  readonly ships = signal<FleetShipMock[]>(ADMIN_INITIAL_SHIPS);
  readonly searchQuery = signal('');
  readonly statusFilter = signal<'ALL' | 'ACTIVO' | 'INACTIVO' | 'MANTENIMIENTO'>('ALL');
  readonly currentPage = signal(1);
  readonly pageSize = 3;
  readonly addModalOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);

  newImo = 'IMO-9911420';
  newName = '';
  newType: FleetShipMock['type'] = 'Portacontenedores';
  newCapacity = 32000;

  readonly filteredShips = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filter = this.statusFilter();

    return this.ships().filter((ship) => {
      const matchesStatus = filter === 'ALL' || ship.adminStatus === filter;
      const matchesQuery =
        !q || ship.imo.toLowerCase().includes(q) || ship.name.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredShips().length / this.pageSize)),
  );

  readonly pagedShips = computed(() => {
    const safePage = Math.min(this.currentPage(), this.totalPages());
    const start = (safePage - 1) * this.pageSize;
    return this.filteredShips().slice(start, start + this.pageSize);
  });

  readonly pageStartIndex = computed(() => {
    const total = this.filteredShips().length;
    if (total === 0) return 0;
    const safePage = Math.min(this.currentPage(), this.totalPages());
    return (safePage - 1) * this.pageSize + 1;
  });

  readonly pageEndIndex = computed(() => {
    const total = this.filteredShips().length;
    if (total === 0) return 0;
    return Math.min(total, this.pageStartIndex() + this.pagedShips().length - 1);
  });

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  cycleFilter(): void {
    const order: Array<'ALL' | 'ACTIVO' | 'INACTIVO' | 'MANTENIMIENTO'> = [
      'ALL',
      'ACTIVO',
      'INACTIVO',
      'MANTENIMIENTO',
    ];
    const next = order[(order.indexOf(this.statusFilter()) + 1) % order.length];
    this.statusFilter.set(next);
    this.currentPage.set(1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  addShip(): void {
    const cleanName = this.newName.trim() || 'Pacific Horizon';
    const created: FleetShipMock = {
      id: `ship-${Date.now()}`,
      imo: this.newImo.trim() || 'IMO-9988776',
      name: cleanName,
      type: this.newType,
      capacityTn: Number(this.newCapacity) || 25000,
      status: 'EN RUTA',
      adminStatus: 'ACTIVO',
      route: 'Shanghai a Guayaquil',
      progress: 0.25,
      captain: 'Por asignar',
      eta: '28 Oct',
    };
    this.ships.update((list) => [created, ...list]);
    this.addModalOpen.set(false);
    this.newName = '';
    this.toastMessage.set(`Buque ${created.name} agregado al catálogo.`);
  }

  cycleShipState(ship: FleetShipMock): void {
    const nextMap: Record<FleetShipMock['adminStatus'], FleetShipMock['adminStatus']> = {
      ACTIVO: 'MANTENIMIENTO',
      MANTENIMIENTO: 'INACTIVO',
      INACTIVO: 'ACTIVO',
    };
    const nextStatus = nextMap[ship.adminStatus];
    this.ships.update((list) =>
      list.map((item) => (item.id === ship.id ? { ...item, adminStatus: nextStatus } : item)),
    );
    this.toastMessage.set(`${ship.name} actualizado a ${nextStatus}.`);
  }

  removeShip(id: string, name: string): void {
    this.ships.update((list) => list.filter((item) => item.id !== id));
    this.toastMessage.set(`Buque ${name} retirado de la vista.`);
  }
}
