import { Component } from '@angular/core';
import { WebFrameComponent } from './web-frame.component';

@Component({
  selector: 'app-privacidad',
  imports: [WebFrameComponent],
  template: `
    <app-web-frame>
      <header class="reference-intro">
        <h1>Aviso de privacidad</h1>
        <p>Información sobre el uso de datos en el prototipo académico NaviPort.</p>
      </header>
      <div class="reference-stack reference-policy">
        <section class="reference-card">
          <h2>Datos de la cuenta</h2>
          <p>El registro solicita nombre y correo. Cuando eliges una contraseña, el servidor guarda un resumen criptográfico de la contraseña. Si utilizas Google cuando esté habilitado, NaviPort verifica la identidad y usa el identificador de Google, el nombre y el correo verificado para asociar la cuenta.</p>
        </section>
        <section class="reference-card">
          <h2>Para qué se usan</h2>
          <p>Se utilizan para abrir y cerrar sesiones, mostrar el seguimiento y las notificaciones asociadas a la cuenta, y registrar eventos de acceso. La sesión web se mantiene en memoria mientras usas el sitio. El servidor usa MongoDB para las cuentas y los datos de operación, y Redis para las sesiones.</p>
        </section>
        <section class="reference-card">
          <h2>Consultas y derechos</h2>
          <p>Durante las pruebas, dirige tus consultas al equipo del proyecto por el canal que te facilitó el acceso. Allí puedes solicitar información, acceso, corrección o eliminación de los datos de tu cuenta.</p>
          <p class="reference-muted">El responsable, su canal de contacto y los plazos de conservación deben definirse antes de usar NaviPort como servicio público.</p>
          <a href="https://www.spdp.gob.ec/docs/proteccion-de-datos-personales/general/normativa/">Normativa ecuatoriana de protección de datos</a>
        </section>
      </div>
    </app-web-frame>
  `,
})
export class PrivacidadPage {}
