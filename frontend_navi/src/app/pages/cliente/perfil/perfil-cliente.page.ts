import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonIcon,
  IonInput,
  IonModal,
  IonTextarea,
  IonToast,
  IonToggle,
} from '@ionic/angular';

@Component({
  selector: 'app-perfil-cliente',
  templateUrl: './perfil-cliente.page.html',
  styleUrls: ['./perfil-cliente.page.scss'],
  imports: [
    FormsModule,
    IonCard,
    IonIcon,
    IonToggle,
    IonModal,
    IonButton,
    IonInput,
    IonTextarea,
    IonToast,
  ],
})
export class PerfilClientePage {
  private readonly router = inject(Router);

  readonly pushEnabled = signal(true);
  readonly supportModalOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);

  supportSubject = '';
  supportMessage = '';

  togglePush(event: CustomEvent<{ checked: boolean }>): void {
    this.pushEnabled.set(event.detail.checked);
  }

  openSupportModal(): void {
    this.supportModalOpen.set(true);
  }

  sendSupportTicket(): void {
    this.supportModalOpen.set(false);
    this.supportSubject = '';
    this.supportMessage = '';
    this.toastMessage.set('Consulta enviada al agente aduanero.');
  }

  showInfoToast(message: string): void {
    this.toastMessage.set(message);
  }

  logout(): void {
    void this.router.navigateByUrl('/login');
  }
}
