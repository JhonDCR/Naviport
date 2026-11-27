import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-gerente-shell',
  templateUrl: './gerente-shell.component.html',
  styleUrl: './gerente-shell.component.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [IonContent, IonIcon, RouterLink, RouterLinkActive, RouterOutlet],
})
export class GerenteShellComponent {
  readonly navItems = [
    { label: 'Resumen', icon: 'home-outline', route: '/gerente/dashboard' },
    { label: 'Flota', icon: 'boat-outline', route: '/gerente/flota' },
    { label: 'Alertas', icon: 'notifications-outline', route: '/gerente/alertas' },
    { label: 'Reportes', icon: 'stats-chart-outline', route: '/gerente/reportes' },
  ];
}
