import { Component, signal } from '@angular/core';
import { IonBadge } from '@ionic/angular';
import { ADMIN_PORTS_MOCK } from '../../../shared/mock-data';

@Component({
  selector: 'app-admin-puertos',
  templateUrl: './admin-puertos.page.html',
  styleUrls: ['./admin-puertos.page.scss'],
  imports: [IonBadge],
})
export class AdminPuertosPage {
  readonly ports = signal(ADMIN_PORTS_MOCK);
}
