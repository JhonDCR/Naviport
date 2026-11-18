import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Buque,
  BuqueDocument,
  EstadoOperativoBuque,
  Mantenimiento,
  MantenimientoDocument,
  Puerto,
  PuertoDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import {
  CreateBuqueDto,
  CreateMantenimientoDto,
  CreatePuertoDto,
  UpdateBuqueDto,
  UpdateEstadoBuqueDto,
  UpdateEstadoMantenimientoDto,
  UpdatePuertoDto,
} from './dto/fleet.dto';

interface PopulatedViajeFlota {
  _id: Types.ObjectId;
  codigo: string;
  buqueId: Types.ObjectId;
  estado: string;
  capitanAsignado?: string;
  fechas: { salida: Date; llegadaEstimada: Date };
  origenId?: { ciudad?: string };
  destinoId?: { ciudad?: string };
}

export interface ViajeActivoResumen {
  codigo: string;
  ruta: string;
  eta: Date;
  progreso: number;
  estado: string;
}

export interface BuqueEnriquecido {
  _id: unknown;
  nombre: string;
  imo: string;
  tipo: string;
  capacidadToneladas: number;
  bandera: string;
  capitan: string;
  estado: string;
  estadoOperativo: EstadoOperativoBuque;
  viajeActivo: ViajeActivoResumen | null;
}

