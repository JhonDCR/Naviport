# Contrato de API y Estándares de Comunicación — Naviport

Este documento establece el contrato formal de comunicación entre el **Frontend (Ionic/Angular)** y el **Backend (NestJS)**.

---

## 1. Convenciones REST

- **URL Base en Desarrollo**: `http://localhost:3000/api/v1`
- **Prefijo Global de Endpoints**: `/api/v1`
- **Formato de Comunicación**: `application/json` (UTF-8)
- **Autenticación**: Encabezado HTTP `Authorization: Bearer <jwt-token>`

---

## 2. Estructura Estándar de Respuesta (JSON Envelope)

### 2.1 Respuesta Exitosa (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operación completada con éxito",
  "data": {
    "id": "672f0b9f91a2...",
    "name": "Ejemplo"
  },
  "timestamp": "2026-11-10T23:45:00.000Z"
}
```

### 2.2 Respuesta de Error (`400`, `401`, `403`, `404`, `500`)
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "timestamp": "2026-11-10T23:45:00.000Z"
}
```

---

## 3. Códigos de Estado HTTP Utilizados

| Código | Significado | Caso de Uso |
| :--- | :--- | :--- |
| `200 OK` | Petición exitosa | Consultas (`GET`), actualizaciones exitosas (`PUT`/`PATCH`) |
| `201 Created` | Recurso creado | Creación exitosa (`POST`) |
| `204 No Content` | Sin contenido | Eliminación exitosa (`DELETE`) |
| `400 Bad Request` | Petición inválida | Error de validación en DTO |
| `401 Unauthorized` | No autenticado | Token ausente, inválido o expirado |
| `403 Forbidden` | No autorizado | Usuario autenticado pero sin permisos |
| `404 Not Found` | No encontrado | Recurso solicitado no existe en la base de datos |
| `409 Conflict` | Conflicto | Registro duplicado (ej. email ya registrado) |
| `429 Too Many Requests`| Límite excedido | Excedido el rate limit en Redis |
| `500 Internal Error` | Error de servidor | Excepción no controlada en el backend |

---

## 4. Estrategia de Claves en Redis

Para evitar colisiones entre cachés y sesiones, las claves en Redis deben seguir este patrón:
```text
naviport:<dominio>:<entidad_o_id>[:subclave]
```
Ejemplos:
- `naviport:users:profile:672f0b9f91a2` (TTL: 3600 segundos)
- `naviport:sessions:blacklist:<jwt-id>` (TTL: tiempo restante del token)
- `naviport:ratelimit:login:<ip>` (TTL: 60 segundos)

---

## 5. Documentación Interactiva (Swagger OpenAPI)

En el backend NestJS, Swagger estará habilitado en:
`http://localhost:3000/api/docs`

Los desarrolladores Frontend pueden consultar esta URL para:
1. Ver todos los endpoints disponibles.
2. Ver la estructura de los payloads (DTOs de entrada y respuesta).
3. Probar peticiones directamente desde la interfaz web.
