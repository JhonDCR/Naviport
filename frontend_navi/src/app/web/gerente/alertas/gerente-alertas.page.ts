import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { gerenteAlertsDemo } from '../gerente-demostracion';

@Component({
  selector: 'app-gerente-alertas',
  templateUrl: './gerente-alertas.page.html',
  styleUrl: './gerente-alertas.page.scss',
  imports: [RouterLink],
})
export class GerenteAlertasPage {
  readonly codigo = input<string>();
  readonly type = signal('');
  readonly types = [...new Set(gerenteAlertsDemo.map(({ badge }) => badge))];
  readonly alerts = computed(() => gerenteAlertsDemo.filter(({ badge }) =>
    !this.type() || badge === this.type(),
  ));
}
