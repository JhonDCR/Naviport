# Contrato de API y Estándares de Comunicación — NaviPort (OceanTrack)

Este documento define los endpoints RESTful, contratos de datos (DTOs), esquemas de respuesta y seguridad entre el **Frontend (Ionic/Angular)** y el **Backend (NestJS)**.

---

## 1. Convenciones Globales

- **Base URL**: `http://localhost:3000/api/v1`
- **Swagger UI**: `http://localhost:3000/api/docs`
- **Encabezado de Autenticación**: `Authorization: Bearer <jwt-token>`
- **Envoltorio Estándar de Respuesta**:
  ```typescript
  export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data: T;
    timestamp: string;
  }
  ```

---

## 2. Endpoints Principales por Módulo

### 2.1 Módulo de Autenticación (`/auth`)

#### `POST /auth/login`
- **Público**: Sí
- **Seguridad (Redis)**: Protección Rate Limiting (`ratelimit:login:{correo}`): máximo 5 intentos cada 60 segundos (`429 Too Many Requests` si se excede).
- **Body**:
  ```typescript
  class LoginDto {
    @IsEmail()
    correo: string;

    @IsString()
    @MinLength(6)
    password: string;
  }
  ```
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Autenticación satisfactoria",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "usuario": {
        "id": "672f0b9f91a24d0012ab34cd",
        "nombre": "Gary Industries",
        "correo": "contacto@garyindustries.com",
        "rol": "cliente",
        "detallesPerfil": {
          "empresa": "Gary Industries",
          "ruc": "0992345678001"
        }
      }
    },
    "timestamp": "2026-11-10T23:50:00.000Z"
  }
  ```

#### `POST /auth/logout`
- **Seguridad**: Bearer Token
- **Descripción**: Invalida inmediatamente la clave `sesion:{idUsuario}` en Redis.

#### `POST /auth/registro`
- **Público**: Sí
- **Descripción**: Registra un nuevo cliente en la plataforma. Por seguridad contra escalación de privilegios, siempre asigna el rol `cliente` y encripta la contraseña con `bcryptjs`.

#### `GET /auth/perfil` / `PATCH /auth/perfil` / `PATCH /auth/preferencias` / `PATCH /auth/cambiar-password`
- **Seguridad**: Bearer Token
- **Descripción**: Obtiene o actualiza los datos del perfil (`nombre`, `avatarUrl`, `detallesPerfil`: `empresa`, `ruc`, `direccionLegal`, `telefono`, `horarioTurno`, `turnoActivo`), preferencias (`notificacionesPush`, `modoOscuro`, `idioma`) y cambio seguro de contraseña verificando la actual.

#### `PATCH /auth/turno`, `GET /auth/turnos/mi-historial` y `GET /auth/turnos`
- **Roles permitidos**: `operador`, `admin` (mi-historial / controlar); `gerente`, `admin` (listar todos)
- **Descripción**: Inicia o finaliza el turno operativo creando/cerrando un registro persistente en la colección `turnos` y actualizando `turno:activo:{idOperador}` en Redis. Permite consultar el historial laboral de escaneos e incidentes por turno.

#### `GET /auth/usuarios`, `POST /auth/usuarios`, `PATCH /auth/usuarios/:id`, `PATCH /auth/usuarios/:id/estado` y `GET /auth/auditoria`
- **Roles permitidos**: `admin`
- **Descripción**: Gestión completa de usuarios (incluyendo creación con cualquier rol, edición de perfil/rol y activación/suspensión inmediata revocando `sesion:{idUsuario}` en Redis), además de consulta de logs de auditoría persistidos en MongoDB (`auditoria_logs`) con respaldo en Redis (`auditoria:eventos`).

---

### 2.2 Módulo de Cargas y Seguimiento (`/cargas` y `/viajes`)

#### `GET /cargas/mis-cargas`
- **Roles permitidos**: `cliente`, `gerente`, `admin`
- **Query Params**: `?estado=en_curso | completados` y `?q=<texto>` (búsqueda por contenedor, buque, viaje o puerto)
- **Respuesta (200 OK)**: Lista de cargas asociadas al `clienteId` extraído del token JWT, incluyendo `progreso` (`0` a `1`) y `ultimaPosicion` GeoJSON.
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Cargas obtenidas correctamente",
    "data": [
      {
        "id": "672f0b...",
        "codigoContenedor": "#CN-9823",
        "tipo": "Seco",
        "pesoToneladas": 24.5,
        "viaje": {
          "id": "672f0a...",
          "codigo": "#BU-1234XYZ",
          "buque": "Maersk Horizon",
          "origen": "Shanghai (Terminal Yangshan - CHN)",
          "destino": "Guayaquil (Puerto Marítimo - ECU)",
          "salida": "2026-03-12T08:00:00.000Z",
          "llegadaEstimada": "2026-07-03T18:00:00.000Z",
          "estado": "en_ruta",
          "diasRestantes": 5,
          "progreso": 0.85,
          "ultimaPosicion": {
            "type": "Point",
            "coordinates": [-110.5, 8.2]
          }
        }
      }
    ],
    "timestamp": "2026-11-10T23:50:00.000Z"
  }
  ```

