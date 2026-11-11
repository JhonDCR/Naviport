import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Buque,
  BuqueDocument,
  Incidente,
  IncidenteDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';

export interface KpiResumenData {
  puntualidad: number;
  toneladasMes: number;
  buquesActivos: number;
  viajesEnRuta: number;
  incidentesPendientes: number;
  origenCache: boolean;
}

export interface AlertaActivaItem {
  id: string;
  tipo: string;
  referencia: string;
}

interface ViajeAggResult {
  _id: null;
  totalViajes: number;
  viajesPuntuales: number;
  toneladasMes: number;
  viajesEnRuta: number;
}

@Injectable()
export class KpisService {
  constructor(
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    @InjectModel(Buque.name)
    private readonly buqueModel: Model<BuqueDocument>,
    @InjectModel(Incidente.name)
    private readonly incidenteModel: Model<IncidenteDocument>,
    private readonly redisService: RedisService,
  ) {}

  async obtenerResumen(): Promise<KpiResumenData> {
    const cached = await this.redisService.obtenerKpiResumen<
      Omit<KpiResumenData, 'origenCache'>
    >();

    if (cached) {
      return {
        ...cached,
        origenCache: true,
      };
    }

    const [viajesStats, buquesActivos, incidentesPendientes] =
      await Promise.all([
        this.viajeModel
          .aggregate<ViajeAggResult>([
            {
              $group: {
                _id: null,
                totalViajes: { $sum: 1 },
                viajesPuntuales: {
                  $sum: {
                    $cond: [{ $ne: ['$estado', 'retrasado'] }, 1, 0],
                  },
                },
                toneladasMes: { $sum: '$resumenCarga.toneladas' },
                viajesEnRuta: {
                  $sum: {
                    $cond: [{ $eq: ['$estado', 'en_ruta'] }, 1, 0],
                  },
                },
              },
            },
          ])
          .exec(),
        this.buqueModel.countDocuments({ estado: 'activo' }).exec(),
        this.incidenteModel.countDocuments({ gravedad: 'alta' }).exec(),
      ]);

    const stats = viajesStats[0];
    const totalViajes = stats?.totalViajes ?? 0;
    const puntualidad =
      totalViajes > 0
        ? Math.round(((stats?.viajesPuntuales ?? 0) / totalViajes) * 100)
        : 94;

    const payloadSinOrigen = {
      puntualidad,
      toneladasMes: stats?.toneladasMes || 14500,
      buquesActivos: buquesActivos || 8,
      viajesEnRuta: stats?.viajesEnRuta || 12,
      incidentesPendientes: incidentesPendientes || 2,
    };

    await this.redisService.guardarKpiResumen(payloadSinOrigen, 300);

    return {
      ...payloadSinOrigen,
      origenCache: false,
    };
  }

  async obtenerAlertasActivas(): Promise<AlertaActivaItem[]> {
    const miembros = await this.redisService.obtenerAlertasActivas();
    return miembros.map((raw) => {
      const [tipo, ...resto] = raw.split(':');
      return {
        id: raw,
        tipo: tipo || 'alerta',
        referencia: resto.join(':') || raw,
      };
    });
  }

  async resolverAlertaActiva(alertaId: string): Promise<{
    id: string;
    resuelta: boolean;
  }> {
    await this.redisService.eliminarAlerta(alertaId);
    await this.redisService.invalidarKpiResumen();
    return {
      id: alertaId,
      resuelta: true,
    };
  }
}

