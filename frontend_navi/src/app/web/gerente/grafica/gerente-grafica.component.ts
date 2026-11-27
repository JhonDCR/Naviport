import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

export interface GerenteChartPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-gerente-grafica',
  templateUrl: './gerente-grafica.component.html',
  styleUrl: './gerente-grafica.component.scss',
  imports: [DecimalPipe],
})
export class GerenteGraficaComponent {
  readonly points = input.required<readonly GerenteChartPoint[]>();
  readonly unit = input.required<'t' | '%' | 'USD'>();
  readonly maximum = computed(() =>
    this.unit() === '%' ? 100 : Math.max(1, ...this.points().map(({ value }) => value)),
  );

  private readonly compactNumber = new Intl.NumberFormat('es-EC', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  labelFor(value: number): string {
    return this.unit() === '%' ? `${value}%` : this.compactNumber.format(value);
  }
}
