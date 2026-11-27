import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { arrowForward } from 'ionicons/icons';
import { WebFrameComponent } from './web-frame.component';

const guides = {
  'rutas-maritimas': {
    title: 'Rutas marítimas',
    intro: 'En NaviPort puedes seguir embarques hacia Guayaquil. Estos son los trayectos de ejemplo disponibles en el proyecto.',
    cards: [
      { title: 'Shanghái → Guayaquil', text: 'Embarques de ejemplo desde China. En el detalle del envío puedes consultar el buque y el último evento registrado.' },
      { title: 'Miami → Guayaquil', text: 'Embarques de ejemplo desde Estados Unidos. Revisa la fecha estimada de llegada en la ficha de tu contenedor.' },
    ],
    note: 'La fecha estimada puede cambiar durante el trayecto. Consulta el envío para ver la información más reciente.',
    next: { label: 'Ver mis envíos', path: '/portal-cliente/envios' },
  },
  'seguimiento-maritimo': {
    title: 'Seguimiento de embarques',
    intro: 'Consulta el avance de tu carga a partir de los eventos registrados durante el viaje.',
    cards: [
      { title: 'Encuentra tu contenedor', text: 'Busca por código de contenedor, nombre del buque, origen o destino. Puedes filtrar por estado.' },
      { title: 'Lee el historial', text: 'Abre un envío para ver qué ocurrió y cuándo. La ficha también muestra los datos de la carga y su llegada estimada cuando está disponible.' },
      { title: 'Revisa las novedades', text: 'El apartado de notificaciones reúne los avisos asociados a tus embarques.' },
    ],
    note: 'El último evento indica el avance registrado por el equipo de operación.',
    next: { label: 'Abrir mis envíos', path: '/portal-cliente/envios' },
  },
  'preparar-embarque': {
    title: 'Cómo preparar la carga',
    intro: 'Ten a mano estas medidas y datos antes de comparar equipos para un embarque.',
    cards: [
      { title: 'Mide la carga embalada', text: 'Toma el largo, el ancho y la altura incluyendo el palé o el embalaje. Anota el peso total y el número de piezas.' },
      { title: 'Comprueba la entrada', text: 'Compara el ancho y la altura de la puerta con la pieza más grande. Para elegir el equipo también importa el espacio interior.' },
      { title: 'Identifica necesidades especiales', text: 'Comparte si la mercancía requiere refrigeración o si alguna pieza tiene dimensiones fuera de lo habitual. Esos datos orientan la elección del equipo.' },
    ],
    note: 'Confirma las dimensiones y el peso admitido de la unidad asignada antes de cargarla.',
    next: { label: 'Comparar contenedores', path: '/contenedores' },
  },
  'operacion-de-flota': {
    title: 'Operación de flota',
    intro: 'Las herramientas de NaviPort reúnen los datos del viaje que usa cada equipo durante la operación.',
    cards: [
      { title: 'Operación', text: 'El equipo registra contenedores y reporta incidencias durante el turno.' },
      { title: 'Gerencia', text: 'El panel reúne indicadores, estados de la flota, alertas y reportes para revisar la operación.' },
      { title: 'Administración', text: 'El equipo mantiene los registros de buques, puertos, viajes y usuarios.' },
    ],
    note: 'NaviPort abre el espacio de trabajo correspondiente al rol de tu cuenta.',
    next: { label: 'Acceder a NaviPort', path: '/login' },
  },
};

@Component({
  selector: 'app-guia-web',
  imports: [WebFrameComponent, RouterLink, IonIcon],
  template: `
    <app-web-frame>
      <header class="reference-intro">
        <h1>{{ guide().title }}</h1>
        <p>{{ guide().intro }}</p>
      </header>
      <div class="reference-stack">
        <section class="reference-grid" [attr.aria-label]="guide().title">
          @for (card of guide().cards; track card.title) {
            <article class="reference-card guide-card">
              <h2>{{ card.title }}</h2>
              <p>{{ card.text }}</p>
            </article>
          }
        </section>
        <p class="reference-note">{{ guide().note }}</p>
        <div class="reference-actions">
          <a class="reference-button primary" [routerLink]="guide().next.path">
            {{ guide().next.label }} <ion-icon [icon]="arrow" aria-hidden="true"></ion-icon>
          </a>
        </div>
      </div>
    </app-web-frame>
  `,
})
export class GuiaPage {
  readonly seccion = input.required<keyof typeof guides>();
  readonly guide = computed(() => guides[this.seccion()]);
  readonly arrow = arrowForward;
}
