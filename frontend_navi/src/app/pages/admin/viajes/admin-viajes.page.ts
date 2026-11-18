import { Component, signal } from '@angular/core';
import { IonBadge } from '@ionic/angular';
import { ADMIN_VOYAGES_MOCK } from '../../../shared/mock-data';

@Component({
  selector: 'app-admin-viajes',
  templateUrl: './admin-viajes.page.html',
  styleUrls: ['./admin-viajes.page.scss'],
  imports: [IonBadge],
})
export class AdminViajesPage {
  readonly voyages = signal(ADMIN_VOYAGES_MOCK);
}