export interface BuquesPaginadosResponse {
  items: BuqueEnriquecido[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class FleetService {
  constructor(
    @InjectModel(Buque.name)
    private readonly buqueModel: Model<BuqueDocument>,
    @InjectModel(Puerto.name)
    private readonly puertoModel: Model<PuertoDocument>,
    @InjectModel(Mantenimiento.name)
    private readonly mantenimientoModel: Model<MantenimientoDocument>,
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    private readonly redisService: RedisService,
  ) {}

  private derivarEstadoOperativo(
    estado: string,
    estadoOperativo?: EstadoOperativoBuque,
  ): EstadoOperativoBuque {
    if (estadoOperativo) return estadoOperativo;
    if (estado === 'mantenimiento') return 'mantenimiento';
    if (estado === 'inactivo') return 'inactivo';
    return 'en_ruta';
  }

  async listarBuques(filtros?: {
    q?: string;
    estado?: string;
    page?: number;
    limit?: number;
  }): Promise<BuqueEnriquecido[] | BuquesPaginadosResponse> {
    const [buques, viajes] = await Promise.all([
      this.buqueModel.find().lean().exec(),
      this.viajeModel
        .find({ estado: { $in: ['en_ruta', 'retrasado', 'programado'] } })
        .populate('origenId')
        .populate('destinoId')
        .sort({ 'fechas.salida': -1 })
        .lean()
        .exec(),
    ]);

    const viajePorBuque = new Map<string, PopulatedViajeFlota>();
    for (const v of viajes as unknown as PopulatedViajeFlota[]) {
      const key = String(v.buqueId);
      if (!viajePorBuque.has(key)) {
        viajePorBuque.set(key, v);
      }
    }

    let enriquecidos: BuqueEnriquecido[] = buques.map((b) => {
      const v = viajePorBuque.get(String(b._id));
      let progreso = 0;
      if (v?.fechas?.salida && v?.fechas?.llegadaEstimada) {
        const salida = new Date(v.fechas.salida).getTime();
        const llegada = new Date(v.fechas.llegadaEstimada).getTime();
        const duracion = Math.max(1, llegada - salida);
        progreso = Number(
          Math.min(0.95, Math.max(0, (Date.now() - salida) / duracion)).toFixed(
            2,
          ),
        );
      }

      const estadoOp: EstadoOperativoBuque =
        v?.estado === 'retrasado'
          ? 'retraso'
          : (b.estadoOperativo ?? this.derivarEstadoOperativo(b.estado));

      return {
        _id: b._id,
        nombre: b.nombre,
        imo: b.imo,
        tipo: b.tipo,
        capacidadToneladas: b.capacidadToneladas,
        bandera: b.bandera,
        estado: b.estado,
        capitan: v?.capitanAsignado ?? b.capitan ?? 'Luis Andrade',
        estadoOperativo: estadoOp,
        viajeActivo: v
          ? {
              codigo: v.codigo,
              ruta: `${v.origenId?.ciudad ?? 'Origen'} a ${v.destinoId?.ciudad ?? 'Destino'}`,
              eta: v.fechas.llegadaEstimada,
              progreso,
              estado: v.estado,
            }
          : null,
      };
    });

    if (filtros?.estado && filtros.estado !== 'todos') {
      const est = filtros.estado;
      enriquecidos = enriquecidos.filter(
        (b) => b.estado === est || b.estadoOperativo === est,
      );
    }

    if (filtros?.q && filtros.q.trim().length > 0) {
      const term = filtros.q.trim().toLowerCase();
      enriquecidos = enriquecidos.filter(
        (b) =>
          b.nombre.toLowerCase().includes(term) ||
          b.imo.toLowerCase().includes(term) ||
          b.capitan.toLowerCase().includes(term) ||
          b.tipo.toLowerCase().includes(term) ||
          (b.viajeActivo?.ruta ?? '').toLowerCase().includes(term),
      );
    }

    if (filtros?.page !== undefined || filtros?.limit !== undefined) {
      const page = Math.max(1, filtros.page ?? 1);
      const limit = Math.min(100, Math.max(1, filtros.limit ?? 10));
      const total = enriquecidos.length;
      const start = (page - 1) * limit;
      return {
        items: enriquecidos.slice(start, start + limit),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    }

    return enriquecidos;
  }

  async obtenerResumenFlota() {
    const lista = (await this.listarBuques()) as Array<{
      estado: string;
      estadoOperativo: string;
      capacidadToneladas: number;
    }>;

    const flotaTotal = lista.length;
    const enTransito = lista.filter(
      (b) => b.estadoOperativo === 'en_ruta',
    ).length;
    const enPuerto = lista.filter(
      (b) => b.estadoOperativo === 'en_puerto',
    ).length;
    const enRetraso = lista.filter(
      (b) => b.estadoOperativo === 'retraso',
    ).length;
    const enMantenimiento = lista.filter(
      (b) =>
        b.estado === 'mantenimiento' || b.estadoOperativo === 'mantenimiento',
    ).length;
    const inactivos = lista.filter((b) => b.estado === 'inactivo').length;
    const capacidadNetaToneladas = lista.reduce(
      (acc, b) => acc + (b.capacidadToneladas ?? 0),
      0,
    );

    return {
      flotaTotal,
      enTransito,
      enPuerto,
      enRetraso,
      enMantenimiento,
      inactivos,
      capacidadNetaToneladas,
    };
  }

  async exportarBuquesCsv() {
    const buques = (await this.listarBuques()) as Array<{
      imo: string;
      nombre: string;
      tipo: string;
      capacidadToneladas: number;
      bandera: string;
      capitan: string;
      estado: string;
      estadoOperativo: string;
      viajeActivo?: { ruta?: string } | null;
    }>;

    const escapeCsv = (val: string | number): string =>
      `"${String(val).replace(/"/g, '""')}"`;

    const headers = [
      'IMO',
      'Nombre',
      'Tipo',
      'CapacidadToneladas',
      'Bandera',
      'Capitan',
      'Estado',
      'EstadoOperativo',
      'RutaActiva',
    ];

    const rows = buques.map((b) =>
      [
        escapeCsv(b.imo),
        escapeCsv(b.nombre),
        escapeCsv(b.tipo),
        escapeCsv(b.capacidadToneladas),
        escapeCsv(b.bandera),
        escapeCsv(b.capitan),
        escapeCsv(b.estado),
        escapeCsv(b.estadoOperativo),
        escapeCsv(b.viajeActivo?.ruta ?? 'Sin viaje asignado'),
      ].join(','),
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const dateStr = new Date().toISOString().slice(0, 10);

    return {
      filename: `naviport-flota-buques-${dateStr}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      totalRegistros: buques.length,
      csvContent,
      generadoEn: new Date().toISOString(),
    };
  }

  async crearBuque(dto: CreateBuqueDto) {
    const estadoOperativo = this.derivarEstadoOperativo(
      dto.estado,
      dto.estadoOperativo,
    );
    const buque = await this.buqueModel.create({
      ...dto,
      capitan: dto.capitan ?? 'Luis Andrade',
      estadoOperativo,
    });
    await this.redisService.invalidarKpiResumen();
    return buque;
  }

  async actualizarBuque(id: string, dto: UpdateBuqueDto) {
    const buque = await this.buqueModel.findById(id).exec();
    if (!buque) {
      throw new NotFoundException('Buque no encontrado');
    }

    if (dto.nombre !== undefined) buque.nombre = dto.nombre.trim();
    if (dto.imo !== undefined) buque.imo = dto.imo.trim();
    if (dto.tipo !== undefined) buque.tipo = dto.tipo.trim();
    if (dto.capacidadToneladas !== undefined)
      buque.capacidadToneladas = dto.capacidadToneladas;
    if (dto.bandera !== undefined) buque.bandera = dto.bandera.trim();
    if (dto.capitan !== undefined) buque.capitan = dto.capitan.trim();
    if (dto.estado !== undefined) buque.estado = dto.estado;
    if (dto.estadoOperativo !== undefined) {
      buque.estadoOperativo = dto.estadoOperativo;
    } else if (dto.estado !== undefined) {
      buque.estadoOperativo = this.derivarEstadoOperativo(dto.estado);
    }

    await buque.save();
    await this.redisService.invalidarKpiResumen();
    return buque.toObject();
  }

  async actualizarEstadoBuque(id: string, dto: UpdateEstadoBuqueDto) {
    const estadoOperativo = this.derivarEstadoOperativo(
      dto.estado,
      dto.estadoOperativo,
    );
    const buque = await this.buqueModel
      .findByIdAndUpdate(
        id,
        { estado: dto.estado, estadoOperativo },
        { new: true },
      )
      .lean()
      .exec();

    if (!buque) {
      throw new NotFoundException('Buque no encontrado');
    }

    await this.redisService.invalidarKpiResumen();
    return buque;
  }

  async eliminarBuque(id: string) {
    const buque = await this.buqueModel.findById(id).lean().exec();
    if (!buque) {
      throw new NotFoundException('Buque no encontrado');
    }

    const viajesAsociados = await this.viajeModel
      .countDocuments({ buqueId: new Types.ObjectId(id) })
      .exec();
    if (viajesAsociados > 0) {
      throw new ConflictException(
        'No se puede eliminar un buque que tiene viajes marítimos asociados',
      );
    }

    await this.buqueModel.findByIdAndDelete(id).exec();
    await this.redisService.invalidarKpiResumen();
    return { eliminado: true, imo: buque.imo };
  }

  async listarPuertos() {
    return this.puertoModel.find().lean().exec();
  }

  async crearPuerto(dto: CreatePuertoDto) {
    return this.puertoModel.create({
      nombre: dto.nombre,
      pais: dto.pais,
      ciudad: dto.ciudad,
      ubicacion: {
        type: 'Point',
        coordinates: dto.coordenadas,
      },
    });
  }

  async actualizarPuerto(id: string, dto: UpdatePuertoDto) {
    const puerto = await this.puertoModel.findById(id).exec();
    if (!puerto) {
      throw new NotFoundException('Puerto no encontrado');
    }

    if (dto.nombre !== undefined) puerto.nombre = dto.nombre.trim();
    if (dto.pais !== undefined) puerto.pais = dto.pais.trim();
    if (dto.ciudad !== undefined) puerto.ciudad = dto.ciudad.trim();
    if (dto.coordenadas !== undefined) {
      puerto.ubicacion = {
        type: 'Point',
        coordinates: dto.coordenadas,
      };
    }

    await puerto.save();
    return puerto.toObject();
  }

  async eliminarPuerto(id: string) {
    const puerto = await this.puertoModel.findById(id).lean().exec();
    if (!puerto) {
      throw new NotFoundException('Puerto no encontrado');
    }

    const objId = new Types.ObjectId(id);
    const viajesEnPuerto = await this.viajeModel
      .countDocuments({ $or: [{ origenId: objId }, { destinoId: objId }] })
      .exec();
    if (viajesEnPuerto > 0) {
      throw new ConflictException(
        'No se puede eliminar un puerto vinculado a viajes registrados',
      );
    }

    await this.puertoModel.findByIdAndDelete(id).exec();
    return { eliminado: true, id };
  }

  async listarMantenimientos() {
    return this.mantenimientoModel.find().populate('buqueId').lean().exec();
  }

  async programarMantenimiento(dto: CreateMantenimientoDto) {
    const mant = await this.mantenimientoModel.create({
      buqueId: new Types.ObjectId(dto.buqueId),
      tipo: dto.tipo,
      descripcion: dto.descripcion?.trim(),
      costoUSD: dto.costoUSD ?? 0,
      responsable: dto.responsable?.trim(),
      fechas: {
        programada: new Date(dto.fechaProgramada),
      },
      estado: 'pendiente',
    });

    const buque = await this.buqueModel.findById(dto.buqueId).lean().exec();
    if (buque && new Date(dto.fechaProgramada).getTime() < Date.now()) {
      await this.redisService.agregarAlerta(
        `mantenimiento_vencido:${buque.imo}`,
      );
    }

    return mant;
  }

  async actualizarEstadoMantenimiento(
    id: string,
    dto: UpdateEstadoMantenimientoDto,
  ) {
    const mant = await this.mantenimientoModel.findById(id).exec();
    if (!mant) {
      throw new NotFoundException('Registro de mantenimiento no encontrado');
    }

    mant.estado = dto.estado;
    if (dto.estado === 'completado') {
      mant.fechas = {
        ...mant.fechas,
        real: dto.fechaReal ? new Date(dto.fechaReal) : new Date(),
      };
    }

    await mant.save();

    const buque = await this.buqueModel.findById(mant.buqueId).exec();
    if (buque && dto.estado === 'completado') {
      await this.redisService.eliminarAlerta(
        `mantenimiento_vencido:${buque.imo}`,
      );
      if (buque.estado === 'mantenimiento') {
        buque.estado = 'activo';
        buque.estadoOperativo = 'en_puerto';
        await buque.save();
      }
      await this.redisService.invalidarKpiResumen();
    }

    return this.mantenimientoModel
      .findById(mant._id)
      .populate('buqueId')
      .lean()
      .exec();
  }

  async eliminarMantenimiento(id: string) {
    const mant = await this.mantenimientoModel.findById(id).lean().exec();
    if (!mant) {
      throw new NotFoundException('Registro de mantenimiento no encontrado');
    }

    const buque = await this.buqueModel.findById(mant.buqueId).lean().exec();
    if (buque) {
      await this.redisService.eliminarAlerta(
        `mantenimiento_vencido:${buque.imo}`,
      );
    }

    await this.mantenimientoModel.findByIdAndDelete(id).exec();
    await this.redisService.invalidarKpiResumen();
    return { eliminado: true, id };
  }
}

