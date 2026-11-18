# Registro de Cambios en MongoDB y Redis — NaviPort (OceanTrack)

Este documento detalla todas las actualizaciones realizadas sobre la arquitectura NoSQL de **MongoDB (12 colecciones Mongoose)**, la capa de memoria rápida **Redis (8 estructuras)** y los endpoints del backend (`backend_navi`) para cubrir al 100% los flujos de las vistas de **Figma** (Cliente, Empleado/Operador, Gerente y Administrador) con estándares de seguridad y estabilidad en producción.

---

## 1. Colecciones MongoDB (Ampliadas de 8 a 12 Colecciones)

### 1.1 Mejoras en las 8 Colecciones Base

#### `usuarios` ([usuario.schema.ts](../backend_navi/src/database/schemas/usuario.schema.ts))
| Nivel | Campo Agregado | Tipo | Propósito y Vista Figma que Alimenta |
| :--- | :--- | :--- | :--- |
| Raíz | `avatarUrl` | `string?` | Foto de perfil del usuario en `Inicio Empleado` (`31:372`) y `Perfil`. |
| `detallesPerfil` | `direccionLegal`, `telefono` | `string?` | *"Detalles fiscales y dirección legal"* en `Perfil Cliente` (`29:119`). |
| `detallesPerfil` | `horarioTurno`, `turnoActivo` | `string?`, `boolean?` | Badge `"08:00 - 16:00"` en `Perfil Empleado` (`32:986`) y estado de turno sin sobreescribir el nombre asignado. |
| `preferencias` | `idioma` | `'es' \| 'en'` | Selector *"Idioma - Región e informes portuarios"* en `Perfil`. |

#### `buques` ([buque.schema.ts](../backend_navi/src/database/schemas/buque.schema.ts))
| Nivel | Cambio Realizado | Tipo / Definición | Propósito y Vista Figma que Alimenta |
| :--- | :--- | :--- | :--- |
| Raíz | `capitan` | `string` (default `'Luis Andrade'`) | Campo *"Capitán"* en las tarjetas de `Gestión de Flota` (`59:270`). |
| Raíz | `estadoOperativo` | `'en_ruta' \| 'en_puerto' \| 'retraso' \| 'mantenimiento' \| 'inactivo'` | Alimenta los 5 filtros exactos de `Gestión de Flota`. |
| Índice | Índice compuesto | `{ estado: 1, estadoOperativo: 1 }` | Acelera listados filtrados y tarjetas resumen de flota. |

#### `viajes` ([viaje.schema.ts](../backend_navi/src/database/schemas/viaje.schema.ts))
| Nivel | Cambio Realizado | Tipo / Definición | Propósito y Vista Figma que Alimenta |
| :--- | :--- | :--- | :--- |
| Raíz | `velocidadNudos` | `number` (default `21.4`) | Muestra velocidad real en `Detalle Pedido` (`19:543`). |
| Raíz | `capitanAsignado` | `string?` | Capitán asignado al viaje marítimo. |
| `finanzas` | `ingresosEstimadosUSD`, `costoOperativoUSD` | Subdocumento `FinanzasViaje` | Alimenta *Ingresos*, *Costo operativo*, *Margen operativo* y *Evolución de ingresos* en `Reportes` (`59:577`). |
| Índice | Índice compuesto | `{ estado: 1, 'fechas.salida': -1 }` | Acelera agregaciones por periodo (`mes`, `trimestre`, `anio`). |

#### `cargas` ([carga.schema.ts](../backend_navi/src/database/schemas/carga.schema.ts))
| Nivel | Cambio Realizado | Tipo / Definición | Propósito y Vista Figma que Alimenta |
| :--- | :--- | :--- | :--- |
| Raíz | `numeroPrecinto`, `valorFleteUSD` | `string?`, `number` | Sello aduanero (`#MSK-4409`) y valor de flete. |
| `manifiestoAduanero` | `numeroDocumento`, `fechaEmision`, `partidaArancelaria`, `estadoAduana` | Subdocumento `ManifiestoAduanero` | Datos reales para el botón *"Descargar Manifiesto (PDF) - Documento aduanero"* en `Detalle Pedido` (`19:543`). |
| `historialEventos[]` | `descripcion`, `registradoPor` | `string?`, `ObjectId?` | Subtítulos de hitos del timeline y trazabilidad del operador. |
| Índice | Índice compuesto | `{ clienteId: 1, viajeId: 1 }` | Optimiza consultas aisladas por cliente. |

