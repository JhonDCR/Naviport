import { Component } from '@angular/core';
import { IonBadge, IonIcon, IonProgressBar } from '@ionic/angular';
import { DesktopTopbarComponent } from '../../../shared/components/desktop-topbar/desktop-topbar.component';
import { GERENTE_MONTHLY_BARS, GERENTE_RECENT_ALERTS } from '../../../shared/mock-data';

@Component({
  selector: 'app-gerente-resumen',
  templateUrl: './gerente-resumen.page.html',
  styleUrls: ['./gerente-resumen.page.scss'],
  imports: [DesktopTopbarComponent, IonIcon, IonProgressBar, IonBadge],
})
export class GerenteResumenPage {
  readonly monthlyBars = GERENTE_MONTHLY_BARS;
  readonly recentAlerts = GERENTE_RECENT_ALERTS;
}
