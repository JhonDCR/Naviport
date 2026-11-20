import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonIcon,
  IonProgressBar,
  IonSearchbar,
} from '@ionic/angular';
import { CLIENT_SHIPMENTS_MOCK } from '../../../shared/mock-data';

@Component({
  selector: 'app-seguimiento',
  templateUrl: './seguimiento.page.html',
  styleUrls: ['./seguimiento.page.scss'],
  imports: [IonSearchbar, IonCard, IonCardContent, IonBadge, IonProgressBar, IonIcon],
})
export class SeguimientoPage {
  private readonly router = inject(Router);

  readonly shipments = signal(CLIENT_SHIPMENTS_MOCK);
  readonly activeTab = signal<'en_curso' | 'completados'>('en_curso');
  readonly searchQuery = signal('');
  readonly originFilter = signal<'ALL' | 'Shanghai' | 'Miami'>('ALL');

  readonly filteredShipments = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const tab = this.activeTab();
    const origin = this.originFilter();

    return this.shipments().filter((item) => {
      const matchesTab =
        tab === 'en_curso' ? item.status !== 'ENTREGADO' : item.status === 'ENTREGADO';
      const matchesOrigin = origin === 'ALL' || item.originCity === origin;
      const matchesQuery =
        !query ||
        item.code.toLowerCase().includes(query) ||
        item.vessel.toLowerCase().includes(query) ||
        item.originCity.toLowerCase().includes(query) ||
        item.destinationCity.toLowerCase().includes(query);

      return matchesTab && matchesOrigin && matchesQuery;
    });
  });

  setTab(tab: 'en_curso' | 'completados'): void {
    this.activeTab.set(tab);
  }

  onSearchInput(event: CustomEvent<{ value?: string | null }>): void {
    this.searchQuery.set(event.detail.value ?? '');
  }

  cycleOriginFilter(): void {
    const current = this.originFilter();
    const next = current === 'ALL' ? 'Shanghai' : current === 'Shanghai' ? 'Miami' : 'ALL';
    this.originFilter.set(next);
  }

  openDetail(id: string): void {
    void this.router.navigate(['/cliente/detalle', id]);
  }
}
