# Plan de mejoras para la web de NaviPort

## Alcance

El trabajo cubre la portada pública, los paneles web de gerencia y administración, y un portal de seguimiento para el cliente en el navegador. Las vistas se diseñarán para escritorio y portátil, con adaptación a ventanas estrechas y zoom. El proyecto sigue usando Angular e Ionic y aprovecha la API construida por el equipo.

La bienvenida, el seguimiento móvil y las pantallas del operador quedan a cargo del compañero de la app híbrida. El código nuevo se concentra en `frontend_navi/src/app/web/`. Los cambios en rutas o componentes compartidos deben limitarse a lo necesario para la web y comprobarse también desde la app. La implementación empieza después de acordar el plan.

## Punto de partida

- **Portada pública.** `/servicios` ya presenta NaviPort, funciones y rutas de ejemplo. Su botón de acceso lleva al selector de roles de demostración.
- **Gerencia.** `/gerente` ya tiene resumen, flota y reportes. El resumen y los reportes usan datos de ejemplo. El selector de periodo cambia el estado de la página, mientras la serie visible depende de la métrica. El botón de exportar CSV muestra un aviso.
- **Administración.** `/admin` abre Buques y ya tiene enlaces directos a una vista general, Puertos, Viajes y Usuarios. Conviene medir qué usa primero el personal antes de cambiar esa entrada.
- **Cliente.** `/cliente` abre el flujo móvil. El portal de escritorio puede tomar sus conceptos de seguimiento, detalle e historial, con una ruta web propia propuesta en `/portal-cliente`.
- **API.** Ya hay consultas de indicadores, reportes, alertas, cargas y notificaciones. Para mostrar datos de una empresa se necesita acceso web autenticado con el rol correcto. [Contrato de la API](API_CONTRACT.md)

## Tareas en orden de trabajo

### 1. Prioridad alta · Medir recorridos y dibujar la navegación

- Recorrer la web actual y registrar cuántas acciones toma revisar un retraso, abrir reportes, encontrar un usuario y consultar una llegada. Para el cliente, usar el flujo móvil como referencia funcional y medir el tiempo del portal desde su primer prototipo.
- Dibujar en Figma una pantalla inicial y el recorrido principal de cada rol. Conservar los nombres que el equipo y los usuarios ya reconocen, como Buques, Viajes y Mis envíos.
- **Se acepta cuando** cada recorrido tiene punto de inicio, destino y conteo de acciones. Una prueba corta con compañeros usa objetivos concretos como «Encuentra cuándo llega este contenedor» y registra dudas y retrocesos. [Pruebas moderadas de GOV.UK](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing)

### 2. Prioridad alta · Definir el estilo web y su estructura común

