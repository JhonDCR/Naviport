import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
} from '@ionic/angular';
import { UserRole } from '../shared/mock-data';

interface RoleOption {
  role: UserRole;
  label: string;
  subtitle: string;
  email: string;
  route: string;
  icon: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'cliente',
    label: 'Cliente',
    subtitle: 'Gary Industries · Seguimiento',
    email: 'garyin@gmail.com',
    route: '/cliente/inicio',
    icon: 'cube-outline',
  },
  {
    role: 'operador',
    label: 'Operador',
    subtitle: 'Gary Barreiro · Escáner IA',
    email: 'garyba@gmail.com',
    route: '/operador/inicio',
    icon: 'scan-outline',
  },
  {
    role: 'gerente',
    label: 'Gerente',
    subtitle: 'Dashboard · Flota · Reportes',
    email: 'gerente@naviport.ec',
    route: '/gerente',
    icon: 'stats-chart-outline',
  },
  {
    role: 'admin',
    label: 'Admin',
    subtitle: 'Buques · Puertos · Usuarios',
    email: 'admin@naviport.ec',
    route: '/admin',
    icon: 'shield-checkmark-outline',
  },
];

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [FormsModule, IonContent, IonCard, IonCardContent, IonInput, IonButton, IonIcon],
})
export class LoginPage {
  private readonly router = inject(Router);

  readonly roleOptions = ROLE_OPTIONS;
  readonly selectedRole = signal<UserRole>('cliente');
  readonly activeRoleConfig = computed(
    () => this.roleOptions.find((item) => item.role === this.selectedRole()) ?? this.roleOptions[0],
  );

  email = this.activeRoleConfig().email;
  password = '••••••••••';

  selectRole(option: RoleOption): void {
    this.selectedRole.set(option.role);
    this.email = option.email;
  }

  login(): void {
    void this.router.navigateByUrl(this.activeRoleConfig().route);
  }

  goDirect(route: string): void {
    void this.router.navigateByUrl(route);
  }

  backToIntro(): void {
    void this.router.navigateByUrl('/introduccion');
  }
}
