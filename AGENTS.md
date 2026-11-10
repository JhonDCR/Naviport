# AGENTS.md — Reglas y Contexto para Agentes de IA en Naviport

> Este archivo define las directrices, estándares y contexto del proyecto **Naviport** para cualquier agente de Inteligencia Artificial (Antigravity, Cursor, Copilot, Claude Code, etc.) que asista en el desarrollo. Todo agente debe seguir estrictamente estas reglas.

---

## 1. Visión General del Proyecto

- **Nombre del Proyecto**: Naviport
- **Tipo de Proyecto**: Aplicación móvil y multiplataforma para la materia de Aplicaciones Móviles.
- **Estructura del Equipo (3 Integrantes)**:
  - **Frontend Dev 1**: Vistas principales, navegación, integración de componentes Ionic/Angular, diseño Figma.
  - **Frontend Dev 2**: Vistas secundarias, consumo de servicios/APIs, gestión de estado, autenticación en cliente, diseño Figma.
  - **Backend Dev 1**: Arquitectura NestJS, esquemas Mongoose (MongoDB), capa de caché/sesiones Redis, controladores REST, DTOs, autenticación JWT, Docker.
- **Estructura Monorepo**:
  - `frontend_navi/`: Aplicación móvil con Ionic Framework + Angular + Capacitor.
  - `backend_navi/`: API RESTful con NestJS + Mongoose (MongoDB) + Redis.
  - `docs/`: Documentación de arquitectura, diseño y contratos de API.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Frontend Móvil** | Ionic Framework + Angular | Angular 22+, Ionic 9+, Capacitor 8+ |
| **Estilos Frontend** | SCSS / Ionic CSS Utilities | Mobile-first, adaptado a Figma |
| **Backend API** | NestJS | TypeScript, arquitectura modular |
| **Base de Datos** | MongoDB | ODM: Mongoose |
| **Caché & Fast Storage** | Redis | Caching, control de tasa (rate limiting), sesiones |
| **Contenedores** | Docker & Docker Compose | MongoDB, Redis (y Mongo Express opcional) |
| **Control de Versiones** | Git + GitHub | GitFlow simplificado (`main`, `develop`, `feature/*`) |
| **CI/CD** | GitHub Actions | Linters, typecheck, tests y builds automáticos |

---

## 3. Rol y Comportamiento del Agente de IA

