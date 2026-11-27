import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { filter } from 'rxjs';
import { MobileNavbarComponent } from '../../shared/components/mobile-navbar/mobile-navbar.component';

@Component({
  selector: 'app-cliente-shell',
  templateUrl: './cliente-shell.component.html',
  styleUrls: ['./cliente-shell.component.scss'],
  imports: [IonContent, RouterOutlet, MobileNavbarComponent],
})
export class ClienteShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUrl = signal(this.router.url);
  readonly isDetailView = computed(() => this.currentUrl().includes('/cliente/detalle/'));

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
