import { Component, ViewEncapsulation, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { WebHeaderComponent } from '../web-header.component';

@Component({
  selector: 'app-web-frame',
  template: `
    <ion-content class="reference" [class.web-public]="!portal()" [class.client-portal]="portal()"
      [class.list-viewport]="portal() && listViewport()">
      @if (!portal()) { <app-web-header /> }
      <main class="reference-width reference-main" tabindex="-1">
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
  imports: [IonContent, RouterLink, WebHeaderComponent],
})
export class WebFrameComponent {
  readonly portal = input(false);
  readonly listViewport = input(false);
  private readonly viewport = viewChild.required(IonContent);

  getScrollElement(): Promise<HTMLElement> {
    return this.viewport().getScrollElement();
  }
}
