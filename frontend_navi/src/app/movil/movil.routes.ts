import { Routes } from '@angular/router';

export const movilRoutes: Routes = [
  {
    path: 'introduccion',
    loadComponent: () =>
      import('./introduccion/introduccion.page').then((m) => m.IntroduccionPage),
  },
  {
    path: 'login',
    loadComponent: () => import('../login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cliente',
    loadComponent: () =>
      import('./cliente/cliente-shell.component').then((m) => m.ClienteShellComponent),
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./cliente/inicio/inicio-cliente.page').then((m) => m.InicioClientePage),
      },
      {
        path: 'seguimiento',
        loadComponent: () =>
          import('./cliente/seguimiento/seguimiento.page').then((m) => m.SeguimientoPage),
      },
      {
        path: 'detalle/:id',
        loadComponent: () =>
          import('./cliente/detalle-pedido/detalle-pedido.page').then(
            (m) => m.DetallePedidoPage,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./cliente/perfil/perfil-cliente.page').then((m) => m.PerfilClientePage),
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
      import('./operador/operador-shell.component').then((m) => m.OperadorShellComponent),
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./operador/inicio-empleado/inicio-empleado.page').then(
            (m) => m.InicioEmpleadoPage,
          ),
      },
      {
        path: 'escaner',
        loadComponent: () =>
          import('./operador/scan-camara/scan-camara.page').then((m) => m.ScanCamaraPage),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./operador/perfil-empleado/perfil-empleado.page').then(
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
];