#### `imagenes` ([imagen.schema.ts](../backend_navi/src/database/schemas/imagen.schema.ts))
| Nivel | Cambio Realizado | Tipo / Definición | Propósito y Vista Figma que Alimenta |
| :--- | :--- | :--- | :--- |
| Raíz | `operadorId`, `viajeId`, `buqueNombre`, `observaciones` | `ObjectId?`, `string?` | Filtra *"Escaneos hoy"* y *"Últimos Registros"* por operador autenticado (`"Maersk Buque - Hace 8min"`). |
| `resultadoIA` | `estadoSello` | `'ok' \| 'sello_roto' \| 'averia'` | Diferencia los badges `OK`, `Sello` y `Avería` en `Inicio Empleado` (`31:372`). |
| Índice | Índice compuesto | `{ operadorId: 1, createdAt: -1 }` | Optimiza métricas diarias e historial paginado del operador. |

#### `incidentes` ([incidente.schema.ts](../backend_navi/src/database/schemas/incidente.schema.ts))
| Nivel | Cambio Realizado | Tipo / Definición | Propósito y Vista Figma que Alimenta |
| :--- | :--- | :--- | :--- |
| Raíz | `codigoContenedor`, `estado`, `resueltoPor`, `fechaResolucion` | `string?`, `'abierto' \| 'en_revision' \| 'resuelto'`, `ObjectId?`, `Date?` | Ciclo completo de vida del incidente y conteo real de incidentes pendientes. |
| Índice | Índice compuesto | `{ estado: 1, gravedad: 1, fecha: -1 }` | Acelera consultas de alertas abiertas en Dashboard. |

#### `mantenimientos` ([mantenimiento.schema.ts](../backend_navi/src/database/schemas/mantenimiento.schema.ts))
| Nivel | Cambio Realizado | Tipo | Propósito |
| :--- | :--- | :--- | :--- |
| Raíz | `descripcion`, `costoUSD`, `responsable` | `string?`, `number`, `string?` | Detalle técnico, presupuesto y responsable del mantenimiento. |

*(La colección `puertos` mantiene intacto su índice geoespacial `2dsphere` y suma endpoints `PATCH`/`DELETE`).*

---

### 1.2 Las 4 Nuevas Colecciones Agregadas (Flujo 100% Cerrado)

| # | Colección | Archivo Schema | Campos Clave e Índices | Qué Botón / Flujo de Figma Cierra |
| :--- | :--- | :--- | :--- | :--- |
| **9** | **`notificaciones`** | [notificacion.schema.ts](../backend_navi/src/database/schemas/notificacion.schema.ts) | `usuarioId`, `rolDestino`, `tipo`, `titulo`, `mensaje`, `codigoContenedor`, `referenciaId`, `leida`, `fechaLectura`.<br>Índices: `{ usuarioId: 1, leida: 1, createdAt: -1 }`, `{ rolDestino: 1, leida: 1, createdAt: -1 }`. | Campana de notificaciones real en `Inicio Cliente` (`17:342`), `Inicio Empleado` (`31:372`) y alertas internas de Gerente/Admin. |
| **10** | **`tickets_soporte`** | [ticket-soporte.schema.ts](../backend_navi/src/database/schemas/ticket-soporte.schema.ts) | `codigo` (`TKT-2026-001`), `usuarioId`, `rolUsuario`, `tipo` (`agente_aduanas`, `supervisor`, `fallo_app`, `consulta_general`), `asunto`, `mensaje`, `prioridad`, `estado`, `respuesta`, `atendidoPor`, `fechaRespuesta`.<br>Índices: `{ usuarioId: 1, estado: 1, createdAt: -1 }`, `{ estado: 1, prioridad: 1 }`. | Botones *"Contactar Agente"* en `Perfil Cliente` (`29:119`), *"Contactar Supervisor"* y *"Reportar fallo de la App"* en `Perfil Empleado` (`32:986`). |
| **11** | **`turnos`** | [turno.schema.ts](../backend_navi/src/database/schemas/turno.schema.ts) | `operadorId`, `tipoTurno`, `horarioAsignado`, `fechaInicio`, `fechaFin`, `estado` (`activo` \| `finalizado`), `escaneosRealizados`, `incidentesReportados`, `observacionesCierre`.<br>Índice: `{ operadorId: 1, estado: 1, fechaInicio: -1 }`. | Control real de apertura/cierre de turno en `Inicio Empleado` (`31:372`) y *"Mi Turno Actual"* en `Perfil Empleado` (`32:986`), contabilizando automáticamente escaneos e incidentes por turno. |
| **12** | **`auditoria_logs`** | [auditoria-log.schema.ts](../backend_navi/src/database/schemas/auditoria-log.schema.ts) | `usuarioId`, `accion`, `entidad`, `entidadId`, `detalle`, `fecha`.<br>Índice: `{ entidad: 1, accion: 1, fecha: -1 }`. | Trazabilidad permanente en MongoDB de acciones críticas de seguridad y operación (`LOGIN`, `LOGIN_BLOQUEADO`, `SUSPENDER_USUARIO`, `INICIAR_TURNO`, `CREAR_TICKET_SOPORTE`, `RESOLVER_INCIDENTE`). |

---

## 2. Estructuras en Redis ([redis.service.ts](../backend_navi/src/redis/redis.service.ts))

