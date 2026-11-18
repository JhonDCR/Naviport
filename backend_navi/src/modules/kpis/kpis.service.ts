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

export type PeriodoReporte = 'mes' | 'trimestre' | 'anio';

export interface ToneladasMesItem {
  mes: string;
  anio: number;
  toneladas: number;
}

export interface KpiResumenData {
  puntualidad: number;
  toneladasMes: number;
  buquesActivos: number;
  totalBuques: number;
  porcentajeFlotaOperativa: number;
  viajesEnRuta: number;
  incidentesPendientes: number;
  toneladasPorMes: ToneladasMesItem[];
  distribucionEstadoViajes: {
    en_ruta: number;
    programado: number;
    finalizado: number;
    retrasado: number;
  };
  enviosYAlertasRecientes: Array<Record<string, unknown>>;
  origenCache: boolean;
}

export interface AlertaActivaItem {
  id: string;
  tipo: string;
  referencia: string;
}

export interface ReporteGerencialData {
  periodo: PeriodoReporte;
  ingresosUSD: number;
  costoOperativoUSD: number;
  margenOperativoUSD: number;
  margenPorcentaje: number;
  viajesCompletados: number;
  puntualidad: number;
  evolucionIngresos: Array<{
    mes: string;
    anio: number;
    ingresosUSD: number;
    costoOperativoUSD: number;
    puntualidad: number;
  }>;
  cargaPorRuta: Array<{
    ruta: string;
    toneladas: number;
    viajes: number;
  }>;
  enviosYAlertasRecientes: Array<Record<string, unknown>>;
  origenCache: boolean;
}

interface ViajeAggResult {
  _id: null;
  totalViajes: number;
  viajesPuntuales: number;
  toneladasMes: number;
  viajesEnRuta: number;
  viajesProgramados: number;
  viajesFinalizados: number;
  viajesRetrasados: number;
}

