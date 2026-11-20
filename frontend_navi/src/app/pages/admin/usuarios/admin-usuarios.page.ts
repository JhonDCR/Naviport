import { Component, signal } from '@angular/core';
import { IonBadge, IonToast, IonToggle } from '@ionic/angular';
import { ADMIN_USERS_MOCK } from '../../../shared/mock-data';

@Component({
  selector: 'app-admin-usuarios',
  templateUrl: './admin-usuarios.page.html',
  styleUrls: ['./admin-usuarios.page.scss'],
  imports: [IonBadge, IonToggle, IonToast],
})
export class AdminUsuariosPage {
  readonly users = signal(ADMIN_USERS_MOCK);
  readonly toastMessage = signal<string | null>(null);

  toggleUserActive(email: string): void {
    this.users.update((list) =>
      list.map((u) => (u.email === email ? { ...u, active: !u.active } : u)),
    );
    this.toastMessage.set(`Estado de sesión actualizado para ${email}.`);
  }
}
