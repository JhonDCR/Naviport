import { Routes } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { movilRoutes } from './movil/movil.routes';

export const isNative = Capacitor.isNativePlatform();
const redirectToStart = isNative ? '/introduccion' : '/servicios';

async function withNaviIcons<T>(view: Promise<T>): Promise<T> {
  const [result, { registerNaviIcons }] = await Promise.all([view, import('./shared/icons')]);
  registerNaviIcons();
  return result;
}

const accessRoutes: Routes = isNative
  ? movilRoutes
  : [
      {
        path: 'login',
        redirectTo: '/servicios?acceso=login',
        pathMatch: 'full',
      },
    ];

export const routes: Routes = [
  {
    path: 'servicios',
    title: 'NaviPort | Seguimiento de embarques',
    loadComponent: () => import('./web/servicios/servicios.page').then((m) => m.ServiciosPage),
  },
  ...accessRoutes,
  ...(!isNative ? [
    ...[
      ['rutas-maritimas', 'Rutas marítimas'],
      ['seguimiento-maritimo', 'Seguimiento de embarques'],
      ['preparar-embarque', 'Cómo preparar la carga'],
      ['operacion-de-flota', 'Operación de flota'],
    ].map(([path, title]) => ({
      path,
      title: `NaviPort | ${title}`,
      data: { seccion: path },
      loadComponent: () => import('./web/referencia/guia.page').then((m) => m.GuiaPage),
    })),
    {
      path: 'contenedores',
      title: 'NaviPort | Contenedores y dimensiones',
      loadComponent: () => import('./web/referencia/contenedores.page').then((m) => m.ContenedoresPage),
    },
    {
      path: 'privacidad',
      title: 'NaviPort | Aviso de privacidad',
      loadComponent: () => import('./web/referencia/privacidad.page').then((m) => m.PrivacidadPage),
    },
    {
      path: 'portal-cliente',
      loadChildren: () => import('./web/cliente/cliente.routes').then((m) => m.clienteRoutes),
    },
  ] : []),
  {
    path: 'gerente',
    loadComponent: () =>
      withNaviIcons(import('./web/gerente/gerente-shell.component').then((m) => m.GerenteShellComponent)),
    children: [
      {
        path: 'dashboard',
        title: 'NaviPort | Resumen de gerencia',
        loadComponent: () =>
          import('./web/gerente/resumen/gerente-resumen.page').then(
            (m) => m.GerenteResumenPage,
          ),
      },
      {
        path: 'flota',
        title: 'NaviPort | Flota',
        loadComponent: () =>
          import('./web/gerente/flota/gerente-flota.page').then((m) => m.GerenteFlotaPage),
      },
      {
        path: 'alertas',
        title: 'NaviPort | Alertas',
        loadComponent: () =>
          import('./web/gerente/alertas/gerente-alertas.page').then((m) => m.GerenteAlertasPage),
      },
      {
        path: 'reportes',
        title: 'NaviPort | Reportes',
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
      withNaviIcons(import('./web/admin/admin-shell.component').then((m) => m.AdminShellComponent)),
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
    redirectTo: redirectToStart,
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: redirectToStart,
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: redirectToStart,
  },
];
