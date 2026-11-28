import { Component } from '@angular/core';
import { WebFrameComponent } from './web-frame.component';

@Component({
  selector: 'app-privacidad',
  imports: [WebFrameComponent],
  styleUrl: './privacidad.page.scss',
  template: `
    <app-web-frame>
      <header class="policy-intro">
        <span class="reference-tag">Prototipo académico</span>
        <h1>Aviso de privacidad</h1>
        <p>Qué datos usa NaviPort para darte acceso a tu cuenta, mostrar tus embarques y ayudarte durante las pruebas.</p>
      </header>
      <div class="policy-sections">
        <section aria-labelledby="policy-account">
          <h2 id="policy-account">Datos que se usan para acceder</h2>
          <dl class="reference-grid">
            <div class="reference-card">
              <dt>Registro con correo</dt>
              <dd>Se solicita tu nombre y correo. Al iniciar sesión, el servidor verifica tu contraseña con el resumen guardado durante el registro.</dd>
            </div>
            <div class="reference-card">
              <dt>Acceso con Google</dt>
              <dd>Cuando la opción está habilitada y la eliges, NaviPort verifica tu identidad y usa tu identificador de Google, nombre y correo verificado para asociar la cuenta.</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="policy-use">
          <h2 id="policy-use">Qué ocurre durante tu sesión</h2>
          <div class="reference-card">
            <ul>
              <li>Tu cuenta identifica los embarques y notificaciones que puedes consultar.</li>
              <li>Se registran eventos de acceso. El navegador conserva la sesión web en memoria mientras usas el sitio.</li>
              <li>Las cuentas y los datos de operación se guardan en el servidor del proyecto.</li>
            </ul>
          </div>
        </section>
        <section aria-labelledby="policy-contact">
          <h2 id="policy-contact">Consultas sobre tus datos</h2>
          <div class="reference-card">
            <p>Durante las pruebas, contacta al equipo por el canal que te facilitó el acceso. Puedes solicitar información, acceso, corrección o eliminación de los datos de tu cuenta.</p>
            <p class="reference-note">El responsable, su canal de contacto y los plazos de conservación deben definirse antes de usar NaviPort como servicio público.</p>
            <a href="https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/general/normativa/">Normativa ecuatoriana de protección de datos</a>
          </div>
        </section>
      </div>
    </app-web-frame>
  `,
})
export class PrivacidadPage {}
