# Guía de Diseño y Figma a Código — NaviPort (OceanTrack)

Esta guía orienta a los **2 desarrolladores Frontend** y a los agentes de IA para traducir con fidelidad pixel-perfect los diseños de **Figma** a componentes nativos de **Ionic 9 + Angular 22**.

---

## 1. Tokens de Diseño Oficiales (Extraídos de Figma)

### 1.1 Paleta de Colores
| Nombre del Token | Variable CSS | Hexadecimal | Uso en la Aplicación |
| :--- | :--- | :--- | :--- |
| **Primario** | `--ion-color-primary` / `--navi-color-primary` | `#005cff` | Azul eléctrico marítimo. Botones principales, barra de progreso activa, tabs seleccionados |
| **Acento / Secundario** | `--ion-color-secondary` / `--navi-color-accent` | `#ffb703` | Amarillo ámbar. Tags `EN RUTA`, días restantes, pin del buque en el mapa |
| **Texto Principal** | `--navi-text-principal` | `#1f2937` | Títulos, nombres de puertos, identificadores `#BU-...`, texto oscuro |
| **Texto Secundario** | `--navi-text-secundario` | `#6b7280` | Subtítulos, labels "Origen", "Destino", textos de apoyo y placeholders |
| **Fondo General** | `--ion-background-color` | `#f3f6f8` | Fondo suave de toda la app móvil |
| **Cards / Superficie** | `--ion-card-background` | `#ffffff` | Tarjetas de rutas, métricas, modales e inputs |
| **Navbar Flotante** | `--navi-navbar-dark` | `#111827` | Barra de navegación inferior oscura tipo píldora flotante |
| **Track de Progreso** | `--navi-progress-track` | `#c3c4c7` | Barra gris inactiva de las rutas marítimas |
| **Éxito / Confianza IA**| `--navi-good-bg` / `--navi-good-text` | `#defde2` / `#418e4a` | Badges de confianza IA (ej. `85%`) |

### 1.2 Tipografía
- **Familia tipográfica**: Google Font **`Poppins`** (`weights: 300, 400, 500, 600, 700`).
- **Títulos de Pantalla / Hero**: `Poppins Bold` 20px - 24px.
- **Títulos de Tarjeta / Rutas**: `Poppins Bold` 16px.
- **Labels y Estado**: `Poppins Bold` 10px - 14px en mayúsculas (`text-transform: uppercase`).
- **Cuerpo y Fechas**: `Poppins Regular` 12px - 14px.

### 1.3 Radios de Borde (Border Radius)
- **Tarjetas de Envíos y Métricas**: `border-radius: 24px;`
- **Píldora del Navbar y Botones Principales**: `border-radius: 99px;`
- **Badges de Estado y Tags**: `border-radius: 12px;`
- **Modales e Hojas Inferiores (Action Sheets)**: `border-radius: 24px 24px 0 0;`

### 1.4 Sombras
- **Tarjetas**: `box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.1);`
- **Píldoras y Botones**: `box-shadow: 0px 3px 4.6px 0px rgba(0, 0, 0, 0.25);`

---

## 2. Mapa de Pantallas Móviles y Asignación

### Frontend Dev 1 (Vistas Principales y Navegación Core)
1. **`Introduccion` (Onboarding / Splash)** (`node-id: 14:3`):
   - Ilustración central de logística marítima.
   - Eslogan: *"Importaciones Fáciles, Negocios Inteligentes"*.
   - Botón CTA: *"Empezar"* con radio `99px` y flecha indicadora.
2. **`Inicio` (Home Cliente)** (`node-id: 17:342`):
   - Cabecera: Avatar circular con inicial `"G"`, saludo *"Hola, Gary Industries"*, campana de notificaciones.
   - Tarjeta Principal de Ruta:
     - Header con status badge `#ffb703` (`EN RUTA`) y código `#BU-1234XYZ`.
     - Origen: `Shanghai (Terminal Yangshan - CHN)` con fecha de salida.
     - Destino: `Guayaquil (Puerto Marítimo - ECU)` con fecha estimada de llegada.
     - Barra de progreso bicolor (`#005cff` sobre fondo `#c3c4c7`) con ícono de barco.
   - Tarjetas de métricas rápidas (KPIs).
   - Barra de navegación inferior flotante (`#111827`) con píldora activa azul (`#005cff`).
