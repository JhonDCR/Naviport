import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonIcon,
  IonProgressBar,
  IonToast,
} from '@ionic/angular';
import { CLIENT_SHIPMENTS_MOCK } from '../../../shared/mock-data';

@Component({
  selector: 'app-detalle-pedido',
  templateUrl: './detalle-pedido.page.html',
  styleUrls: ['./detalle-pedido.page.scss'],
  imports: [IonBadge, IonCard, IonCardContent, IonProgressBar, IonIcon, IonToast],
})
export class DetallePedidoPage {
  private readonly router = inject(Router);

  readonly id = input<string>('BU-1234XYZ');
  readonly toastOpen = signal(false);

  readonly shipment = computed(() => {
    const targetId = this.id();
    return (
      CLIENT_SHIPMENTS_MOCK.find((item) => item.id === targetId) ?? CLIENT_SHIPMENTS_MOCK[0]
    );
  });

  goBack(): void {
    void this.router.navigateByUrl('/cliente/seguimiento');
  }

  downloadManifest(): void {
    this.toastOpen.set(true);
  }
}
