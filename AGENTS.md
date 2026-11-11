# AGENTS.md — Reglas y Contexto del Proyecto NaviPort (OceanTrack)

> Este archivo define las directrices maestras, arquitectura y estándares de **NaviPort Tracking (Plataforma Logística OceanTrack)** para cualquier agente de Inteligencia Artificial (Antigravity, Cursor, Copilot, Claude Code) que asista en el desarrollo.

---

## 1. Visión y Dominio del Proyecto

- **Nombre del Producto**: NaviPort Tracking (OceanTrack)
- **Propósito**: Plataforma basada en arquitectura NoSQL (**MongoDB + Redis**) para la gestión de flota naviera y rastreo de importaciones marítimas desde **China (Shanghai)** y **EE.UU. (Miami)** hacia **Ecuador (Guayaquil)**.
- **División del Equipo (3 Integrantes)**:
  - **Frontend Dev 1**: Vistas principales de cliente (`Introduccion`, `Inicio`, `Seguimiento`), navegación y componentes visuales Figma con Ionic/Angular.
  - **Frontend Dev 2**: Vistas de operador (`Inicio Empleado`, `Scan Camara` con IA, `Detalle Pedido`, `Perfil`), servicios Capacitor (cámara, almacenamiento) y consumo de APIs.
  - **Backend Dev**: API RESTful NestJS modular, esquemas Mongoose (8 colecciones), capa de caché/sesiones Redis (`kpi:resumen`, `alertas:activas`, `sesion:{idUsuario}`), JWT y Docker.

---

## 2. Roles del Sistema

1. **`cliente`**: Monitoreo de sus contenedores, timeline vertical de eventos, consulta de llegada estimada y notificaciones.
2. **`operador`**: Inicio de turno, escáner óptico IA de contenedor con cámara móvil (`#CN-9823`, % de confianza), reporte de averías/precintos rotos con fotos.
3. **`gerente`**: Dashboard analítico con KPIs cacheados en Redis (puntualidad %, toneladas), monitor de alertas operativas críticas.
4. **`admin`**: Gestión de flota (buques, puertos, viajes, mantenimientos) y control de usuarios con suspensión y revocación de sesión en tiempo real.

---

## 3. Especificaciones de Diseño (Figma Oficial)

- **Tipografía**: Google Font **`Poppins`** (`Regular`, `Medium`, `Bold`).
- **Colores Oficiales**:
  - `--primario`: `#005cff` (Azul marítimo)
  - `--secundario` / Acento: `#ffb703` (Amarillo ámbar para tags `EN RUTA`, días restantes y pin de mapa)
  - `--texto-p`: `#1f2937`
  - `--texto-s`: `#6b7280`
  - `--background`: `#f3f6f8` (Fondo de la app móvil)
  - `--cards`: `#ffffff`
  - `--navbar`: `#111827` (Floating pill navbar)
  - `--good-bg` / `--good-text`: `#defde2` / `#418e4a` (Badge de confianza IA)
- **Radios de Borde**:
  - Cards: `24px`
  - Botones y navbar: `99px`
  - Tags y badges: `12px`
- **Componentes**: Usar componentes de Ionic 9 (`<ion-card>`, `<ion-searchbar>`, `<ion-badge>`, `<ion-progress-bar>`). No usar HTML genérico con `<div>` si Ionic provee el componente nativo.

---

## 4. Estándares Técnicos para Agentes

### 4.1 Frontend (Ionic 9 + Angular 22)
- Usar **Standalone Components** (`standalone: true`).
- Reactividad con **Angular Signals** (`signal()`, `computed()`, `effect()`).
- Servicios dedicados para plugins nativos (`@capacitor/camera`, `@capacitor/haptics`, `@capacitor/status-bar`).
- Variables de tema centralizadas en `src/theme/variables.scss`.

### 4.2 Backend (NestJS + MongoDB + Redis)
- **8 Colecciones Mongoose**:
  `usuarios`, `puertos`, `buques`, `viajes`, `cargas`, `incidentes`, `imagenes`, `mantenimientos`.
- **Estrategia Redis**:
  - `kpi:resumen` -> TTL 300 segundos, cache-aside del pipeline de agregación.
  - `alertas:activas` -> Set de alertas urgentes (`viaje_retrasado:...`, `mantenimiento_vencido:...`).
  - `sesion:{idUsuario}` -> Hash para validación rápida y revocación inmediata de JWT al suspender usuarios.
- **Validación Estricta**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` con DTOs en `class-validator`.
- **Documentación Swagger**: `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()` en todos los controladores.

### 4.3 Git y Flujo de Trabajo
- Base de desarrollo: rama **`develop`**.
- Sub-ramas:
  - `feature/front/<nombre>`
  - `feature/back/<nombre>`
  - `fix/front/<nombre>`
  - `fix/back/<nombre>`
- Commits semánticos obligatorios (*Conventional Commits*).
- PRs dirigidos siempre hacia `develop`.