3. **`Seguimiento` (Tracking de Envíos)** (`node-id: 30:77`):
   - Barra de búsqueda: *"Buscar contenedores/buques..."* con botón de filtros.
   - Filtros de estado tipo segmentos: `[ En Curso ]` (activo con fondo azul) y `[ Completados ]`.
   - Lista scrolleable de tarjetas de buques activos (Shanghai -> Guayaquil, Miami -> Guayaquil).
   - Badge de tiempo restante (ej. *"Llegada: 5 días (3 Jul)"*).

### Frontend Dev 2 (Vistas Operativas, Detalle, Cámara IA y Servicios)
4. **`Inicio Empleado` (Home Operador)** (`node-id: 31:372`):
   - Cabecera: Foto de perfil, indicador *"Turno activo"*, saludo *"Hola, Gary Barreiro"*.
   - Botón de acción rápida: *"Reportar Incidente"* (`Avería, precinto o sello roto`).
   - Métrica de rendimiento diario: *"Rendimiento / Escaneos hoy: 32"*.
   - Lista de *"Últimos Registros"* con estado de verificación `OK`.
   - Botón flotante central para abrir la cámara/escáner.
5. **`Scan Camara` (Escáner de Contenedores con IA)** (`node-id: 32:833`):
   - Visor de cámara en vivo con visor de encuadre óptico.
   - Indicador inferior de procesamiento: *"Analizando imagen... Inspección óptica de contenedor"*.
   - Badge de confianza de IA: `85%` (fondo `#defde2`, texto `#418e4a`).
   - Tarjeta inferior deslizante con el código detectado (`#CN-9823`), ruta actual (`En Tránsito - Océano Pacífico`), y estimación de días.
   - Texto de guía al operador: *"Mantén la cámara firme y alineada a los dígitos en fondo liso"*.
6. **`Detalle Pedido`** (`node-id: 19:543`):
   - Información técnica del contenedor (Seco / Refrigerado, peso en toneladas).
   - Timeline vertical interactivo de eventos (Recogido en fábrica -> En patio de contenedores -> A bordo -> En tránsito marítimo -> Desembarque en Guayaquil).
7. **`Perfil` (Configuraciones)** (`node-id: 29:119` / `32:986`):
   - Información de la empresa o datos de empleado.
   - Toggles nativos de Ionic: *Notificaciones Push*, *Modo Oscuro*.
   - Botón de cerrar sesión (revocación de token en Redis).

---

## 3. Componentes Ionic Recomendados

| Elemento Figma | Componente Ionic Nativo | Clases / Estilos Recomendados |
| :--- | :--- | :--- |
| **Barra Superior** | `<ion-header class="ion-no-border">` `<ion-toolbar>` | `style="--background: transparent;"` |
| **Tarjeta de Buque** | `<ion-card>` | `class="navi-card"` con `border-radius: 24px` |
| **Buscador** | `<ion-searchbar>` | `mode="ios"` con `border-radius: 12px` |
| **Tabs Flotantes** | `<ion-tab-bar>` | Custom CSS encapsulado con fondo `#111827` y píldora `#005cff` |
| **Tags de Estado** | `<ion-badge>` | `class="navi-badge-accent"` (`#ffb703`) |
| **Barra de Progreso** | `<ion-progress-bar>` | `color="primary"` con valor decimal (`[value]="progreso"`) |
| **Timeline de Eventos**| `<ion-list>` con items conectados | Línea vertical pseudo `::before` y avatars de estado |
| **Cámara** | Servicio `@capacitor/camera` | Acceso nativo y preview en canvas/video |
