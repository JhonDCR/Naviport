import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { arrowForward, clipboardOutline, cubeOutline, locateOutline } from 'ionicons/icons';
import { AccesoWebPage } from '../acceso/acceso-web.page';
import type { AccessMode } from '../acceso/acceso-web.page';
import { WebHeaderComponent } from '../web-header.component';

@Component({
  selector: 'app-servicios',
  templateUrl: './servicios.page.html',
  styleUrl: './servicios.page.scss',
  imports: [AccesoWebPage, IonContent, IonIcon, RouterLink, WebHeaderComponent],
})
export class ServiciosPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  private readonly access = viewChild<{ dismissForNavigation(): void }>('access');
  readonly icons = { arrowForward, clipboardOutline, cubeOutline, locateOutline };
  readonly accessMode = computed<AccessMode | null>(() => {
    const mode = this.query().get('acceso');
    return mode === 'login' || mode === 'registro' ? mode : null;
  });

  ionViewWillLeave(): void {
    this.access()?.dismissForNavigation();
  }

  setAccessMode(mode: AccessMode | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: mode ? { acceso: mode } : { acceso: null, destino: null },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }
}
