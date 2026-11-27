import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

interface WebAccount {
  nombre: string;
  correo: string;
  rol: string;
}

interface LoginResponse {
  accessToken: string;
  usuario: WebAccount;
}

@Injectable({ providedIn: 'root' })
export class WebSessionService {
  private readonly current = signal<LoginResponse | null>(null);

  readonly session = this.current.asReadonly();

  start(session: LoginResponse): void {
    this.current.set(session);
  }

  expire(token: string): boolean {
    if (this.current()?.accessToken !== token) return false;
    this.current.set(null);
    return true;
  }

  async signOut(): Promise<void> {
    const active = this.current();
    if (!active) return;

    this.current.set(null);
    const response = await fetch(`${environment.webApiBaseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${active.accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok && response.status !== 401) throw new Error('Logout failed');
  }
}
