import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface SesionRedisData {
  token: string;
  rol: string;
  activo: string;
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
    const key = 'kpi:resumen';
    this.memoryCache.delete(key);
    if (this.isConnected) {
      await this.client.del(key);
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
}
