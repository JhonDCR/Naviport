import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBadge, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-admin-overview',
  templateUrl: './admin-overview.page.html',
  styleUrls: ['./admin-overview.page.scss'],
  imports: [IonIcon, IonBadge, RouterLink],
})
export class AdminOverviewPage {
  readonly modules = [
    {
      title: 'Gestión de Buques',
      detail: '45 embarcaciones registradas · 38 activas en ruta',
      badge: 'OPERATIVO',
      tone: 'badge-ok',
      route: '/admin/buques',
      icon: 'boat-outline',
    },
    {
      title: 'Gestión de Puertos',
      detail: 'Shanghai (CNSHA), Miami (USMIA) y Guayaquil (ECGYE)',
      badge: '3 PUERTOS',
      tone: 'badge-puerto',
      route: '/admin/puertos',
      icon: 'location-outline',
    },
    {
      title: 'Programar Viajes',
      detail: 'Ventanas de zarpe y arribo coordinadas con operadores',
      badge: 'EN CURSO',
      tone: 'badge-ruta-soft',
      route: '/admin/viajes',
      icon: 'compass-outline',
    },
    {
      title: 'Usuarios y Roles',
      detail: 'Control de sesiones activas en Redis (cliente, operador, gerente)',
      badge: 'RBAC',
      tone: 'badge-mantenimiento',
      route: '/admin/usuarios',
      icon: 'people-outline',
    },
  ];
}
