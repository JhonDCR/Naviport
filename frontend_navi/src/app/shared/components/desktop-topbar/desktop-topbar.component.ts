import { Component, input } from '@angular/core';

@Component({
  selector: 'app-desktop-topbar',
  templateUrl: './desktop-topbar.component.html',
  styleUrls: ['./desktop-topbar.component.scss'],
})
export class DesktopTopbarComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly userName = input<string>('Gary Barreiro');
  readonly userRole = input<string>('Gerente General');
  readonly avatarLetter = input<string>('G');
}