Se amplió de 3 a **8 claves/estructuras Redis** (todas con fallback seguro en memoria para entornos de desarrollo o test sin Redis activo):

| Clave Redis | Tipo de Dato | Comandos | TTL | Propósito e Invalidación |
| :--- | :--- | :--- | :--- | :--- |
| `sesion:{idUsuario}` *(existente)* | `Hash` | `HSET`, `HGETALL`, `EXPIRE`, `DEL` | `604800s` (7d) | Valida JWT activo y revoca acceso en tiempo real al suspender usuario o cambiar su rol. |
| `kpi:resumen` *(ampliado)* | `String` (JSON) | `GET`, `SETEX`, `DEL` | `300s` (5m) | Cachea KPIs, serie de 6 meses `toneladasPorMes`, distribución de viajes y alertas recientes. |
| `kpi:reportes:{periodo}` *(nuevo)* | `String` (JSON) | `GET`, `SETEX`, `DEL` | `300s` (5m) | Cachea los reportes financieros (`mes`, `trimestre`, `anio`). Se invalida automáticamente junto con `kpi:resumen`. |
| `alertas:activas` *(existente)* | `Set` | `SADD`, `SMEMBERS`, `SREM` | Persistente | Almacena alertas únicas (`viaje_retrasado:...`, `mantenimiento_vencido:...`, `averia_detectada:...`). |
| `notificaciones:leidas:{idUsuario}` *(nuevo)* | `Set` | `SADD`, `SMEMBERS`, `EXPIRE` | `2592000s` (30d) | Cachea lecturas rápidas de notificaciones del usuario en sincronía con la colección `notificaciones`. |
| `ratelimit:login:{correo}` *(nuevo)* | `String` (Contador) | `INCR`, `EXPIRE`, `DEL` | `60s` | Bloquea fuerza bruta tras 5 intentos fallidos (`HTTP 429`); se limpia con `DEL` tras login exitoso. |
| `auditoria:eventos` *(nuevo)* | `List` | `LPUSH`, `LTRIM 0 99`, `LRANGE` | Persistente (máx. 100) | Caché rápida LIFO de los últimos 100 eventos críticos, respaldada de forma duradera en `auditoria_logs`. |
| `turno:activo:{idOperador}` *(nuevo)* | `Hash` | `HSET`, `HGETALL`, `EXPIRE`, `DEL` | `43200s` (12h) | Almacena el turno en curso del operador (`turnoId`, `tipoTurno`, `horarioAsignado`, `fechaInicio`); se elimina al finalizar turno. |

---

## 3. Seguridad y Catálogo Completo de Nuevos Endpoints

### Seguridad Implementada
1. **Prevención de Escalación de Privilegios**: `POST /api/v1/auth/registro` (público) ignora cualquier `rol` en el payload y fuerza `RolUsuario.CLIENTE`. La creación de roles internos se realiza únicamente vía `POST /api/v1/auth/usuarios` (`@Roles(ADMIN)`).
2. **Rate Limiting en Login**: `ratelimit:login:{correo}` en Redis bloquea intentos excesivos (`429 Too Many Requests`).
3. **Revocación Inmediata en Redis**: Suspender un usuario o cambiar su rol elimina `sesion:{idUsuario}` de inmediato.
4. **Validación Estricta de Archivos (`Multer`)**: `POST /escaner/inspeccion-optica` y `POST /incidentes/reportar` aceptan solo imágenes `JPEG/PNG/WEBP` de hasta `5 MB`.
5. **Integridad Referencial en Borrados**: `DELETE /buques/:id`, `DELETE /puertos/:id` y `DELETE /viajes/:id` validan dependencias antes de eliminar (`409 Conflict`).

### Nuevos Endpoints Agregados
- **Auth y Turnos**: `POST /auth/usuarios`, `PATCH /auth/usuarios/:id`, `PATCH /auth/cambiar-password`, `GET /auth/turnos/mi-historial`, `GET /auth/turnos`, `GET /auth/auditoria`.
- **Tracking / Cargas**: `GET /cargas`, `GET /cargas/:id/manifiesto`, `PATCH /cargas/notificaciones/:id/leer`, `PATCH /cargas/notificaciones/leer-todas`, `PATCH /viajes/:id`, `DELETE /viajes/:id`.
- **Soporte**: `POST /soporte`, `GET /soporte/mis-tickets`, `GET /soporte`, `PATCH /soporte/:id/responder`.
- **KPIs / Reportes**: `GET /kpis/reportes`, `GET /kpis/reportes/exportar-csv`.
- **Flota / Puertos / Mantenimientos**: `GET /buques/resumen-flota`, `GET /buques/exportar-csv`, `PATCH /buques/:id`, `DELETE /buques/:id`, `PATCH /puertos/:id`, `DELETE /puertos/:id`, `DELETE /mantenimientos/:id`.
- **Incidentes**: `PATCH /incidentes/:id/estado`.
