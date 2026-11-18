import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'introduccion',
    loadComponent: () =>
      import('./pages/introduccion/introduccion.page').then((m) => m.IntroduccionPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cliente',
    loadComponent: () =>
      import('./pages/cliente/cliente-shell.component').then((m) => m.ClienteShellComponent),
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./pages/cliente/inicio/inicio-cliente.page').then((m) => m.InicioClientePage),
      },
      {
        path: 'seguimiento',
        loadComponent: () =>
          import('./pages/cliente/seguimiento/seguimiento.page').then((m) => m.SeguimientoPage),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./pages/cliente/detalle-pedido/detalle-pedido.page').then(
            (m) => m.DetallePedidoPage,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./pages/cliente/perfil/perfil-cliente.page').then((m) => m.PerfilClientePage),
      },
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'operador',
    loadComponent: () =>
      import('./pages/operador/operador-shell.component').then((m) => m.OperadorShellComponent),
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./pages/operador/inicio-empleado/inicio-empleado.page').then(
            (m) => m.InicioEmpleadoPage,
          ),
      },
      {
        path: 'escaner',
        loadComponent: () =>
          import('./pages/operador/scan-camara/scan-camara.page').then((m) => m.ScanCamaraPage),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./pages/operador/perfil-empleado/perfil-empleado.page').then(
            (m) => m.PerfilEmpleadoPage,
          ),
      },
      {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'gerente',
    loadComponent: () =>
      import('./pages/gerente/gerente-shell.component').then((m) => m.GerenteShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/gerente/resumen/gerente-resumen.page').then(
            (m) => m.GerenteResumenPage,
          ),
      },
      {
        path: 'flota',
        loadComponent: () =>
          import('./pages/gerente/flota/gerente-flota.page').then((m) => m.GerenteFlotaPage),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./pages/gerente/reportes/gerente-reportes.page').then(
            (m) => m.GerenteReportesPage,
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/admin/overview/admin-overview.page').then((m) => m.AdminOverviewPage),
      },
      {
        path: 'buques',
        loadComponent: () =>
          import('./pages/admin/buques/admin-buques.page').then((m) => m.AdminBuquesPage),
      },
      {
        path: 'puertos',
        loadComponent: () =>
          import('./pages/admin/puertos/admin-puertos.page').then((m) => m.AdminPuertosPage),
      },
      {
        path: 'viajes',
        loadComponent: () =>
          import('./pages/admin/viajes/admin-viajes.page').then((m) => m.AdminViajesPage),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/admin/usuarios/admin-usuarios.page').then((m) => m.AdminUsuariosPage),
      },
      {
        path: '',
        redirectTo: 'buques',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'home',
    redirectTo: 'introduccion',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'introduccion',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'introduccion',
  },
];
