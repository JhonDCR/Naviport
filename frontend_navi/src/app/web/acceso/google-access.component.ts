import { AfterViewInit, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { environment } from '../../../environments/environment';

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential?: string }) => void;
  }): void;
  renderButton(element: HTMLElement, options: {
    theme: 'outline';
    size: 'large';
    shape: 'pill';
    text: 'continue_with';
    width: number;
    locale: 'es';
  }): void;
}

interface GoogleChallenge {
  clientId: string;
  nonce: string;
}

let googleLibrary: Promise<GoogleIdentity> | undefined;

function loadGoogle(): Promise<GoogleIdentity> {
  googleLibrary ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      const identity = (window as Window & { google?: { accounts: { id: GoogleIdentity } } }).google?.accounts.id;
      if (identity) resolve(identity);
      else reject(new Error('Google Identity Services unavailable'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Google Identity Services unavailable'));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    googleLibrary = undefined;
    throw error;
  });
  return googleLibrary;
}

@Component({
  selector: 'app-google-access',
  template: `
    <div #googleHost [attr.inert]="busy() ? '' : null"></div>
    @if (!ready()) {
      <button class="google-placeholder" type="button" disabled>
        <img src="assets/web/google-g.png" width="18" height="18" alt="">
        <span>Continuar con Google</span>
      </button>
      <p aria-live="polite">{{ status() }}</p>
    }
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .google-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      min-height: 40px;
      padding-inline: 12px;
      border: 1px solid var(--access-line);
      border-radius: 99px;
      background: var(--navi-bg-app);
      color: var(--access-muted);
      font: inherit;
      font-size: var(--web-small);
    }
    .google-placeholder img {
      flex: none;
      background: var(--access-white);
      border-radius: 50%;
    }
    p {
      margin: 6px 0 0;
      color: var(--access-muted);
      font-size: var(--web-label);
    }
  `,
})
export class GoogleAccessComponent implements AfterViewInit {
  private readonly destroy = inject(DestroyRef);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('googleHost');

  readonly busy = input(false);
  readonly credential = output<string>();
  readonly ready = signal(false);
  readonly status = signal('Comprobando disponibilidad…');

  ngAfterViewInit(): void {
    void this.prepare();
  }

  private async prepare(): Promise<void> {
    try {
      const response = await fetch(`${environment.webApiBaseUrl}/auth/google/challenge`, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error('Google challenge unavailable');
      const { data } = (await response.json()) as { data: { enabled: GoogleChallenge | null } };
      if (this.destroy.destroyed) return;

      if (!data.enabled) {
        this.status.set('Google aún no está habilitado.');
        return;
      }

      const google = await loadGoogle();
      if (this.destroy.destroyed) return;
      const host = this.host().nativeElement;
      google.initialize({
        client_id: data.enabled.clientId,
        nonce: data.enabled.nonce,
        callback: ({ credential }) => {
          if (credential && !this.destroy.destroyed && !this.busy()) this.credential.emit(credential);
        },
      });
      google.renderButton(host, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: Math.min(400, Math.floor(host.getBoundingClientRect().width)),
        locale: 'es',
      });
      this.ready.set(true);
    } catch {
      if (!this.destroy.destroyed) this.status.set('Google no está disponible en este momento.');
    }
  }
}
