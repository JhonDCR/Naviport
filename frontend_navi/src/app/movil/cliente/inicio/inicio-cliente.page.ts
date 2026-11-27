import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonModal,
  IonProgressBar,
} from '@ionic/angular';
import { MobileHeaderComponent } from '../../../shared/components/mobile-header/mobile-header.component';
import { CLIENT_NOTIFICATIONS_MOCK, CLIENT_SHIPMENTS_MOCK } from '../../../shared/mock-data';

@Component({
  selector: 'app-inicio-cliente',
  templateUrl: './inicio-cliente.page.html',
  styleUrls: ['./inicio-cliente.page.scss'],
  imports: [
    IonCard,
    IonCardContent,
    IonBadge,
    IonProgressBar,
    IonIcon,
    IonModal,
    IonButton,
    MobileHeaderComponent,
  ],
})
export class InicioClientePage {
  private readonly router = inject(Router);

  readonly primaryShipment = signal(CLIENT_SHIPMENTS_MOCK[0]);
  readonly notifications = signal(CLIENT_NOTIFICATIONS_MOCK);
  readonly notificationsOpen = signal(false);

  readonly hasUnreadNotifications = computed(() =>
    this.notifications().some((item) => item.unread),
  );

  openDetail(id: string): void {
    void this.router.navigate(['/cliente/detalle', id]);
  }

  openNotifications(): void {
    this.notificationsOpen.set(true);
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  markAllRead(): void {
    this.notifications.update((items) => items.map((item) => ({ ...item, unread: false })));
  }
}
