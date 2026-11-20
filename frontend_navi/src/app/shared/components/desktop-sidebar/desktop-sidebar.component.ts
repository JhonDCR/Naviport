import { Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular';

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

  readonly brandSub = input<string>('NaviPort');
  readonly brandMain = input<string>('Tracker');
  readonly ariaLabel = input<string>('Menú lateral');
  readonly items = input.required<SidebarNavItem[]>();

  logout(): void {
    void this.router.navigateByUrl('/login');
  }
}
