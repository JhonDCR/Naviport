import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'servicios',
    title: 'NaviPort | Seguimiento de embarques',
    loadComponent: () => import('./web/servicios/servicios.page').then((m) => m.ServiciosPage),
  },
  {
    path: 'introduccion',
    loadComponent: () =>
      import('./movil/introduccion/introduccion.page').then((m) => m.IntroduccionPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cliente',
    loadComponent: () =>
      import('./movil/cliente/cliente-shell.component').then((m) => m.ClienteShellComponent),
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./movil/cliente/inicio/inicio-cliente.page').then((m) => m.InicioClientePage),
      },
      {
        path: 'seguimiento',
        loadComponent: () =>
          import('./movil/cliente/seguimiento/seguimiento.page').then((m) => m.SeguimientoPage),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./movil/cliente/detalle-pedido/detalle-pedido.page').then(
            (m) => m.DetallePedidoPage,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./movil/cliente/perfil/perfil-cliente.page').then((m) => m.PerfilClientePage),
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
      import('./movil/operador/operador-shell.component').then((m) => m.OperadorShellComponent),
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./movil/operador/inicio-empleado/inicio-empleado.page').then(
            (m) => m.InicioEmpleadoPage,
          ),
      },
      {
        path: 'escaner',
        loadComponent: () =>
          import('./movil/operador/scan-camara/scan-camara.page').then((m) => m.ScanCamaraPage),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./movil/operador/perfil-empleado/perfil-empleado.page').then(
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
      import('./web/gerente/gerente-shell.component').then((m) => m.GerenteShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./web/gerente/resumen/gerente-resumen.page').then(
            (m) => m.GerenteResumenPage,
          ),
      },
      {
        path: 'flota',
        loadComponent: () =>
          import('./web/gerente/flota/gerente-flota.page').then((m) => m.GerenteFlotaPage),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./web/gerente/reportes/gerente-reportes.page').then(
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
      import('./web/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: 'overview',
        loadComponent: () =>
          import('./web/admin/overview/admin-overview.page').then((m) => m.AdminOverviewPage),
      },
      {
        path: 'buques',
        loadComponent: () =>
          import('./web/admin/buques/admin-buques.page').then((m) => m.AdminBuquesPage),
      },
      {
        path: 'puertos',
        loadComponent: () =>
          import('./web/admin/puertos/admin-puertos.page').then((m) => m.AdminPuertosPage),
      },
      {
        path: 'viajes',
        loadComponent: () =>
          import('./web/admin/viajes/admin-viajes.page').then((m) => m.AdminViajesPage),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./web/admin/usuarios/admin-usuarios.page').then((m) => m.AdminUsuariosPage),
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
