import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import {
  arrowForward, boatOutline, chevronDown, clipboardOutline, cubeOutline, locateOutline,
  mapOutline, notificationsOutline, settingsOutline, statsChartOutline,
} from 'ionicons/icons';
import { WebFrameComponent } from './web-frame.component';

const guides = {
  'rutas-maritimas': {
    title: 'Rutas marítimas',
    intro: 'Conoce los trayectos de ejemplo de NaviPort hacia Guayaquil y dónde consultar el avance de tu propio embarque.',
    highlight: { icon: mapOutline, title: 'Puerto de llegada', text: 'Puerto Marítimo de Guayaquil, Ecuador.' },
    section: 'Dos orígenes, un destino',
    cards: [
      { title: 'Shanghái', label: 'China', text: 'La salida del trayecto de ejemplo se registra en la terminal Yangshan.', icon: mapOutline },
      { title: 'Miami', label: 'Estados Unidos', text: 'La salida del trayecto de ejemplo se registra en PortMiami Terminal.', icon: mapOutline },
    ],
    example: {
      title: 'Qué revisar durante el trayecto',
      items: [
        { title: 'Antes de la salida', text: 'Confirma que el puerto de origen y el código del contenedor coincidan con los datos de tu envío.' },
        { title: 'Durante el viaje', text: 'Abre el historial y revisa la fecha y la ubicación del último evento registrado.' },
        { title: 'Al acercarse a Guayaquil', text: 'Consulta si cambió la llegada estimada y si hay un aviso asociado al embarque.' },
      ],
    },
    questions: [
      { title: '¿Estas rutas tienen un horario fijo?', text: 'Son referencias del proyecto. Para conocer una fecha de llegada, abre la ficha del embarque asociado a tu cuenta.' },
      { title: '¿Puedo encontrar el envío si solo conozco el puerto?', text: 'Sí. En Mis envíos puedes buscar por puerto de origen o destino y combinar la búsqueda con el filtro de estado.' },
    ],
    action: { label: 'Ver mis envíos', path: '/portal-cliente/envios' },
    next: { label: 'Aprende a leer el seguimiento', path: '/seguimiento-maritimo' },
  },
  'seguimiento-maritimo': {
    title: 'Seguimiento de embarques',
    intro: 'Encuentra tu contenedor, interpreta el último evento y revisa la fecha estimada de llegada desde el portal del cliente.',
    highlight: { icon: locateOutline, title: 'Fecha estimada y último evento', text: 'La llegada indica cuándo se prevé que arribe el buque. El historial muestra los movimientos que ya quedaron registrados.' },
    section: 'Cómo consultar un envío',
    cards: [
      { title: 'Encuentra tu contenedor', label: 'Buscar', text: 'En Mis envíos puedes escribir el código de contenedor, el nombre del buque o un puerto. Usa el filtro de estado si aparecen varios resultados.', icon: cubeOutline },
      { title: 'Abre el historial', label: 'Consultar', text: 'Entra por el código del contenedor. Cada evento muestra su estado y, cuando están disponibles, ubicación, descripción y hora.', icon: locateOutline },
      { title: 'Revisa los avisos', label: 'Dar seguimiento', text: 'En Notificaciones puedes revisar avisos nuevos y marcar como leídos los que ya atendiste.', icon: notificationsOutline },
    ],
    example: {
      title: 'Cómo leer una ficha de ejemplo',
      items: [
        { title: 'Estado · En ruta', text: 'Describe la situación del viaje. Consulta el historial para saber qué movimiento se registró y cuándo.' },
        { title: 'Evento · Embarque registrado', text: 'Describe una acción concreta. Usa su fecha y ubicación para ordenar los avisos si hubo varias actualizaciones.' },
        { title: 'Llegada · Por confirmar', text: 'La ficha aún no tiene una fecha estimada disponible. Puedes volver al detalle más adelante para revisar si cambió.' },
      ],
    },
    questions: [
      { title: '¿Qué significa un evento pendiente?', text: 'Busca la etiqueta de cada movimiento en el historial. Si aparece Pendiente, el evento aún no figura como completado.' },
      { title: '¿Por qué no aparece mi contenedor?', text: 'Revisa el código, limpia los filtros y comprueba que hayas iniciado sesión con la cuenta asociada a ese embarque.' },
    ],
    action: { label: 'Abrir mis envíos', path: '/portal-cliente/envios' },
    next: { label: 'Consultar las rutas del proyecto', path: '/rutas-maritimas' },
  },
  'preparar-embarque': {
    title: 'Cómo preparar la carga',
    intro: 'Reúne las medidas del embalaje y los requisitos de tu mercancía para comparar los equipos con los datos correctos.',
    highlight: { icon: clipboardOutline, title: 'Empieza por la puerta', text: 'La abertura puede ser más pequeña que el espacio interior. Compara su ancho y alto con los de la pieza embalada más grande.' },
    section: 'Antes de elegir el equipo',
    cards: [
      { title: 'Mide el bulto más grande', label: 'Embalaje', text: 'Anota largo, ancho y alto con el palé o embalaje incluido. Registra también cuántas piezas llevas y el peso total.', icon: clipboardOutline },
      { title: 'Comprueba cómo entrará', label: 'Acceso', text: 'Compara la anchura y altura de la puerta con el bulto. Revisa luego el espacio interior para distribuir el resto de las piezas.', icon: cubeOutline },
      { title: 'Señala las necesidades especiales', label: 'Tipo de carga', text: 'Indica si la mercancía requiere refrigeración o si su forma impide introducirla por una puerta convencional.', icon: settingsOutline },
    ],
    example: {
      title: 'Datos para confirmar con el operador',
      items: [
        { title: 'Medidas y peso', text: 'Dimensiones del bulto mayor, peso total y número de piezas, con las unidades anotadas.' },
        { title: 'Forma de carga y manipulación', text: 'Por dónde debe entrar la mercancía y si necesita algún equipo para moverla.' },
        { title: 'Unidad asignada', text: 'Medidas efectivas de acceso e interior, peso admitido y condiciones especiales de esa unidad.' },
      ],
    },
    questions: [
      { title: '¿Qué pasa si el bulto cabe dentro pero no pasa por la puerta?', text: 'Consulta cómo se cargará la pieza antes de confirmar el equipo. El catálogo incluye opciones con acceso superior o abierto para comparar.' },
      { title: '¿Cómo comparo mis medidas si están en centímetros?', text: 'Multiplica cada medida por 10 para pasarla a milímetros. Por ejemplo, 235 cm equivalen a 2 350 mm.' },
    ],
    action: { label: 'Comparar contenedores', path: '/contenedores' },
    next: { label: 'Ver cómo se consulta un envío', path: '/seguimiento-maritimo' },
  },
  'operacion-de-flota': {
    title: 'Operación de flota',
    intro: 'Conoce dónde se registra un movimiento, dónde se consulta una alerta y quién mantiene los datos del viaje.',
    highlight: { icon: boatOutline, title: 'Tu rol define el panel', text: 'Cada cuenta accede a las herramientas que corresponden a su trabajo en la operación.' },
    section: 'Qué hace cada equipo',
    cards: [
      { title: 'Operación', label: 'App del equipo', text: 'El personal registra contenedores y reporta incidencias durante su turno desde la aplicación móvil.', icon: clipboardOutline },
      { title: 'Gerencia', label: 'Panel web', text: 'Revisa el resumen de operación, el estado de la flota, las alertas y los reportes por periodo.', icon: statsChartOutline },
      { title: 'Administración', label: 'Panel web', text: 'Mantiene los registros de buques, puertos, viajes y usuarios que usa la operación.', icon: settingsOutline },
    ],
    example: {
      title: 'Ejemplo · Revisar un viaje con retraso',
      items: [
        { title: 'Detectar qué ocurre', text: 'Desde Gerencia, revisa las alertas para identificar el viaje o la novedad que requiere atención.' },
        { title: 'Consultar el contexto', text: 'En Flota puedes revisar el buque. En Reportes, usa el periodo que corresponda si necesitas ver el conjunto de la operación.' },
        { title: 'Encontrar el registro', text: 'Si hace falta revisar los datos del viaje, el equipo autorizado puede buscarlos en Administración.' },
      ],
    },
    questions: [
      { title: '¿Dónde veo mis contenedores como cliente?', text: 'En el portal web, abre Mis envíos. Allí verás los embarques asociados a tu cuenta.' },
      { title: '¿Qué datos ayudan a identificar una incidencia?', text: 'Incluye el código del contenedor cuando lo tengas, el lugar y una descripción breve de lo ocurrido.' },
    ],
    action: { label: 'Acceder a NaviPort', path: '/login' },
    next: { label: 'Conoce el seguimiento para clientes', path: '/seguimiento-maritimo' },
  },
};

@Component({
  selector: 'app-guia-web',
  imports: [WebFrameComponent, RouterLink, IonIcon],
  templateUrl: './guia.page.html',
  styleUrl: './guia.page.scss',
})
export class GuiaPage {
  readonly seccion = input.required<keyof typeof guides>();
  readonly guide = computed(() => guides[this.seccion()]);
  readonly icons = { arrowForward, chevronDown };
}