- Partir del azul marítimo, el ámbar y la tipografía del equipo. Diseñar una barra superior y navegación de escritorio con una columna de contenido amplia, tablas fáciles de leer y un menú con el destino actual visible.
- Dar prioridad al contenido de la operación. Usar una acción principal por sección, encabezados que indiquen qué se puede hacer, cifras alineadas y estados con etiquetas como «En ruta» o «Retrasado». Reservar la ilustración para la portada y el color fuerte para acciones y alertas.
- Revisar cada propuesta en Figma con capturas de las vistas actuales al lado. Para que el diseño tenga una identidad propia, usar rutas, códigos de contenedor y estados de NaviPort. Quitar adornos, sombras o tarjetas repetidas cuando ocupen espacio que necesita la operación.
- **Se acepta cuando** hay un prototipo reutilizable de navegación, tabla, filtro, indicador y mensajes de estado. Se revisa a 1280 y 1440 píxeles, en una ventana más estrecha y con zoom al 200 %. Las acciones principales tienen foco visible y se pueden usar con teclado. [Sistema de diseño de NaviPort](DESIGN_SYSTEM.md) · [Navegación de GOV.UK](https://design-system.service.gov.uk/components/service-navigation/) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

### 3. Prioridad alta · Reducir clics para gerencia y administración

- Usar el resumen del gerente como punto de partida. Mostrar alertas activas con un enlace directo, y mantener Flota y Reportes en el menú. Si una alerta tiene un destino válido, abrir el viaje o registro correspondiente. En los demás casos, abrir la lista filtrada o el detalle disponible de la alerta.
- Usar el recorrido de administración para decidir si Buques sigue como entrada. Mantener Usuarios visible en el menú, añadir búsqueda en la propia lista y situar las acciones frecuentes junto a cada fila. Conservar la confirmación para cambios como suspender un usuario.
- Mantener filtros y búsqueda al volver desde un detalle si se puede compartir o recuperar ese estado mediante la URL.
- **Se acepta cuando** el gerente abre Reportes o la lista de alertas en un clic desde su resumen, y el administrador abre Usuarios en un clic desde su panel. Se cuentan las acciones a partir de la vista inicial del rol y se comparan con la tarea 1. El tiempo de búsqueda, los clics erróneos y los retrocesos sirven para detectar si un atajo realmente ayuda.

### 4. Prioridad alta · Simplificar indicadores y gráficas de gerencia

| Dato propuesto | Pregunta que responde | Presentación |
| --- | --- | --- |
| Puntualidad | ¿Qué proporción de viajes cumple el criterio acordado? | Porcentaje con periodo y definición |
| Toneladas transportadas | ¿Cuánta carga movemos y cómo evoluciona? | Total del periodo y una gráfica mensual como tendencia principal |
| Viajes en ruta | ¿Qué está en operación ahora? | Cifra con acceso al listado correspondiente, si existe |
| Incidentes pendientes | ¿Qué requiere atención? | Cifra y lista breve con acceso a alertas |

- Dejar en el resumen hasta cuatro indicadores, una gráfica principal y la lista de alertas. En Reportes, mostrar el desglose por ruta en barras horizontales si ayuda a comparar o en tabla si se necesitan cifras exactas. Mantener costes e ingresos en Reportes cuando el equipo confirme su utilidad.
- Revisar `GET /kpis/resumen` y `GET /kpis/reportes` antes de conectar los gráficos. La implementación actual usa valores de puntualidad de respaldo cuando faltan viajes y una serie de seis meses independiente del periodo del reporte. Acordar con backend la definición de puntualidad y cómo identificar una muestra vacía. Si la gráfica sigue mostrando seis meses, rotular ese rango por separado o confirmar que la API puede filtrarlo.
- Conectar filtros con datos y CSV con el periodo aplicado. Mostrar unidades, fechas, etiquetas y una tabla o resumen textual de la tendencia. Si el origen es de demostración, etiquetarlo. Si el indicador carece de observaciones, mostrar «Sin datos» cuando el contrato permita distinguir ese caso.
- **Se acepta cuando** una persona identifica la tendencia y los problemas pendientes sin depender del color ni de pasar el cursor. El periodo y los valores coinciden con la respuesta comprobada de la API, el CSV se descarga y las vistas de carga, vacío y error son verificables. [Anatomía de gráficas de IBM Carbon](https://www.carbondesignsystem.com/building-blocks/data-visualization/chart-anatomy)

### 5. Prioridad alta · Diseñar el portal web del cliente

- Probar un menú con tres destinos visibles, **Resumen**, **Mis envíos** y **Notificaciones**. Colocar **Mi cuenta** en la barra superior. Mantener el menú junto al contenido en pantallas amplias y agrupar las acciones secundarias dentro de la vista que las necesita.
- En **Resumen**, destacar la próxima llegada y los cambios recientes. En **Mis envíos**, mostrar búsqueda por código de contenedor, filtros de estado y una tabla con contenedor, ruta, estado, fecha estimada y enlace a detalle.
- En el detalle, usar el ancho disponible para mostrar datos del viaje e historial de eventos. Mantener un regreso a la lista con los filtros aplicados. Usar el vocabulario y los datos disponibles del trabajo móvil como referencia y diseñar las pantallas en `web/`.
- **Se acepta cuando** el cliente llega a Mis envíos en un clic desde su resumen y abre el detalle en otro clic tras localizar una fila. Puede encontrar la fecha estimada y el último evento sin recorrer pestañas innecesarias. [Tablas de GOV.UK](https://design-system.service.gov.uk/components/table/) · [Contrato de cargas y notificaciones](API_CONTRACT.md)

### 6. Prioridad media · Mejorar la portada pública y el acceso web

- Ajustar `/servicios` para que explique en el primer bloque el seguimiento de contenedores y muestre una acción principal de acceso. Mantener las rutas como ejemplos y explicar las funciones de cliente y empresa con lenguaje que un visitante pueda entender.
- Proponer una entrada web propia que lleve a un destino según el rol. Para usar datos reales, integrar el inicio de sesión existente y comprobar que el backend autoriza cada consulta. Mantener la entrada móvil actual y separar el acceso de demostración del acceso autenticado en la interfaz web.
- **Se acepta cuando** un visitante entiende qué ofrece NaviPort y encuentra el acceso desde la primera pantalla. Una sesión web aprobada llega al portal del cliente o al panel correspondiente y los fallos de acceso tienen mensajes claros.

### 7. Continua · Reducir código repetido y validar cada entrega

- Conservar los paneles del equipo como base. Comparar encabezados, tablas, cifras y estados repetidos en dos pantallas antes de extraer un componente web. Mantener los cálculos y la traducción de respuestas de la API en TypeScript y evitar duplicarlos en plantillas.
- Aplicar estilos dentro de `web/` o de componentes web. Antes de cambiar estilos globales o un componente compartido, comprobar qué pantallas móviles lo usan. Mantener la navegación por rol y las URLs actuales cuando sea posible.
- **Se acepta cuando** cada cambio tiene un propósito verificable, reduce duplicación observada o mejora un flujo, y pasa `npm run lint` y `npm run build` en `frontend_navi`. Revisar teclado, estados de carga y error, navegación atrás y una apertura rápida de la bienvenida móvil si hubo cambios compartidos. [Guía de estilo de Angular](https://angular.dev/style-guide)

## Cómo trabajar cada tarea con IA

1. Dar una sola tarea, su ruta inicial, la pantalla observada y el resultado esperado. Pedir primero que ubique los componentes existentes y enumere los archivos que necesita tocar.
2. Aprobar el flujo en Figma o en un boceto breve. Implementar una pantalla o recorrido por cambio, usando datos de ejemplo marcados mientras se valida el contrato de la API.
3. Pedir evidencia junto al resultado. Una captura en escritorio, una comprobación por teclado y, para navegación, el conteo antes y después. Revisar el cambio con un compañero antes de extender el patrón a otras vistas.

**Primera entrega propuesta.** Prototipo del resumen de gerencia y de la lista de Mis envíos, con el menú y los recorridos medidos. Empezar la implementación por el acceso del gerente a una alerta y la gráfica mensual de toneladas. Este cambio permite probar la navegación, el estilo y el manejo de datos antes de trasladar el patrón a las demás pantallas.
