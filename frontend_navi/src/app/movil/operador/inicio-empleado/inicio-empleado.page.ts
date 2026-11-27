import { Component, computed, inject, signal } from '@angular/core';
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
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToast,
} from '@ionic/angular';
import { MobileHeaderComponent } from '../../../shared/components/mobile-header/mobile-header.component';
import { OPERATOR_SCANS_MOCK, ScanRecordMock } from '../../../shared/mock-data';

@Component({
  selector: 'app-inicio-empleado',
  templateUrl: './inicio-empleado.page.html',
  styleUrls: ['./inicio-empleado.page.scss'],
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
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToast,
    MobileHeaderComponent,
  ],
})
export class InicioEmpleadoPage {
  private readonly router = inject(Router);

  readonly shiftActive = signal(true);
  readonly showAllScans = signal(false);
  readonly scans = signal<ScanRecordMock[]>(OPERATOR_SCANS_MOCK);
  readonly incidentModalOpen = signal(false);
  readonly toastMessage = signal<string | null>(null);

  readonly scanCount = computed(() => 29 + this.scans().length);
  readonly visibleScans = computed(() =>
    this.showAllScans() ? this.scans() : this.scans().slice(0, 2),
  );

  incidentContainer = '#MSK-1567';
  incidentType: 'Sello' | 'Avería' = 'Sello';
  incidentDetail = '';

  toggleShift(): void {
    this.shiftActive.update((prev) => !prev);
    this.toastMessage.set(
      this.shiftActive() ? 'Turno operativo reanudado (08:00 - 16:00).' : 'Turno en pausa temporal.',
    );
  }

  toggleViewAll(): void {
    this.showAllScans.update((prev) => !prev);
  }

  openScanner(): void {
    void this.router.navigateByUrl('/operador/escaner');
  }

  openIncidentModal(): void {
    this.incidentModalOpen.set(true);
  }

  submitIncident(): void {
    const cleanCode = this.incidentContainer.trim() || '#MSK-9001';
    const newRecord: ScanRecordMock = {
      id: `scan-${Date.now()}`,
      code: cleanCode.startsWith('#') ? cleanCode : `#${cleanCode}`,
      vessel: 'Maersk Horizon',
      timeAgo: 'Justo ahora',
      info: this.incidentDetail.trim() || `Reporte manual de ${this.incidentType.toLowerCase()}`,
      status: this.incidentType,
      confidence: 100,
      image: 'assets/figma/container-scan.png',
    };

    this.scans.update((prev) => [newRecord, ...prev]);
    this.incidentModalOpen.set(false);
    this.incidentDetail = '';
    this.toastMessage.set(`Incidente registrado para ${newRecord.code}.`);
  }
}
