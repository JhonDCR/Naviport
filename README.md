# NaviPort Tracking (OceanTrack)

NaviPort es una aplicación para seguir contenedores de importación y gestionar la operación de una flota naviera. Los datos de ejemplo incluyen viajes desde Shanghái y Miami hacia Guayaquil.

## Qué puede hacer cada rol

| Rol | Para qué usa NaviPort |
| --- | --- |
| Cliente | Consulta sus envíos, la fecha estimada de llegada, el historial de cada carga y las notificaciones. |
| Operador | Consulta su jornada y el historial de inspecciones. La API permite registrar turnos e incidentes con evidencia fotográfica. |
| Gerente | Consulta el estado de la flota, los indicadores de operación, las alertas y los reportes. |
| Administrador | Gestiona buques, puertos, viajes y usuarios. La API también incluye operaciones de mantenimiento y auditoría. |

**Estado actual en `develop`.** Los paneles usan datos de ejemplo. El acceso web permite verificar credenciales con la API o abrir la demostración. En la app híbrida, el acceso selecciona un rol y el escáner simula la lectura. La API se puede probar por separado desde Swagger y guarda sus propios datos en MongoDB. El servicio de inspección registra imágenes y resultados recibidos, con valores de ejemplo cuando faltan algunos datos.

## Cómo está organizado

| Carpeta o archivo | Qué contiene |
| --- | --- |
| [`frontend_navi/src/app/web/`](frontend_navi/src/app/web/) | Página pública, inicio de sesión web y paneles de gerente y administrador. |
| [`frontend_navi/src/app/movil/`](frontend_navi/src/app/movil/) | Bienvenida y pantallas de cliente y operador de la app híbrida. |
| [`frontend_navi/src/app/login/`](frontend_navi/src/app/login/) | Acceso de demostración de la app híbrida. La web y la app móvil usan el mismo proyecto Ionic + Angular. |
| [`frontend_navi/src/app/shared/`](frontend_navi/src/app/shared/) | Menús, encabezados, iconos y datos de ejemplo compartidos. [`app.routes.ts`](frontend_navi/src/app/app.routes.ts) define la navegación y [`src/theme/`](frontend_navi/src/theme/) concentra variables visuales. |
| [`backend_navi/src/modules/`](backend_navi/src/modules/) | API de NestJS organizada por función: acceso y usuarios, seguimiento, escáner, incidentes, indicadores, flota y soporte. |
| [`backend_navi/src/database/`](backend_navi/src/database/) | Modelos de las 12 colecciones de MongoDB y datos iniciales de demostración. |
| [`backend_navi/src/redis/`](backend_navi/src/redis/) | Sesiones, alertas y consultas rápidas, como los indicadores del gerente. |
| [`backend_navi/test/`](backend_navi/test/) | Prueba de disponibilidad de la API y guion de verificación del flujo con el servidor levantado. |
| [`docs/`](docs/) y [`.github/workflows/`](.github/workflows/) | Documentación del equipo y tareas automáticas de GitHub. |
| [`docker-compose.yml`](docker-compose.yml) y [`.env.example`](.env.example) | Configuración local de MongoDB, Redis y Mongo Express. |

### Cómo viajan los datos

En la interfaz actual, cuando un cliente abre el detalle de una carga, la pantalla lee el envío de [`mock-data.ts`](frontend_navi/src/app/shared/mock-data.ts) y muestra sus eventos.

Al probar el mismo flujo desde la API, primero se inicia sesión para obtener un token de acceso. Al pedir las cargas, NestJS comprueba la sesión y el rol, consulta MongoDB y devuelve la respuesta. Redis ayuda a validar sesiones y a reutilizar resultados frecuentes, como el resumen de indicadores.

## Cómo abrirlo en tu equipo

Usa Node.js 24.15 o una versión posterior de la serie 24, con npm. Para probar la API también necesitas Docker con Docker Compose.

### Ver las pantallas

Desde la raíz del repositorio, ejecuta estos comandos.

```sh
cd frontend_navi
npm ci
npm start -- --port 8100
```