#### `GET /cargas/resumen-cliente`
- **Roles permitidos**: `cliente`, `gerente`, `admin`
- **Descripción**: Obtiene métricas rápidas (`totalContenedores`, `enCurso`, `completados`, `toneladasTotales`, `proximoArriboDias`) y la `cargaDestacada` para la pantalla **`Inicio` (Home Cliente)**.

#### `GET /cargas/notificaciones`, `PATCH /cargas/notificaciones/:id/leer` y `PATCH /cargas/notificaciones/leer-todas`
- **Roles permitidos**: `cliente`, `operador`, `gerente`, `admin`
- **Descripción**: Obtiene notificaciones persistidas en MongoDB (`notificaciones`) combinadas con alertas de seguimiento y sincroniza el estado `leida` tanto en MongoDB como en Redis (`notificaciones:leidas:{idUsuario}`).

#### `GET /cargas`
- **Roles permitidos**: `gerente`, `admin`
- **Query Params**: `?viajeId=`, `?clienteId=`, `?q=`
- **Descripción**: Listado maestro de contenedores para administración y programación de viajes.

#### `GET /cargas/:id` y `GET /cargas/:id/manifiesto`
- **Roles permitidos**: `cliente`, `operador`, `gerente`, `admin`
- **Descripción**: Obtiene el detalle técnico completo de un contenedor (`numeroPrecinto`, `valorFleteUSD`, `manifiestoAduanero`, `velocidadNudos`) y la estructura completa del **Manifiesto Aduanero / Bill of Lading** para descarga en PDF desde **`Detalle Pedido`**, aplicando aislamiento estricto por `clienteId`.

