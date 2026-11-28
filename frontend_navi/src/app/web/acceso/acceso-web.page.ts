import { Component, ElementRef, OnDestroy, afterRenderEffect, inject, input, output, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { boatOutline, chevronDown, closeOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, personOutline } from 'ionicons/icons';
import { environment } from '../../../environments/environment';
import { GoogleAccessComponent } from './google-access.component';
import { WebSessionService } from './web-session.service';

export type AccessMode = 'login' | 'registro';

@Component({
  selector: 'app-acceso-web',
  templateUrl: './acceso-web.page.html',
  styleUrl: './acceso-web.page.scss',
  imports: [GoogleAccessComponent, IonIcon, ReactiveFormsModule, RouterLink],
})
export class AccesoWebPage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly forms = inject(NonNullableFormBuilder);
  private readonly webSession = inject(WebSessionService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly formArea = viewChild<ElementRef<HTMLElement>>('formArea');
  private request?: AbortController;

  readonly mode = input<AccessMode | null>(null);
  readonly changeMode = output<AccessMode>();
  readonly closed = output<void>();
  readonly session = this.webSession.session;
  readonly form = this.forms.group({
    nombre: ['', [Validators.minLength(2), Validators.maxLength(120)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly notice = signal('');
  readonly icons = { boatOutline, chevronDown, closeOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, personOutline };

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;

      if (!this.mode()) {
        if (dialog.open) this.dismissForNavigation();
        return;
      }

      if (!dialog.open) dialog.showModal();
      this.formArea()?.nativeElement.scrollTo({ top: 0 });
      dialog.querySelector<HTMLInputElement>('input[autofocus]')?.focus({ preventScroll: true });
    });
  }

  selectMode(mode: AccessMode): void {
    this.message.set('');
    this.notice.set('');
    this.form.controls.password.reset();
    this.showPassword.set(false);
    this.form.markAsUntouched();
    this.changeMode.emit(mode);
  }

  ngOnDestroy(): void {
    this.request?.abort();
  }

  close(): void {
    this.dismissForNavigation();
    this.closed.emit();
  }

  dismissForNavigation(): void {
    this.dialog()?.nativeElement.close();
    this.request?.abort();
    this.form.reset();
    this.message.set('');
    this.notice.set('');
    this.showPassword.set(false);
  }

  async submit(): Promise<void> {
    const mode = this.mode();
    if (this.busy() || !mode) return;
    this.message.set('');
    this.notice.set('');

    const { correo: emailField, password: passwordField } = this.form.controls;
    emailField.setValue(emailField.value.trim());
    const { nombre, correo, password } = this.form.getRawValue();
    const missingName = mode === 'registro' && nombre.trim().length < 2;
    if (missingName || emailField.invalid || passwordField.invalid) {
      this.form.markAllAsTouched();
      const first = missingName ? 'name' : emailField.invalid ? 'email' : 'password';
      this.formArea()?.nativeElement.querySelector<HTMLInputElement>('#access-' + first)?.focus();
      return;
    }
    if (mode === 'registro' && new TextEncoder().encode(password).length > 72) {
      this.message.set('La contraseña es demasiado larga. Elige una más corta.');
      return;
    }
    const body: Record<string, string> = mode === 'registro'
      ? { nombre: nombre.trim(), correo, password }
      : { correo, password };
    await this.send(mode, body);
  }

  async signInWithGoogle(credential: string): Promise<void> {
    if (this.busy() || !this.mode()) return;
    this.message.set('');
    this.notice.set('');
    await this.send('google', { credential });
  }

  async signOut(): Promise<void> {
    this.message.set('');
    try {
      await this.webSession.signOut();
      this.notice.set('Cerraste tu sesión.');
    } catch {
      this.message.set('Tu sesión local se cerró. La API no respondió.');
    }
  }

  private async send(action: AccessMode | 'google', body: Record<string, string>): Promise<void> {
    const request = new AbortController();
    this.request = request;
    this.busy.set(true);

    try {
      const response = await fetch(`${environment.webApiBaseUrl}/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
      });
      request.signal.throwIfAborted();

      if (!response.ok) {
        this.message.set(this.errorMessage(action, response.status));
        return;
      }

      this.form.controls.password.reset();
      this.showPassword.set(false);
      if (action === 'registro') {
        this.notice.set('Cuenta creada. Ingresa con tu correo y contraseña.');
        this.changeMode.emit('login');
        return;
      }

      const { data } = await response.json() as { data: Parameters<WebSessionService['start']>[0] };
      if (!data?.accessToken || !data?.usuario?.rol) throw new Error('Invalid login response');
      if (request.signal.aborted) return;
      this.webSession.start(data);
      const role = data.usuario.rol;
      const destination = this.router.parseUrl(this.router.url).queryParamMap.get('destino') ?? '';
      const clientPage = /^\/portal-cliente(?:[/?#]|$)/.test(destination) ? destination : '/portal-cliente';
      const next = role === 'cliente' ? clientPage : role === 'gerente' ? '/gerente' : role === 'admin' ? '/admin' : null;
      if (next) {
        this.dismissForNavigation();
        await this.router.navigateByUrl(next, { replaceUrl: true });
      }
    } catch {
      if (!request.signal.aborted) {
        this.message.set('No pudimos conectar con NaviPort. Intenta de nuevo.');
      }
    } finally {
      this.request = undefined;
      this.busy.set(false);
    }
  }

  private errorMessage(action: AccessMode | 'google', status: number): string {
    if (status === 429) return 'Hubo demasiados intentos. Espera un momento y vuelve a probar.';
    if (status === 409) return 'Ese correo ya tiene una cuenta. Ingresa con su contraseña.';
    if (action === 'google' && status === 401) return 'No se pudo verificar Google. Cierra y vuelve a abrir el acceso para reintentar.';
    if (action === 'login' && (status === 401 || status === 403)) return 'Revisa tu correo y contraseña.';
    if (action === 'registro' && status === 400) return 'Revisa los datos del formulario.';
    return 'El servicio de acceso no está disponible. Intenta de nuevo.';
  }
}
