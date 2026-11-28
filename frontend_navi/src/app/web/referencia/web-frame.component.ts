import { Component, ViewEncapsulation, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { WebHeaderComponent } from '../web-header.component';

@Component({
  selector: 'app-web-frame',
  template: `
    <ion-content class="reference" [class.web-public]="!portal()">
      <app-web-header [portal]="portal()" />
      <main class="reference-width reference-main" tabindex="-1">
        @if (portal()) {
          <nav class="reference-tabs" aria-label="Portal del cliente">
            <a routerLink="/portal-cliente" routerLinkActive="selected" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Resumen</a>
            <a routerLink="/portal-cliente/envios" routerLinkActive="selected">Mis envíos</a>
            <a routerLink="/portal-cliente/notificaciones" routerLinkActive="selected" ariaCurrentWhenActive="page">Notificaciones</a>
          </nav>
        }
        <ng-content />
      </main>
      <footer class="reference-width reference-footer">
        <a routerLink="/servicios">NaviPort · OceanTrack</a>
        <a routerLink="/privacidad">Privacidad</a>
      </footer>
    </ion-content>
  `,
  styleUrl: './web-frame.component.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [IonContent, RouterLink, RouterLinkActive, WebHeaderComponent],
})
export class WebFrameComponent {
  readonly portal = input(false);
}
