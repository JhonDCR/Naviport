import { Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { WebSessionService } from '../../../web/acceso/web-session.service';

export interface SidebarNavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-desktop-sidebar',
  templateUrl: './desktop-sidebar.component.html',
  styleUrls: ['./desktop-sidebar.component.scss'],
  imports: [IonIcon, RouterLink, RouterLinkActive],
})
export class DesktopSidebarComponent {
  private readonly router = inject(Router);
  private readonly webSession = inject(WebSessionService);

  readonly brandSub = input<string>('NaviPort');
  readonly brandMain = input<string>('Tracker');
  readonly ariaLabel = input<string>('Menú lateral');
  readonly items = input.required<SidebarNavItem[]>();

  async logout(): Promise<void> {
    await this.webSession.signOut().catch(() => undefined);
    await this.router.navigateByUrl('/login');
  }
}
