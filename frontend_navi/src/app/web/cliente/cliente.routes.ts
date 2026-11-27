import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { WebSessionService } from '../acceso/web-session.service';

const cliente: CanActivateFn = (_route, state) =>
  inject(WebSessionService).session()?.usuario.rol === 'cliente' ||
  inject(Router).createUrlTree(['/servicios'], {
    queryParams: { acceso: 'login', destino: state.url },
  });

const loadComponent = () => import('./cliente.page').then((m) => m.ClientePage);

export const clienteRoutes: Routes = [
  { path: '', pathMatch: 'full', title: 'NaviPort | Mi resumen', data: { seccion: 'resumen' }, canActivate: [cliente], loadComponent },
  { path: 'envios', title: 'NaviPort | Mis envíos', data: { seccion: 'envios' }, canActivate: [cliente], loadComponent },
  { path: 'envios/:id', title: 'NaviPort | Detalle del envío', data: { seccion: 'detalle' }, canActivate: [cliente], loadComponent },
  { path: 'notificaciones', title: 'NaviPort | Notificaciones', data: { seccion: 'notificaciones' }, canActivate: [cliente], loadComponent },
];
