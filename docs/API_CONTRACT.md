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
- **Descripción**: Registra un nuevo usuario (`cliente`, `operador`, `gerente` o `admin`) con contraseña encriptada con `bcryptjs`.

#### `GET /auth/perfil` / `PATCH /auth/perfil` / `PATCH /auth/preferencias`
- **Seguridad**: Bearer Token
- **Descripción**: Obtiene o actualiza los datos del perfil (`nombre`, `detallesPerfil`) y preferencias de aplicación (`notificacionesPush`, `modoOscuro`) para la vista **`Perfil`**.

#### `PATCH /auth/turno`
- **Roles permitidos**: `operador`, `admin`
- **Descripción**: Permite al operador iniciar o finalizar su turno operativo (`turnoActivo: boolean`, `turno?: string`) para la vista **`Inicio Empleado`**.

#### `GET /auth/usuarios` y `PATCH /auth/usuarios/:id/estado`
- **Roles permitidos**: `admin`
- **Descripción**: Lista usuarios y permite activar/suspender cuentas revocando inmediatamente `sesion:{idUsuario}` en Redis.

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

#### `GET /cargas/notificaciones`
- **Roles permitidos**: `cliente`, `gerente`, `admin`
- **Descripción**: Obtiene la lista de notificaciones del cliente (`retraso`, `arribo_proximo`, `evento_timeline`) para la campana de notificaciones en **`Inicio`**.

#### `GET /cargas/:id`
- **Roles permitidos**: `cliente`, `operador`, `gerente`, `admin`
- **Descripción**: Obtiene el detalle técnico completo de un contenedor (por ObjectId o código `#CN-9823`) para la vista **`Detalle Pedido`**, aplicando aislamiento de seguridad por `clienteId`.

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

#### `GET /viajes`, `GET /viajes/:id`, `POST /viajes` y `PATCH /viajes/:id/estado`
- **Descripción**: Consulta, programa y actualiza el estado o posición GeoJSON (`ultimaPosicion`) de los viajes marítimos, sincronizando automáticamente alertas de retraso en Redis (`alertas:activas`).

---

### 2.3 Módulo de Escáner IA con Cámara (`/escaner`)

#### `POST /escaner/inspeccion-optica`
- **Roles permitidos**: `operador`, `admin`
- **Content-Type**: `multipart/form-data` o `application/json`
- **Form Data**:
  - `foto`: Archivo binario (JPEG/PNG capturado por la cámara de Ionic/Capacitor).
  - `viajeId`: ID opcional del viaje asignado.
  - `codigoContenedor`: Código opcional si se envía manual/simulado.
- **Respuesta (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Inspección óptica procesada por IA",
    "data": {
      "codigoLeido": "#CN-9823",
      "dañosDetectados": false,
      "confianza": 85,
      "origen": "Shanghai (CHN)",
      "destino": "Guayaquil (ECU)",
      "estadoRuta": "En Tránsito - Océano Pacífico",
      "fechaEstimada": "5 días (16 de noviembre)",
      "imagenId": "672f0fa..."
    },
    "timestamp": "2026-11-10T23:50:00.000Z"
  }
  ```

#### `GET /escaner/historial` y `GET /escaner/resumen-operador`
- **Roles permitidos**: `operador`, `gerente`, `admin`
- **Descripción**: Provee las métricas de rendimiento diario (`escaneosHoy: 32`, `totalEscaneos`) y la lista de `"Últimos Registros"` con estado `OK` / `ALERTA` para la vista **`Inicio Empleado`**.

---

### 2.4 Módulo de Incidentes (`/incidentes`)

#### `POST /incidentes/reportar` y `GET /incidentes`
- **Roles permitidos**: `operador`, `gerente` (lectura), `admin`
- **Content-Type**: `multipart/form-data` (con campo opcional `foto`) o `application/json`
- **Body**:
  ```typescript
  class CreateIncidenteDto {
    @IsMongoId()
    viajeId: string;

    @IsMongoId()
    buqueId: string;

    @IsIn(['retraso', 'averia', 'clima'])
    tipo: string;

    @IsString()
    @MinLength(10)
    descripcion: string; // Ej: "Avería, precinto o sello roto"

    @IsIn(['alta', 'media', 'baja'])
    gravedad: string;

    @IsOptional()
    @IsString()
    codigoContenedor?: string; // Ej: "#CN-9823"
  }
  ```
- **Efecto Secundario**: Guarda en MongoDB (`incidentes` y opcionalmente `imagenes` con `tipoEntidad: 'incidente'`), invalida `kpi:resumen` y empuja a Redis (`SADD alertas:activas ...`).

---

### 2.5 Módulo de KPIs y Analítica (`/kpis`)

#### `GET /kpis/resumen`
- **Roles permitidos**: `gerente`, `admin`
- **Fuente**: Caché Redis `kpi:resumen` (TTL: 300 segundos).
- **Respuesta (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Resumen de KPIs obtenido",
    "data": {
      "puntualidad": 94,
      "toneladasMes": 14500,
      "buquesActivos": 8,
      "viajesEnRuta": 12,
      "incidentesPendientes": 2,
      "origenCache": true
    },
    "timestamp": "2026-11-10T23:50:00.000Z"
  }
  ```

#### `GET /kpis/alertas-activas` y `DELETE /kpis/alertas-activas/:id`
- **Roles permitidos**: `gerente`, `admin`
- **Fuente**: Set de Redis `alertas:activas` (`SMEMBERS` / `SREM`).
- **Respuesta (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Alertas críticas activas",
    "data": [
      { "id": "viaje_retrasado:V-2026-014", "tipo": "viaje_retrasado", "referencia": "V-2026-014" },
      { "id": "mantenimiento_vencido:IMO-9876543", "tipo": "mantenimiento_vencido", "referencia": "IMO-9876543" }
    ],
    "timestamp": "2026-11-10T23:50:00.000Z"
  }
  ```

---

### 2.6 Módulo de Flota, Puertos y Mantenimientos (`/buques`, `/puertos`, `/mantenimientos`)

- **`GET /buques`**, **`POST /buques`**, **`PATCH /buques/:id/estado`**: Gestión de barcos de la flota naviera e invalidación de caché de KPIs en Redis.
- **`GET /puertos`**, **`POST /puertos`**: Gestión de terminales portuarias con coordenadas GeoJSON (`2dsphere`).
- **`GET /mantenimientos`**, **`POST /mantenimientos`**, **`PATCH /mantenimientos/:id/estado`**: Programación y finalización de mantenimientos preventivos/correctivos con limpieza automática de alertas `mantenimiento_vencido:{imo}` en Redis.

