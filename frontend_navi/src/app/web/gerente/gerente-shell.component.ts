import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonContent } from '@ionic/angular';
import {
  DesktopSidebarComponent,
  SidebarNavItem,
} from '../../shared/components/desktop-sidebar/desktop-sidebar.component';

@Component({
  selector: 'app-gerente-shell',
  templateUrl: './gerente-shell.component.html',
  styleUrls: ['./gerente-shell.component.scss'],
  imports: [IonContent, RouterOutlet, DesktopSidebarComponent],
})
export class GerenteShellComponent {
  readonly navItems: SidebarNavItem[] = [
    { label: 'Dashboard', icon: 'stats-chart-outline', route: '/gerente/dashboard' },
    { label: 'Gestión de Flota', icon: 'boat-outline', route: '/gerente/flota' },
    { label: 'Reportes y analíticas', icon: 'trending-up-outline', route: '/gerente/reportes' },
  ];
}
