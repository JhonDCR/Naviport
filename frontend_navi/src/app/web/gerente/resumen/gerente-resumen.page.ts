import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { FLEET_SHIPS_MOCK } from '../../../shared/mock-data';
import { gerenteAlertsDemo, gerenteMonthlyDemo } from '../gerente-demostracion';
import { GerenteGraficaComponent } from '../grafica/gerente-grafica.component';

@Component({
  selector: 'app-gerente-resumen',
  templateUrl: './gerente-resumen.page.html',
  styleUrl: './gerente-resumen.page.scss',
  imports: [DecimalPipe, RouterLink, IonIcon, GerenteGraficaComponent],
})
export class GerenteResumenPage {
  readonly latestMonth = gerenteMonthlyDemo.at(-1)!;
  readonly trend = gerenteMonthlyDemo.slice(-6).map(({ label, tonnes }) => ({ label, value: tonnes }));
  readonly shipsAtSea = FLEET_SHIPS_MOCK.filter(({ status }) => status === 'EN RUTA').length;
  readonly alerts = gerenteAlertsDemo;
}