- [Inicio web](http://localhost:8100/) abre la [página pública de servicios](http://localhost:8100/servicios).
- El menú web abre paneles al pasar el cursor y también funciona con clic y teclado. Cada opción lleva a su propia página, como [Rutas marítimas](http://localhost:8100/rutas-maritimas) y [Cómo preparar la carga](http://localhost:8100/preparar-embarque).
- En la app instalada con Capacitor, la bienvenida se abre en `/introduccion`. Las pantallas de cliente y operador se abren dentro de esa app.
- Los botones **Acceder** y **Registrarse** abren el formulario sobre la portada. El registro público crea cuentas de cliente. Los paneles de Gerencia y Administración también se pueden explorar en modo de demostración.
- [Catálogo de contenedores](http://localhost:8100/contenedores) para comparar medidas interiores, puertas y capacidades.
- [Portal del cliente](http://localhost:8100/portal-cliente) para revisar las cargas y notificaciones asociadas a una cuenta de cliente.
- [Aviso de privacidad](http://localhost:8100/privacidad) del prototipo académico.
- El acceso web usa la API local en el puerto 3000. En producción, `/api/v1` debe dirigir a NestJS desde el mismo origen.

Para habilitar **Continuar con Google**, crea un cliente OAuth de tipo aplicación web en Google Cloud, autoriza `http://localhost` y `http://localhost:8100` como orígenes de JavaScript, agrega su ID a `GOOGLE_CLIENT_ID` en el archivo `.env` y reinicia la API. Abre la web con la misma dirección autorizada. En producción, añade el origen HTTPS del sitio. [Configuración de Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

### Probar la API

Abre otra terminal en la raíz del repositorio. Si ya tienes un archivo `.env`, conserva esa configuración y omite la copia. En Bash, usa `cp .env.example .env` para el primer paso.

```powershell
Copy-Item .env.example .env
docker compose up -d
cd backend_navi
npm ci
npm run start:dev
```

- [Swagger](http://localhost:3000/api/docs) permite explorar y ejecutar las peticiones.
- [Estado de la API](http://localhost:3000/api/v1/health) permite comprobar que el servidor responde.
- [Mongo Express](http://localhost:8081) permite ver los datos guardados.

En una base nueva, el servidor carga datos de demostración. Para consultar las cargas del cliente en Swagger, usa `POST /auth/login` con `correo` igual a `contacto@garyindustries.com` y `password` igual a `naviport123`, los valores locales definidos en los [datos iniciales](backend_navi/src/database/seeder.service.ts). Copia `data.accessToken` en el botón **Authorize** y ejecuta `GET /cargas/mis-cargas`.

## Aportes de los últimos commits

El historial local de `develop` registra estos autores de Git. Los commits firmados con un alias se citan con ese nombre.

| Fecha | Autor y commit | Cambios |
| --- | --- | --- |
| 20 nov 2026 | Gary Barreiro · [`15a16cd`](https://github.com/JhonDCR/Naviport/commit/15a16cd) | Fusionó el PR #3 de interfaz en `develop`. El contenido resultante coincide con el commit `33c05a2`. |
| 18 nov 2026 | DeibisuK · [`33c05a2`](https://github.com/JhonDCR/Naviport/commit/33c05a2) | Implementó introducción, acceso y navegación. Añadió las pantallas de cliente (inicio, seguimiento, detalle y perfil), operador (inicio, escáner y perfil), gerente (resumen, flota y reportes) y administrador (resumen, buques, puertos, viajes y usuarios). Incorporó menús y encabezados reutilizables, estilos de Figma y datos de demostración. |
| 17 nov 2026 | Jhon Davis Cruz Ruiz · [`e8010c1`](https://github.com/JhonDCR/Naviport/commit/e8010c1) | Amplió la API con perfiles, turnos, gestión de usuarios, seguimiento, notificaciones, escaneos e incidentes con fotos, reportes e inventario de flota. Añadió el módulo de soporte, cuatro colecciones (notificaciones, tickets, turnos y auditoría), mejoras de Redis, datos iniciales, pruebas unitarias, una prueba de disponibilidad y un guion para verificar flujos con la API levantada. |
| 10 nov 2026 | Jhon Davis Cruz Ruiz · [`8e918ab`](https://github.com/JhonDCR/Naviport/commit/8e918ab) | Fusionó el PR #1 con la base del servidor. Los commits de DeibisuK [`ec3c364`](https://github.com/JhonDCR/Naviport/commit/ec3c364), [`67a57ab`](https://github.com/JhonDCR/Naviport/commit/67a57ab) y [`b47963b`](https://github.com/JhonDCR/Naviport/commit/b47963b) crearon la base de NestJS, Redis y ocho modelos de MongoDB, añadieron los seis primeros módulos de la API y corrigieron la compilación, respectivamente. |

## Más documentación

- [Arquitectura y datos](ARCHITECTURE.md) · [Flujo de los cuatro roles](docs/FLUJO_ROLES_DIAGRAMA.md) · [Cambios en MongoDB y Redis](docs/MONGODB_REDIS_CHANGELOG.md)
- [Contrato de la API](docs/API_CONTRACT.md) · [Sistema de diseño](docs/DESIGN_SYSTEM.md) · [Diseño en Figma](https://www.figma.com/design/vu7SLGvtwRZf1CMBkQt0sA/NaviPort?node-id=33-1073)
- [Guía para contribuir](CONTRIBUTING.md)
