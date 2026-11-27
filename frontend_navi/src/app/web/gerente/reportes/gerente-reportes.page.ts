import { Component, computed, signal } from '@angular/core';
import { IonBadge, IonIcon, IonProgressBar, IonToast } from '@ionic/angular';
import { DesktopTopbarComponent } from '../../../shared/components/desktop-topbar/desktop-topbar.component';
import {
  GERENTE_MONTHLY_BARS,
  GERENTE_PUNTUALIDAD_BARS,
  GERENTE_RECENT_ALERTS,
  GERENTE_ROUTE_LOADS,
} from '../../../shared/mock-data';

type ReportPeriod = 'mes' | 'trimestre' | 'anio';

@Component({
  selector: 'app-gerente-reportes',
  templateUrl: './gerente-reportes.page.html',
  styleUrls: ['./gerente-reportes.page.scss'],
  imports: [DesktopTopbarComponent, IonIcon, IonBadge, IonProgressBar, IonToast],
})
export class GerenteReportesPage {
  readonly reportPeriod = signal<ReportPeriod>('mes');
  readonly reportMetricMode = signal<'ingresos' | 'puntualidad'>('ingresos');
  readonly toastMessage = signal<string | null>(null);

  readonly recentAlerts = GERENTE_RECENT_ALERTS;
  readonly routeLoads = GERENTE_ROUTE_LOADS;

  readonly activeReportBars = computed(() =>
    this.reportMetricMode() === 'ingresos' ? GERENTE_MONTHLY_BARS : GERENTE_PUNTUALIDAD_BARS,
  );
}
