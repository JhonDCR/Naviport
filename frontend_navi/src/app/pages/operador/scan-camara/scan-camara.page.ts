import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonInput,
  IonModal,
  IonProgressBar,
  IonToast,
} from '@ionic/angular';

@Component({
  selector: 'app-scan-camara',
  templateUrl: './scan-camara.page.html',
  styleUrls: ['./scan-camara.page.scss'],
  imports: [
    FormsModule,
    IonCard,
    IonCardContent,
    IonBadge,
    IonProgressBar,
    IonIcon,
    IonModal,
    IonButton,
    IonInput,
    IonToast,
  ],
})
export class ScanCamaraPage {
  private readonly router = inject(Router);

  readonly detectedCode = signal('#CN-9823');
  readonly confidence = signal(85);
  readonly scanCaptured = signal(false);
  readonly manualModalOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);

  manualCodeInput = 'CN-9823';

  goBack(): void {
    void this.router.navigateByUrl('/operador/inicio');
  }

  captureScan(): void {
    this.scanCaptured.set(true);
    this.confidence.set(98);
    this.toastMessage.set(`Lectura óptica confirmada: ${this.detectedCode()} (98% IA).`);
  }

  openManualEntry(): void {
    this.manualModalOpen.set(true);
  }

  applyManualCode(): void {
    const clean = this.manualCodeInput.trim().toUpperCase();
    if (clean) {
      this.detectedCode.set(clean.startsWith('#') ? clean : `#${clean}`);
      this.confidence.set(100);
      this.scanCaptured.set(true);
      this.toastMessage.set(`Contenedor ${this.detectedCode()} validado manualmente.`);
    }
    this.manualModalOpen.set(false);
  }
}
