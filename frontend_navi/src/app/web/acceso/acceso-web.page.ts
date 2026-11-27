import { Component, ElementRef, OnDestroy, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { boatOutline, closeOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, personOutline } from 'ionicons/icons';
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
  private readonly route = inject(ActivatedRoute);
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
  readonly icons = { boatOutline, closeOutline, eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, personOutline };

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      const mode = this.mode();
      if (!dialog) return;

      if (mode && !dialog.open) dialog.showModal();
      if (!mode && dialog.open) dialog.close();
    });
  }

  selectMode(mode: AccessMode): void {
    this.message.set('');
    this.notice.set('');
    this.form.controls.password.reset();
    this.showPassword.set(false);
    this.form.markAsUntouched();
    this.formArea()?.nativeElement.scrollTo({ top: 0 });
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

    const { nombre, correo, password } = this.form.getRawValue();
    if (this.form.invalid || (mode === 'registro' && nombre.trim().length < 2)) {
      this.form.markAllAsTouched();
      return;
    }
    if (mode === 'registro' && new TextEncoder().encode(password).length > 72) {
      this.message.set('Elige una contraseña más corta. El máximo es de 72 bytes.');
      return;
    }
    const body: Record<string, string> = mode === 'registro'
      ? { nombre: nombre.trim(), correo: correo.trim(), password }
      : { correo: correo.trim(), password };
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
      const destination = this.route.snapshot.queryParamMap.get('destino') ?? '';
      const clientPage = /^\/portal-cliente(?:[/?#]|$)/.test(destination) ? destination : '/portal-cliente';
      const next = role === 'cliente' ? clientPage : role === 'gerente' ? '/gerente' : role === 'admin' ? '/admin' : null;
      if (next) {
        this.dismissForNavigation();
        await this.router.navigateByUrl(next, { replaceUrl: true });
      }
    } catch {
      if (!request.signal.aborted) {
        this.message.set('No pudimos conectar con la API. Intenta de nuevo.');
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
