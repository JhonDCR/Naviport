import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBadge,
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
  selector: 'app-perfil-empleado',
  templateUrl: './perfil-empleado.page.html',
  styleUrls: ['./perfil-empleado.page.scss'],
  imports: [
    FormsModule,
    IonCard,
    IonBadge,
    IonIcon,
    IonToggle,
    IonModal,
    IonButton,
    IonInput,
    IonTextarea,
    IonToast,
  ],
})
export class PerfilEmpleadoPage {
  private readonly router = inject(Router);

  readonly pushEnabled = signal(true);
  readonly supportModalOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);

  bugSubject = '';
  bugDescription = '';

  togglePush(event: CustomEvent<{ checked: boolean }>): void {
    this.pushEnabled.set(event.detail.checked);
  }

  openAppBugModal(): void {
    this.supportModalOpen.set(true);
  }

  sendReport(): void {
    this.supportModalOpen.set(false);
    this.bugSubject = '';
    this.bugDescription = '';
    this.toastMessage.set('Reporte técnico enviado al equipo de soporte.');
  }

  showInfo(msg: string): void {
    this.toastMessage.set(msg);
  }

  logout(): void {
    void this.router.navigateByUrl('/login');
  }
}
