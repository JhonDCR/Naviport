import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { filter } from 'rxjs';
import {
  DesktopSidebarComponent,
  SidebarNavItem,
} from '../../shared/components/desktop-sidebar/desktop-sidebar.component';
import { DesktopTopbarComponent } from '../../shared/components/desktop-topbar/desktop-topbar.component';

interface AdminHeaderMeta {
  title: string;
  subtitle: string;
}

const ADMIN_HEADER_MAP: Record<string, AdminHeaderMeta> = {
  overview: {
    title: 'Vista General',
    subtitle: 'Resumen operativo del panel de administración',
  },
  buques: {
    title: 'Directorio de Buques',
    subtitle: 'Administra la flota y capacidades',
  },
  puertos: {
    title: 'Gestión de Puertos',
    subtitle: 'Terminales origen y destino habilitados en OceanTrack',
  },
  viajes: {
    title: 'Programar Viajes',
    subtitle: 'Rutas marítimas, capitanes y ventanas de arribo',
  },
  usuarios: {
    title: 'Usuarios y Roles',
    subtitle: 'Control de acceso y revocación inmediata de sesiones',
  },
};

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss'],
  imports: [
    IonContent,
    IonIcon,
    RouterOutlet,
    DesktopSidebarComponent,
    DesktopTopbarComponent,
  ],
})
export class AdminShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems: SidebarNavItem[] = [
    { label: 'Vista General', icon: 'stats-chart-outline', route: '/admin/overview' },
    { label: 'Gestión de Buques', icon: 'boat-outline', route: '/admin/buques' },
    { label: 'Gestión de Puertos', icon: 'location-outline', route: '/admin/puertos' },
    { label: 'Programar Viajes', icon: 'compass-outline', route: '/admin/viajes' },
    { label: 'Usuarios y Roles', icon: 'people-outline', route: '/admin/usuarios' },
  ];

  readonly currentUrl = signal(this.router.url);

  readonly headerMeta = computed(() => {
    const url = this.currentUrl();
    const match = Object.keys(ADMIN_HEADER_MAP).find((key) => url.includes(`/admin/${key}`));
    return ADMIN_HEADER_MAP[match ?? 'buques'];
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }
}