#### `GET /cargas/:id/timeline`
- **Roles permitidos**: `cliente`, `operador`, `gerente`, `admin`
- **Respuesta (200 OK)**: Historial vertical de eventos para la pantalla de detalle.
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Timeline obtenido",
    "data": {
      "codigoContenedor": "#CN-9823",
      "eventos": [
        { "estado": "Recogido en fábrica", "fecha": "2026-03-10T10:00:00.000Z", "ubicacion": "Suzhou, CHN", "completado": true },
        { "estado": "En patio de contenedores", "fecha": "2026-03-11T16:00:00.000Z", "ubicacion": "Terminal Yangshan (CHN)", "completado": true },
        { "estado": "A bordo de buque", "fecha": "2026-03-12T08:00:00.000Z", "ubicacion": "Maersk Horizon", "completado": true },
        { "estado": "En tránsito marítimo", "fecha": "2026-03-15T00:00:00.000Z", "ubicacion": "Océano Pacífico", "completado": true },
        { "estado": "Desembarque en puerto", "fecha": "2026-07-03T18:00:00.000Z", "ubicacion": "Puerto Marítimo (ECU)", "completado": false }
      ]
    },
    "timestamp": "2026-11-10T23:50:00.000Z"
  }
  ```

#### `POST /cargas` y `POST /cargas/:id/eventos`
- **Roles permitidos**: `operador` (eventos), `gerente`, `admin`
- **Descripción**: Registra nuevos contenedores (actualizando `resumenCarga` del viaje e invalidando `kpi:resumen` en Redis) y añade nuevos hitos al `historialEventos` del contenedor.

#### `GET /viajes`, `GET /viajes/:id`, `POST /viajes`, `PATCH /viajes/:id`, `PATCH /viajes/:id/estado` y `DELETE /viajes/:id`
- **Descripción**: Consulta, programa, edita (incluyendo `velocidadNudos`, `capitanAsignado` y `finanzas`), actualiza el estado o posición GeoJSON (`ultimaPosicion`) y elimina viajes sin cargas asociadas, sincronizando alertas de retraso en Redis (`alertas:activas`).

---

### 2.3 Módulo de Escáner IA con Cámara (`/escaner`)

#### `POST /escaner/inspeccion-optica`
- **Roles permitidos**: `operador`, `admin`
- **Content-Type**: `multipart/form-data` o `application/json` (límite de imagen: `5 MB`, formatos `JPEG/PNG/WEBP`)
- **Form Data**:
  - `foto`: Archivo binario capturado por la cámara de Ionic/Capacitor.
  - `viajeId`: ID opcional del viaje asignado.
  - `codigoContenedor`: Código opcional si se envía manual/simulado.
  - `estadoSello`: `'ok' | 'sello_roto' | 'averia'`
  - `observaciones`: Comentario opcional del operador.
- **Efecto**: Guarda la evidencia en `imagenes` con el `operadorId` autenticado, `buqueNombre` y `resultadoIA.estadoSello`.

#### `GET /escaner/historial` y `GET /escaner/resumen-operador`
- **Roles permitidos**: `operador`, `gerente`, `admin`
- **Query Params (`historial`)**: `?estado=ok|sello_roto|averia`, `?soloMios=true|false`, `?page=1&limit=25`
- **Descripción**: Provee las métricas de rendimiento diario filtradas por el operador autenticado (`escaneosHoy`, `totalEscaneos`) y la lista de `"Últimos Registros"` con `estadoVerificacion`, `buqueNombre` y `tiempoRelativo`.

---

### 2.4 Módulo de Incidentes (`/incidentes`)

#### `POST /incidentes/reportar`, `GET /incidentes` y `PATCH /incidentes/:id/estado`
- **Roles permitidos**: `operador`, `gerente` (lectura y cambio de estado), `admin`
- **Content-Type**: `multipart/form-data` (foto máx. `5 MB`) o `application/json`
- **Efecto Secundario**: Al crear guarda en MongoDB (`incidentes` con `estado: 'abierto'` y opcionalmente `imagenes`), invalida `kpi:resumen` y empuja a Redis (`SADD alertas:activas ...`). Al actualizar el estado a `resuelto` (`PATCH /incidentes/:id/estado`), limpia las alertas asociadas en Redis e invalida cachés de KPIs.

---

### 2.5 Módulo de KPIs y Analítica (`/kpis`)

#### `GET /kpis/resumen`
- **Roles permitidos**: `gerente`, `admin`
- **Fuente**: Caché Redis `kpi:resumen` (TTL: 300 segundos).
- **Datos**: Incluye `puntualidad`, `toneladasMes`, `buquesActivos`, `totalBuques`, `porcentajeFlotaOperativa`, `viajesEnRuta`, `incidentesPendientes`, `toneladasPorMes` (serie 6 meses), `distribucionEstadoViajes`, `enviosYAlertasRecientes` y `origenCache`.

#### `GET /kpis/reportes` y `GET /kpis/reportes/exportar-csv`
- **Roles permitidos**: `gerente`, `admin`
- **Query Params**: `?periodo=mes | trimestre | anio`
- **Fuente**: Caché Redis `kpi:reportes:{periodo}` (TTL: 300 segundos).
- **Descripción**: Entrega las métricas financieras (`ingresosUSD`, `costoOperativoUSD`, `margenOperativoUSD`, `margenPorcentaje`, `viajesCompletados`), `evolucionIngresos`, `cargaPorRuta` y exportación en formato CSV (`Exportar CSV`).

#### `GET /kpis/alertas-activas` y `DELETE /kpis/alertas-activas/:id`
- **Roles permitidos**: `gerente`, `admin`
- **Fuente**: Set de Redis `alertas:activas` (`SMEMBERS` / `SREM`).

---

### 2.6 Módulo de Flota, Puertos y Mantenimientos (`/buques`, `/puertos`, `/mantenimientos`)

- **`GET /buques`**: Soporta `?q=`, `?estado=todos|en_ruta|en_puerto|retraso|mantenimiento`, `?page=` y `?limit=`. Enriquece cada buque con `viajeActivo`, `capitan` y `estadoOperativo`.
- **`GET /buques/resumen-flota`**: Totales agregados para las tarjetas superiores (`flotaTotal`, `enTransito`, `enPuerto`, `enRetraso`, `enMantenimiento`, `capacidadNetaToneladas`).
- **`GET /buques/exportar-csv`**: Exporta el directorio de buques en formato CSV.
- **`POST /buques`**, **`PATCH /buques/:id`**, **`PATCH /buques/:id/estado`**, **`DELETE /buques/:id`**: Gestión completa de barcos e invalidación de caché en Redis.
- **`GET /puertos`**, **`POST /puertos`**, **`PATCH /puertos/:id`**, **`DELETE /puertos/:id`**: Gestión completa de terminales portuarias con coordenadas GeoJSON (`2dsphere`).
- **`GET /mantenimientos`**, **`POST /mantenimientos`**, **`PATCH /mantenimientos/:id/estado`**, **`DELETE /mantenimientos/:id`**: Programación, costos y finalización de mantenimientos con limpieza automática de alertas `mantenimiento_vencido:{imo}` en Redis.

---

### 2.7 Módulo de Soporte Técnico y Asistencia (`/soporte`)

- **`POST /soporte`** (`cliente`, `operador`, `gerente`, `admin`): Crea un ticket en `tickets_soporte` (`agente_aduanas`, `supervisor`, `fallo_app`, `consulta_general`), notifica al rol encargado en `notificaciones` y registra auditoría.
- **`GET /soporte/mis-tickets`** (todos los roles): Devuelve los tickets enviados por el usuario autenticado junto con su respuesta y estado.
- **`GET /soporte`** (`gerente`, `admin`): Lista todos los tickets con filtros `?estado=` y `?tipo=`.
- **`PATCH /soporte/:id/responder`** (`gerente`, `admin`): Responde un ticket, cambia su estado (`en_proceso`, `resuelto`, `cerrado`) y genera notificación automática al usuario solicitante.

