import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface SesionRedisData {
  token: string;
  rol: string;
  activo: string;
}

export interface TurnoActivoRedisData {
  turnoId: string;
  tipoTurno: string;
  horarioAsignado: string;
  fechaInicio: string;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private isConnected = false;

  // Fallback en memoria para entorno de test/CI si Redis no está levantado
  private readonly memorySessions = new Map<string, SesionRedisData>();
  private readonly memoryCache = new Map<string, { value: string; expiresAt: number }>();
  private readonly memoryAlerts = new Set<string>();
  private readonly memoryReadNotifs = new Map<string, Set<string>>();
  private readonly memoryRateLimits = new Map<string, { count: number; expiresAt: number }>();
  private readonly memoryAuditLog: Array<Record<string, unknown>> = [];
  private readonly memoryActiveShifts = new Map<
    string,
    { data: TurnoActivoRedisData; expiresAt: number }
  >();

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>(
      'REDIS_PASSWORD',
      'redis_naviport_secret',
    );

    this.client = new Redis({
      host,
      port,
      password,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log(`Conectado a Redis en ${host}:${port}`);
    });

    this.client.on('error', (err: Error) => {
      this.isConnected = false;
      this.logger.warn(`Redis aviso (${err.message}). Usando fallback seguro si no conecta.`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      this.isConnected = false;
      this.logger.warn('Redis no disponible al iniciar; operando con almacenamiento en memoria de respaldo.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  // ========================================================
  // 1. Sesiones: sesion:{idUsuario} (Hash)
  // ========================================================
  async guardarDesafioGoogle(nonce: string): Promise<void> {
    if (!this.isConnected) throw new ServiceUnavailableException('Verificación con Google no disponible');
    await this.client.set(`auth:google:${nonce}`, '1', 'EX', 600);
  }

  async consumirDesafioGoogle(nonce: string): Promise<boolean> {
    if (!this.isConnected) throw new ServiceUnavailableException('Verificación con Google no disponible');
    return (await this.client.del(`auth:google:${nonce}`)) === 1;
  }

  async guardarSesion(
    idUsuario: string,
    data: SesionRedisData,
    ttlSeconds = 604800,
  ): Promise<void> {
    const key = `sesion:${idUsuario}`;
    this.memorySessions.set(key, data);
    if (this.isConnected) {
      await this.client.hset(key, {
        token: data.token,
        rol: data.rol,
        activo: data.activo,
      });
      await this.client.expire(key, ttlSeconds);
    }
  }

  async obtenerSesion(idUsuario: string): Promise<SesionRedisData | null> {
    const key = `sesion:${idUsuario}`;
    if (this.isConnected) {
      const data = await this.client.hgetall(key);
      if (!data || !data.token) {
        return null;
      }
      return {
        token: data.token,
        rol: data.rol,
        activo: data.activo,
      };
    }
    return this.memorySessions.get(key) ?? null;
  }

  async revocarSesion(idUsuario: string): Promise<void> {
    const key = `sesion:${idUsuario}`;
    this.memorySessions.delete(key);
    if (this.isConnected) {
      await this.client.del(key);
    }
  }

  // ========================================================
  // 2. Caché de KPIs: kpi:resumen (TTL 300s)
  // ========================================================
  async obtenerKpiResumen<T>(): Promise<T | null> {
    const key = 'kpi:resumen';
    if (this.isConnected) {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return JSON.parse(cached.value) as T;
    }
    return null;
  }

  async guardarKpiResumen<T>(data: T, ttlSeconds = 300): Promise<void> {
    const key = 'kpi:resumen';
    const serialized = JSON.stringify(data);
    this.memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    if (this.isConnected) {
      await this.client.setex(key, ttlSeconds, serialized);
    }
  }

  async invalidarKpiResumen(): Promise<void> {
    const keys = [
      'kpi:resumen',
      'kpi:reportes:mes',
      'kpi:reportes:trimestre',
      'kpi:reportes:anio',
    ];
    for (const k of keys) {
      this.memoryCache.delete(k);
    }
    if (this.isConnected) {
      await this.client.del(...keys);
    }
  }

  // ========================================================
  // 2.1 Caché de Reportes Gerenciales: kpi:reportes:{periodo} (TTL 300s)
  // ========================================================
  async obtenerKpiReportes<T>(periodo: string): Promise<T | null> {
    const key = `kpi:reportes:${periodo}`;
    if (this.isConnected) {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return JSON.parse(cached.value) as T;
    }
    return null;
  }

  async guardarKpiReportes<T>(
    periodo: string,
    data: T,
    ttlSeconds = 300,
  ): Promise<void> {
    const key = `kpi:reportes:${periodo}`;
    const serialized = JSON.stringify(data);
    this.memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    if (this.isConnected) {
      await this.client.setex(key, ttlSeconds, serialized);
    }
  }

  // ========================================================
  // 3. Alertas Críticas: alertas:activas (Set)
  // ========================================================
  async agregarAlerta(alerta: string): Promise<void> {
    const key = 'alertas:activas';
    this.memoryAlerts.add(alerta);
    if (this.isConnected) {
      await this.client.sadd(key, alerta);
    }
  }

  async obtenerAlertasActivas(): Promise<string[]> {
    const key = 'alertas:activas';
    if (this.isConnected) {
      return this.client.smembers(key);
    }
    return Array.from(this.memoryAlerts);
  }

  async eliminarAlerta(alerta: string): Promise<void> {
    const key = 'alertas:activas';
    this.memoryAlerts.delete(alerta);
    if (this.isConnected) {
      await this.client.srem(key, alerta);
    }
  }

  // ========================================================
  // 4. Notificaciones leídas por usuario: notificaciones:leidas:{idUsuario} (Set)
  // ========================================================
  async marcarNotificacionLeida(
    idUsuario: string,
    notificacionId: string,
  ): Promise<void> {
    const key = `notificaciones:leidas:${idUsuario}`;
    const set = this.memoryReadNotifs.get(key) ?? new Set<string>();
    set.add(notificacionId);
    this.memoryReadNotifs.set(key, set);
    if (this.isConnected) {
      await this.client.sadd(key, notificacionId);
      await this.client.expire(key, 2592000); // 30 días
    }
  }

  async marcarTodasNotificacionesLeidas(
    idUsuario: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const key = `notificaciones:leidas:${idUsuario}`;
    const set = this.memoryReadNotifs.get(key) ?? new Set<string>();
    for (const id of ids) {
      set.add(id);
    }
    this.memoryReadNotifs.set(key, set);
    if (this.isConnected) {
      await this.client.sadd(key, ...ids);
      await this.client.expire(key, 2592000);
    }
  }

  async obtenerNotificacionesLeidas(idUsuario: string): Promise<string[]> {
    const key = `notificaciones:leidas:${idUsuario}`;
    if (this.isConnected) {
      return this.client.smembers(key);
    }
    return Array.from(this.memoryReadNotifs.get(key) ?? []);
  }

  // ========================================================
  // 5. Rate Limiting de Login: ratelimit:login:{identificador} (String/Counter, TTL 60s)
  // ========================================================
  async verificarYRegistrarIntentoLogin(
    identificador: string,
    maxIntentos = 5,
    ttlSeconds = 60,
  ): Promise<{ permitido: boolean; intentos: number; restantes: number }> {
    const key = `ratelimit:login:${identificador.toLowerCase().trim()}`;
    if (this.isConnected) {
      const intentos = await this.client.incr(key);
      if (intentos === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      const permitido = intentos <= maxIntentos;
      return {
        permitido,
        intentos,
        restantes: Math.max(0, maxIntentos - intentos),
      };
    }

    const now = Date.now();
    const existing = this.memoryRateLimits.get(key);
    if (!existing || existing.expiresAt <= now) {
      const entry = { count: 1, expiresAt: now + ttlSeconds * 1000 };
      this.memoryRateLimits.set(key, entry);
      return {
        permitido: true,
        intentos: 1,
        restantes: Math.max(0, maxIntentos - 1),
      };
    }

    existing.count += 1;
    const permitido = existing.count <= maxIntentos;
    return {
      permitido,
      intentos: existing.count,
      restantes: Math.max(0, maxIntentos - existing.count),
    };
  }

  async limpiarIntentosLogin(identificador: string): Promise<void> {
    const key = `ratelimit:login:${identificador.toLowerCase().trim()}`;
    this.memoryRateLimits.delete(key);
    if (this.isConnected) {
      await this.client.del(key);
    }
  }

  // ========================================================
  // 6. Log de Auditoría en Tiempo Real: auditoria:eventos (List, max 100)
  // ========================================================
  async registrarAuditoria(evento: {
    usuarioId: string;
    accion: string;
    entidad: string;
    detalle?: string;
  }): Promise<void> {
    const key = 'auditoria:eventos';
    const registro = {
      ...evento,
      fecha: new Date().toISOString(),
    };
    this.memoryAuditLog.unshift(registro);
    if (this.memoryAuditLog.length > 100) {
      this.memoryAuditLog.length = 100;
    }
    if (this.isConnected) {
      await this.client.lpush(key, JSON.stringify(registro));
      await this.client.ltrim(key, 0, 99);
    }
  }

  async obtenerAuditoria(
    limite = 50,
  ): Promise<Array<Record<string, unknown>>> {
    const key = 'auditoria:eventos';
    const max = Math.max(1, Math.min(100, limite));
    if (this.isConnected) {
      const items = await this.client.lrange(key, 0, max - 1);
      return items.map((item) => JSON.parse(item) as Record<string, unknown>);
    }
    return this.memoryAuditLog.slice(0, max);
  }

  // ========================================================
  // 7. Turno activo del operador: turno:activo:{idOperador} (Hash, TTL 12h)
  // ========================================================
  async guardarTurnoActivo(
    idOperador: string,
    turnoData: TurnoActivoRedisData,
    ttlSeconds = 43200,
  ): Promise<void> {
    const key = `turno:activo:${idOperador}`;
    this.memoryActiveShifts.set(key, {
      data: turnoData,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    if (this.isConnected) {
      await this.client.hset(key, {
        turnoId: turnoData.turnoId,
        tipoTurno: turnoData.tipoTurno,
        horarioAsignado: turnoData.horarioAsignado,
        fechaInicio: turnoData.fechaInicio,
      });
      await this.client.expire(key, ttlSeconds);
    }
  }

  async obtenerTurnoActivo(
    idOperador: string,
  ): Promise<TurnoActivoRedisData | null> {
    const key = `turno:activo:${idOperador}`;
    if (this.isConnected) {
      const data = await this.client.hgetall(key);
      if (!data || !data.turnoId) {
        return null;
      }
      return {
        turnoId: data.turnoId,
        tipoTurno: data.tipoTurno,
        horarioAsignado: data.horarioAsignado,
        fechaInicio: data.fechaInicio,
      };
    }
    const cached = this.memoryActiveShifts.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    this.memoryActiveShifts.delete(key);
    return null;
  }

  async eliminarTurnoActivo(idOperador: string): Promise<void> {
    const key = `turno:activo:${idOperador}`;
    this.memoryActiveShifts.delete(key);
    if (this.isConnected) {
      await this.client.del(key);
    }
  }
}