interface PopulatedViajeReporte {
  _id: unknown;
  codigo: string;
  estado: string;
  fechas: { salida: Date; llegadaEstimada: Date; llegadaReal?: Date };
  buqueId?: { nombre?: string; imo?: string };
  origenId?: { ciudad?: string; pais?: string };
  destinoId?: { ciudad?: string; pais?: string };
  resumenCarga?: { contenedores?: number; toneladas?: number };
  finanzas?: { ingresosEstimadosUSD?: number; costoOperativoUSD?: number };
}

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

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

  private normalizarPeriodo(periodo?: string): PeriodoReporte {
    if (periodo === 'trimestre' || periodo === 'anio') {
      return periodo;
    }
    return 'mes';
  }

  private obtenerFechaCorte(periodo: PeriodoReporte): Date {
    const ahora = new Date();
    const dias =
      periodo === 'mes' ? 30 : periodo === 'trimestre' ? 90 : 365;
    return new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000);
  }

  private async obtenerEnviosYAlertasRecientes(): Promise<
    Array<Record<string, unknown>>
  > {
    const [viajesRecientes, incidentesAbiertos] = await Promise.all([
      this.viajeModel
        .find()
        .populate('buqueId')
        .populate('origenId')
        .populate('destinoId')
        .sort({ 'fechas.salida': -1 })
        .limit(5)
        .lean()
        .exec(),
      this.incidenteModel
        .find({ estado: { $ne: 'resuelto' } })
        .populate('viajeId')
        .populate('buqueId')
        .sort({ fecha: -1 })
        .limit(5)
        .lean()
        .exec(),
    ]);

    const eventosViajes = (
      viajesRecientes as unknown as PopulatedViajeReporte[]
    ).map((v) => ({
      tipoRegistro: 'viaje',
      referencia: v.codigo,
      buque: v.buqueId?.nombre ?? 'N/A',
      ruta: `${v.origenId?.ciudad ?? 'Origen'} → ${v.destinoId?.ciudad ?? 'Destino'}`,
      estado: v.estado,
      toneladas: v.resumenCarga?.toneladas ?? 0,
      fecha: v.fechas?.salida ?? new Date(),
    }));

    const eventosIncidentes = incidentesAbiertos.map((inc) => {
      const viajePop = inc.viajeId as unknown as { codigo?: string } | null;
      const buquePop = inc.buqueId as unknown as { nombre?: string } | null;
      return {
        tipoRegistro: 'alerta_incidente',
        id: String(inc._id),
        referencia: viajePop?.codigo ?? String(inc.viajeId),
        buque: buquePop?.nombre ?? 'N/A',
        ruta: inc.descripcion,
        estado: inc.estado ?? 'abierto',
        gravedad: inc.gravedad,
        fecha: inc.fecha,
      };
    });

    return [...eventosIncidentes, ...eventosViajes].slice(0, 8);
  }

  private construirSerieMensual(
    viajes: PopulatedViajeReporte[],
    cantidadMeses = 6,
  ) {
    const ahora = new Date();
    const mapa = new Map<
      string,
      {
        mes: string;
        anio: number;
        toneladas: number;
        ingresosUSD: number;
        costoOperativoUSD: number;
        total: number;
        puntuales: number;
      }
    >();

    for (let i = cantidadMeses - 1; i >= 0; i -= 1) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      mapa.set(key, {
        mes: MESES_CORTOS[d.getMonth()],
        anio: d.getFullYear(),
        toneladas: 0,
        ingresosUSD: 0,
        costoOperativoUSD: 0,
        total: 0,
        puntuales: 0,
      });
    }

    for (const v of viajes) {
      if (!v.fechas?.salida) continue;
      const d = new Date(v.fechas.salida);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = mapa.get(key);
      if (bucket) {
        bucket.toneladas += v.resumenCarga?.toneladas ?? 0;
        bucket.ingresosUSD += v.finanzas?.ingresosEstimadosUSD ?? 0;
        bucket.costoOperativoUSD += v.finanzas?.costoOperativoUSD ?? 0;
        bucket.total += 1;
        if (v.estado !== 'retrasado') {
          bucket.puntuales += 1;
        }
      }
    }

    return Array.from(mapa.values());
  }

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

    const [
      viajesStats,
      buquesActivos,
      totalBuques,
      incidentesPendientes,
      viajesTodos,
      enviosYAlertasRecientes,
    ] = await Promise.all([
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
              viajesProgramados: {
                $sum: {
                  $cond: [{ $eq: ['$estado', 'programado'] }, 1, 0],
                },
              },
              viajesFinalizados: {
                $sum: {
                  $cond: [{ $eq: ['$estado', 'finalizado'] }, 1, 0],
                },
              },
              viajesRetrasados: {
                $sum: {
                  $cond: [{ $eq: ['$estado', 'retrasado'] }, 1, 0],
                },
              },
            },
          },
        ])
        .exec(),
      this.buqueModel.countDocuments({ estado: 'activo' }).exec(),
      this.buqueModel.countDocuments().exec(),
      this.incidenteModel
        .countDocuments({ estado: { $ne: 'resuelto' } })
        .exec(),
      this.viajeModel.find().lean().exec(),
      this.obtenerEnviosYAlertasRecientes(),
    ]);

    const stats = viajesStats[0];
    const totalViajes = stats?.totalViajes ?? 0;
    const puntualidad =
      totalViajes > 0
        ? Math.round(((stats?.viajesPuntuales ?? 0) / totalViajes) * 100)
        : 94;

    const serieMensual = this.construirSerieMensual(
      viajesTodos as unknown as PopulatedViajeReporte[],
      6,
    );

    const payloadSinOrigen: Omit<KpiResumenData, 'origenCache'> = {
      puntualidad,
      toneladasMes: stats?.toneladasMes ?? 0,
      buquesActivos,
      totalBuques,
      porcentajeFlotaOperativa:
        totalBuques > 0 ? Math.round((buquesActivos / totalBuques) * 100) : 0,
      viajesEnRuta: stats?.viajesEnRuta ?? 0,
      incidentesPendientes,
      toneladasPorMes: serieMensual.map((item) => ({
        mes: item.mes,
        anio: item.anio,
        toneladas: item.toneladas,
      })),
      distribucionEstadoViajes: {
        en_ruta: stats?.viajesEnRuta ?? 0,
        programado: stats?.viajesProgramados ?? 0,
        finalizado: stats?.viajesFinalizados ?? 0,
        retrasado: stats?.viajesRetrasados ?? 0,
      },
      enviosYAlertasRecientes,
    };

    await this.redisService.guardarKpiResumen(payloadSinOrigen, 300);

    return {
      ...payloadSinOrigen,
      origenCache: false,
    };
  }

  async obtenerReportes(periodoRaw?: string): Promise<ReporteGerencialData> {
    const periodo = this.normalizarPeriodo(periodoRaw);
    const cached = await this.redisService.obtenerKpiReportes<
      Omit<ReporteGerencialData, 'origenCache'>
    >(periodo);

    if (cached) {
      return {
        ...cached,
        origenCache: true,
      };
    }

    const fechaCorte = this.obtenerFechaCorte(periodo);
    const [viajesFiltrados, viajesTodos, enviosYAlertasRecientes] =
      await Promise.all([
        this.viajeModel
          .find({ 'fechas.salida': { $gte: fechaCorte } })
          .populate('buqueId')
          .populate('origenId')
          .populate('destinoId')
          .lean()
          .exec(),
        this.viajeModel
          .find()
          .populate('origenId')
          .populate('destinoId')
          .lean()
          .exec(),
        this.obtenerEnviosYAlertasRecientes(),
      ]);

    const viajesPop =
      viajesFiltrados as unknown as PopulatedViajeReporte[];

    let ingresosUSD = 0;
    let costoOperativoUSD = 0;
    let viajesCompletados = 0;
    let viajesPuntuales = 0;
    const rutasMap = new Map<
      string,
      { ruta: string; toneladas: number; viajes: number }
    >();

    for (const v of viajesPop) {
      ingresosUSD += v.finanzas?.ingresosEstimadosUSD ?? 0;
      costoOperativoUSD += v.finanzas?.costoOperativoUSD ?? 0;
      if (v.estado === 'finalizado') {
        viajesCompletados += 1;
      }
      if (v.estado !== 'retrasado') {
        viajesPuntuales += 1;
      }

      const rutaNombre = `${v.origenId?.ciudad ?? 'Origen'} → ${v.destinoId?.ciudad ?? 'Destino'}`;
      const current = rutasMap.get(rutaNombre) ?? {
        ruta: rutaNombre,
        toneladas: 0,
        viajes: 0,
      };
      current.toneladas += v.resumenCarga?.toneladas ?? 0;
      current.viajes += 1;
      rutasMap.set(rutaNombre, current);
    }

    const margenOperativoUSD = Math.max(0, ingresosUSD - costoOperativoUSD);
    const margenPorcentaje =
      ingresosUSD > 0
        ? Math.round((margenOperativoUSD / ingresosUSD) * 100)
        : 0;
    const puntualidad =
      viajesPop.length > 0
        ? Math.round((viajesPuntuales / viajesPop.length) * 100)
        : 100;

    const serieMensual = this.construirSerieMensual(
      viajesTodos as unknown as PopulatedViajeReporte[],
      6,
    );

    const payload: Omit<ReporteGerencialData, 'origenCache'> = {
      periodo,
      ingresosUSD,
      costoOperativoUSD,
      margenOperativoUSD,
      margenPorcentaje,
      viajesCompletados,
      puntualidad,
      evolucionIngresos: serieMensual.map((item) => ({
        mes: item.mes,
        anio: item.anio,
        ingresosUSD: item.ingresosUSD,
        costoOperativoUSD: item.costoOperativoUSD,
        puntualidad:
          item.total > 0 ? Math.round((item.puntuales / item.total) * 100) : 100,
      })),
      cargaPorRuta: Array.from(rutasMap.values()).sort(
        (a, b) => b.toneladas - a.toneladas,
      ),
      enviosYAlertasRecientes,
    };

    await this.redisService.guardarKpiReportes(periodo, payload, 300);

    return {
      ...payload,
      origenCache: false,
    };
  }

  async exportarReportesCsv(periodoRaw?: string) {
    const periodo = this.normalizarPeriodo(periodoRaw);
    const fechaCorte = this.obtenerFechaCorte(periodo);

    const viajes = (await this.viajeModel
      .find({ 'fechas.salida': { $gte: fechaCorte } })
      .populate('buqueId')
      .populate('origenId')
      .populate('destinoId')
      .sort({ 'fechas.salida': -1 })
      .lean()
      .exec()) as unknown as PopulatedViajeReporte[];

    const escapeCsv = (val: string | number): string => {
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'Codigo',
      'Buque',
      'Origen',
      'Destino',
      'Estado',
      'Salida',
      'LlegadaEstimada',
      'Contenedores',
      'Toneladas',
      'IngresosUSD',
      'CostoOperativoUSD',
      'MargenUSD',
    ];

    const rows = viajes.map((v) => {
      const ingresos = v.finanzas?.ingresosEstimadosUSD ?? 0;
      const costos = v.finanzas?.costoOperativoUSD ?? 0;
      return [
        escapeCsv(v.codigo),
        escapeCsv(v.buqueId?.nombre ?? 'N/A'),
        escapeCsv(v.origenId?.ciudad ?? 'N/A'),
        escapeCsv(v.destinoId?.ciudad ?? 'N/A'),
        escapeCsv(v.estado),
        escapeCsv(
          v.fechas?.salida ? new Date(v.fechas.salida).toISOString() : '',
        ),
        escapeCsv(
          v.fechas?.llegadaEstimada
            ? new Date(v.fechas.llegadaEstimada).toISOString()
            : '',
        ),
        escapeCsv(v.resumenCarga?.contenedores ?? 0),
        escapeCsv(v.resumenCarga?.toneladas ?? 0),
        escapeCsv(ingresos),
        escapeCsv(costos),
        escapeCsv(ingresos - costos),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const dateStr = new Date().toISOString().slice(0, 10);

    return {
      filename: `naviport-reporte-${periodo}-${dateStr}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      totalRegistros: viajes.length,
      csvContent,
      generadoEn: new Date().toISOString(),
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

