import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-mobile-header',
  templateUrl: './mobile-header.component.html',
  styleUrls: ['./mobile-header.component.scss'],
  imports: [IonIcon],
})
export class MobileHeaderComponent {
  readonly avatarLetter = input<string>('G');
  readonly avatarImage = input<string | null>(null);
  readonly subtitle = input<string>('Bienvenido de nuevo');
  readonly title = input<string>('Hola, Gary Industries');
  readonly showUnreadDot = input<boolean>(true);
  readonly shiftMode = input<boolean>(false);
  readonly shiftActive = input<boolean>(true);

  readonly bellClick = output<void>();
  readonly shiftToggle = output<void>();
}
