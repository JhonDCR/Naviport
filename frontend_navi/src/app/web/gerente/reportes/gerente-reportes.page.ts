import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { GERENTE_ROUTE_LOADS } from '../../../shared/mock-data';
import { gerenteMonthlyDemo } from '../gerente-demostracion';
import { GerenteGraficaComponent } from '../grafica/gerente-grafica.component';

@Component({
  selector: 'app-gerente-reportes',
  templateUrl: './gerente-reportes.page.html',
  styleUrl: './gerente-reportes.page.scss',
  imports: [DecimalPipe, IonIcon, GerenteGraficaComponent],
})
export class GerenteReportesPage {
  readonly periods = [
    { months: 3, label: 'Ago a oct 2026' },
    { months: 6, label: 'May a oct 2026' },
    { months: gerenteMonthlyDemo.length, label: 'Ene a oct 2026' },
  ];
  readonly metrics = [
    { key: 'tonnes', label: 'Carga movilizada', unit: 't' },
    { key: 'punctuality', label: 'Puntualidad', unit: '%' },
    { key: 'revenue', label: 'Ingresos', unit: 'USD' },
  ] as const;

  readonly period = signal(this.periods[1]);
  readonly metric = signal<(typeof this.metrics)[number]>(this.metrics[0]);
  readonly metricsByPeriod = computed(() => gerenteMonthlyDemo.slice(-this.period().months));
  readonly chart = computed(() => this.metricsByPeriod().map((row) => ({
    label: row.label,
    value: row[this.metric().key],
  })));
  readonly routeLoads = GERENTE_ROUTE_LOADS;

  downloadCsv(): void {
    const csv = [
      'Mes,Toneladas,Puntualidad (%),Ingresos (USD)',
      ...this.metricsByPeriod().map((row) => [row.label, row.tonnes, row.punctuality, row.revenue].join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `naviport-demo-${this.period().months}-meses-2026.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  printReport(): void {
    window.print();
  }
}