Cuando generes o modifiques código:
1. **Conciencia del Rol**: Identifica si la tarea pertenece al Frontend (Ionic/Angular) o Backend (NestJS) y aplica los patrones de diseño correspondientes.
2. **Respeto a Figma**: Todo componente visual debe ser fiel al diseño de Figma (colores, espaciados, tipografías, componentes nativos de Ionic). Reutiliza variables de tema en `src/theme/variables.scss`.
3. **No romper código existente**: Preserva comentarios de documentación, tipos estrictos y convenciones preestablecidas.
4. **Validaciones en ambos lados**:
   - Frontend: Formularios reactivos (`ReactiveFormsModule`) con validadores sincrónicos y asincrónicos.
   - Backend: DTOs fuertemente tipados utilizando `class-validator` y `class-transformer` con `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
5. **Manejo de Errores Uniforme**:
   - Backend debe responder con códigos HTTP estándar y una estructura uniforme de error (`statusCode`, `message`, `error`, `timestamp`).
   - Frontend debe capturar errores mediante interceptores HTTP y presentar alertas o toasts amigables al usuario con componentes de Ionic (`IonToast`, `IonAlert`).

---

## 4. Estándares de Código

### 4.1 TypeScript General
- Tipado estricto habilitado (`strict: true`). **Prohibido el uso de `any`** salvo justificación técnica excepcional documentada.
- Utiliza `interface` para contratos de datos y `type` para uniones o tipos utilitarios.
- Nombres de archivos en `kebab-case` (`auth-login.component.ts`, `user-profile.dto.ts`).
- Nombres de clases en `PascalCase` (`AuthService`, `CreateOrderDto`).
- Nombres de variables y funciones en `camelCase`. Constantes en `UPPER_SNAKE_CASE`.

### 4.2 Frontend (Ionic + Angular)
- **Componentes**: Preferir componentes Standalone (`standalone: true`) propios de Angular moderno.
- **Gestión de Estado y Reactividad**: Usar Angular Signals (`signal`, `computed`, `effect`) junto con RxJS para flujos asíncronos (`HttpClient`).
- **Navegación**: Utilizar Angular Router configurado con lazy loading de rutas.
- **Capacitor**: Para características nativas (cámara, almacenamiento, geolocalización, haptics), encapsular las llamadas en servicios dedicados de Angular (ej. `GeolocationService`, `StorageService`).

### 4.3 Backend (NestJS)
- **Estructura Modular**: Cada dominio de negocio debe tener su módulo:
  ```text
  src/
  ├── modules/
  │   └── <feature>/
  │       ├── <feature>.controller.ts
  │       ├── <feature>.service.ts
  │       ├── <feature>.module.ts
  │       ├── dto/
  │       │   ├── create-<feature>.dto.ts
  │       │   └── update-<feature>.dto.ts
  │       └── schemas/
  │           └── <feature>.schema.ts
  ├── common/
  │   ├── filters/
  │   ├── guards/
  │   ├── interceptors/
  │   └── pipes/
  └── config/
  ```
- **Persistencia**: Usar `@nestjs/mongoose` con decoradores `@Schema()`, `@Prop()`, y `SchemaFactory.createForClass()`.
- **Caché con Redis**: Usar `@nestjs/cache-manager` o cliente `ioredis` para consultas recurrentes o de alta lectura.
- **Documentación de API**: Todos los endpoints deben estar anotados con decoradores de Swagger (`@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()`).

---

## 5. Flujo Git y Ramas

El repositorio sigue un modelo de ramas estructurado para los 3 desarrolladores:

1. **`main`**: Rama de producción / releases estables. **Bloqueada para commits directos**. Solo recibe merges vía Pull Request desde `develop`.
2. **`develop`**: Rama base de integración continua donde converge el trabajo de frontend y backend.
3. **Sub-ramas de características / correcciones**:
   - Se crean **siempre a partir de `develop`**.
   - Nomenclatura:
     - `feature/front/<nombre-de-la-pantalla-o-funcionalidad>` (ej. `feature/front/login-view`)
     - `feature/back/<nombre-del-modulo-o-servicio>` (ej. `feature/back/auth-jwt`)
     - `fix/front/<descripcion>` o `fix/back/<descripcion>`
     - `chore/<descripcion>` (ej. `chore/docker-setup`)
4. **Pull Requests**:
   - Todo PR debe dirigirse hacia `develop`.
   - Debe pasar los checks de CI/CD (lint, typecheck, tests) antes del merge.
   - Requiere revisión de al menos un compañero del equipo.
5. **Mensajes de Commit (Conventional Commits)**:
   - `feat: <descripcion>` para nuevas características.
   - `fix: <descripcion>` para corrección de bugs.
   - `docs: <descripcion>` para cambios en documentación.
   - `refactor: <descripcion>` para refactorización sin cambio funcional.
   - `chore: <descripcion>` para tareas de configuración o dependencias.

---

## 6. Variables de Entorno y Seguridad

- **NUNCA** hacer commit de archivos `.env`.
- Utilizar siempre `.env.example` en la raíz y en los subdirectorios correspondientes para documentar las variables necesarias.
- Backend: Cargar configuración mediante `@nestjs/config` con validación de variables (`Joi` o clase DTO).
- Frontend: Usar archivos `environment.ts` o inyección de configuración en tiempo de ejecución.

---

## 7. Instrucción Especial para Agentes

Al iniciar una tarea:
1. Revisa si afecta a `frontend_navi/` o `backend_navi/`.
2. Verifica si requiere un cambio de esquema en MongoDB o invalidación de caché en Redis.
3. Antes de dar una tarea por terminada, confirma que no haya errores de compilación (`npm run build` o `ng build`) y que las interfaces entre cliente y servidor coincidan.
