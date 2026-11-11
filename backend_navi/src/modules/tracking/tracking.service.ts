import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import {
  Buque,
  BuqueDocument,
  Carga,
  CargaDocument,
  Puerto,
  PuertoDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RolUsuario } from '../../common/enums/rol.enum';
import { JwtPayload } from '../../common/interfaces/api-response.interface';
import { RedisService } from '../../redis/redis.service';
import {
  AddEventoTimelineDto,
  CreateCargaDto,
  CreateViajeDto,
  UpdateEstadoViajeDto,
} from './dto/tracking.dto';

interface PopulatedViaje {
  _id: Types.ObjectId;
  codigo: string;
  buqueId?: { _id?: Types.ObjectId; nombre: string; imo?: string };
  origenId?: {
    _id?: Types.ObjectId;
    ciudad: string;
    nombre: string;
    pais: string;
    ubicacion?: { type: string; coordinates: [number, number] };
  };
  destinoId?: {
    _id?: Types.ObjectId;
    ciudad: string;
    nombre: string;
    pais: string;
    ubicacion?: { type: string; coordinates: [number, number] };
  };
  fechas: {
    salida: Date;
    llegadaEstimada: Date;
    llegadaReal?: Date;
  };
  estado: string;
  ultimaPosicion?: {
    type: string;
    coordinates: [number, number];
  };
}

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(Carga.name)
    private readonly cargaModel: Model<CargaDocument>,
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    @InjectModel(Buque.name)
    private readonly buqueModel: Model<BuqueDocument>,
    @InjectModel(Puerto.name)
    private readonly puertoModel: Model<PuertoDocument>,
    private readonly redisService: RedisService,
  ) {}

  async obtenerMisCargas(
    user: JwtPayload,
    estadoFiltro?: string,
    busqueda?: string,
  ) {
    const query: Record<string, unknown> = {};
    if (user.rol === RolUsuario.CLIENTE && isValidObjectId(user.sub)) {
      query.clienteId = new Types.ObjectId(user.sub);
    }

    const cargas = await this.cargaModel
      .find(query)
      .populate({
        path: 'viajeId',
        populate: [
          { path: 'buqueId', model: this.buqueModel },
          { path: 'origenId', model: this.puertoModel },
          { path: 'destinoId', model: this.puertoModel },
        ],
      })
      .lean()
      .exec();

    let resultado = cargas.map((c) => {
      const viajePop = c.viajeId as unknown as PopulatedViaje | null;
      const salida = viajePop?.fechas?.salida
        ? new Date(viajePop.fechas.salida)
        : new Date();
      const llegadaEstimada = viajePop?.fechas?.llegadaEstimada
        ? new Date(viajePop.fechas.llegadaEstimada)
        : new Date();
      const diffMs = llegadaEstimada.getTime() - Date.now();
      const diasRestantes = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
      );

      const duracionTotal = Math.max(
        1,
        llegadaEstimada.getTime() - salida.getTime(),
      );
      const transcurrido = Math.max(0, Date.now() - salida.getTime());
      const progreso =
        viajePop?.estado === 'finalizado'
          ? 1
          : Number(Math.min(0.95, transcurrido / duracionTotal).toFixed(2));

      const origenStr = viajePop?.origenId
        ? `${viajePop.origenId.ciudad} (${viajePop.origenId.nombre} - ${viajePop.origenId.pais})`
        : 'N/A';
      const destinoStr = viajePop?.destinoId
        ? `${viajePop.destinoId.ciudad} (${viajePop.destinoId.nombre} - ${viajePop.destinoId.pais})`
        : 'N/A';

      return {
        id: String(c._id),
        codigoContenedor: c.codigoContenedor,
        tipo: c.tipo,
        pesoToneladas: c.pesoToneladas,
        viaje: {
          id: viajePop?._id ? String(viajePop._id) : null,
          codigo: viajePop?.codigo ?? 'N/A',
          buque: viajePop?.buqueId?.nombre ?? 'N/A',
          origen: origenStr,
          destino: destinoStr,
          salida: viajePop?.fechas?.salida ?? null,
          llegadaEstimada: viajePop?.fechas?.llegadaEstimada ?? null,
          estado: viajePop?.estado ?? 'en_ruta',
          diasRestantes,
          progreso,
          ultimaPosicion: viajePop?.ultimaPosicion ?? null,
        },
      };
    });

    if (estadoFiltro === 'completados') {
      resultado = resultado.filter((item) => item.viaje.estado === 'finalizado');
    } else if (estadoFiltro === 'en_curso') {
      resultado = resultado.filter((item) => item.viaje.estado !== 'finalizado');
    }

    if (busqueda && busqueda.trim().length > 0) {
      const term = busqueda.trim().toLowerCase();
      resultado = resultado.filter(
        (item) =>
          item.codigoContenedor.toLowerCase().includes(term) ||
          item.viaje.codigo.toLowerCase().includes(term) ||
          item.viaje.buque.toLowerCase().includes(term) ||
          item.viaje.origen.toLowerCase().includes(term) ||
          item.viaje.destino.toLowerCase().includes(term),
      );
    }

    return resultado;
  }

  private async buscarCargaDocumento(idOrCodigo: string) {
    let carga: CargaDocument | null = null;

    if (isValidObjectId(idOrCodigo)) {
      carga = await this.cargaModel.findById(idOrCodigo).exec();
    }

    if (!carga) {
      const normalized = idOrCodigo.startsWith('#')
        ? idOrCodigo
        : `#${idOrCodigo}`;
      carga = await this.cargaModel
        .findOne({
          codigoContenedor: { $in: [idOrCodigo, normalized] },
        })
        .exec();
    }

    if (!carga) {
      throw new NotFoundException('Contenedor o carga no encontrada');
    }

    return carga;
  }

  private verificarAccesoCliente(carga: Carga, user?: JwtPayload): void {
    if (
      user &&
      user.rol === RolUsuario.CLIENTE &&
      String(carga.clienteId) !== user.sub
    ) {
      throw new ForbiddenException(
        'No tienes permiso para consultar contenedores de otro cliente',
      );
    }
  }

  async obtenerDetalleCarga(idOrCodigo: string, user?: JwtPayload) {
    const cargaDoc = await this.buscarCargaDocumento(idOrCodigo);
    this.verificarAccesoCliente(cargaDoc, user);

    const cargaPop = await this.cargaModel
      .findById(cargaDoc._id)
      .populate({
        path: 'viajeId',
        populate: [
          { path: 'buqueId', model: this.buqueModel },
          { path: 'origenId', model: this.puertoModel },
          { path: 'destinoId', model: this.puertoModel },
        ],
      })
      .lean()
      .exec();

    if (!cargaPop) {
      throw new NotFoundException('Contenedor o carga no encontrada');
    }

    const viajePop = cargaPop.viajeId as unknown as PopulatedViaje | null;
    const llegadaEstimada = viajePop?.fechas?.llegadaEstimada
      ? new Date(viajePop.fechas.llegadaEstimada)
      : new Date();
    const diffMs = llegadaEstimada.getTime() - Date.now();
    const diasRestantes = Math.max(
      0,
      Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
    );

    return {
      id: String(cargaPop._id),
      codigoContenedor: cargaPop.codigoContenedor,
      tipo: cargaPop.tipo,
      pesoToneladas: cargaPop.pesoToneladas,
      clienteId: String(cargaPop.clienteId),
      viaje: viajePop
        ? {
            id: String(viajePop._id),
            codigo: viajePop.codigo,
            buque: viajePop.buqueId?.nombre ?? 'N/A',
            origen: viajePop.origenId
              ? `${viajePop.origenId.ciudad} (${viajePop.origenId.nombre} - ${viajePop.origenId.pais})`
              : 'N/A',
            destino: viajePop.destinoId
              ? `${viajePop.destinoId.ciudad} (${viajePop.destinoId.nombre} - ${viajePop.destinoId.pais})`
              : 'N/A',
            fechas: viajePop.fechas,
            estado: viajePop.estado,
            diasRestantes,
            ultimaPosicion: viajePop.ultimaPosicion ?? null,
          }
        : null,
      eventos: cargaPop.historialEventos.map((ev) => ({
        estado: ev.estado,
        fecha: ev.fecha,
        ubicacion: ev.ubicacion,
        completado: ev.completado ?? true,
      })),
    };
  }

  async obtenerTimeline(idOrCodigo: string, user?: JwtPayload) {
    const carga = await this.buscarCargaDocumento(idOrCodigo);
    this.verificarAccesoCliente(carga, user);

    return {
      codigoContenedor: carga.codigoContenedor,
      eventos: carga.historialEventos.map((ev) => ({
        estado: ev.estado,
        fecha: ev.fecha,
        ubicacion: ev.ubicacion,
        completado: ev.completado ?? true,
      })),
    };
  }

  async crearCarga(dto: CreateCargaDto) {
    const codigoNormalizado = dto.codigoContenedor.startsWith('#')
      ? dto.codigoContenedor.trim()
      : `#${dto.codigoContenedor.trim()}`;

    const existente = await this.cargaModel
      .findOne({ codigoContenedor: codigoNormalizado })
      .lean()
      .exec();
    if (existente) {
      throw new ConflictException(
        `Ya existe un contenedor registrado con el código ${codigoNormalizado}`,
      );
    }

    const viaje = await this.viajeModel.findById(dto.viajeId).exec();
    if (!viaje) {
      throw new NotFoundException('El viaje marítimo especificado no existe');
    }

    const nuevaCarga = await this.cargaModel.create({
      viajeId: new Types.ObjectId(dto.viajeId),
      clienteId: new Types.ObjectId(dto.clienteId),
      codigoContenedor: codigoNormalizado,
      tipo: dto.tipo,
      pesoToneladas: dto.pesoToneladas,
      historialEventos: [
        {
          estado: 'Registrado en terminal de origen',
          fecha: new Date(),
          ubicacion: dto.ubicacionInicial ?? 'Puerto de Origen',
          completado: true,
        },
      ],
    });

    viaje.resumenCarga = {
      contenedores: (viaje.resumenCarga?.contenedores ?? 0) + 1,
      toneladas: Number(
        ((viaje.resumenCarga?.toneladas ?? 0) + dto.pesoToneladas).toFixed(2),
      ),
    };
    await viaje.save();
    await this.redisService.invalidarKpiResumen();

    return nuevaCarga;
  }

  async agregarEventoTimeline(idOrCodigo: string, dto: AddEventoTimelineDto) {
    const carga = await this.buscarCargaDocumento(idOrCodigo);

    carga.historialEventos.push({
      estado: dto.estado.trim(),
      ubicacion: dto.ubicacion.trim(),
      fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
      completado: dto.completado ?? true,
    });

    await carga.save();

    return {
      codigoContenedor: carga.codigoContenedor,
      eventos: carga.historialEventos,
    };
  }

  async listarViajes() {
    return this.viajeModel
      .find()
      .populate('buqueId')
      .populate('origenId')
      .populate('destinoId')
      .lean()
      .exec();
  }

  async obtenerViajePorId(idOrCodigo: string) {
    let viaje = isValidObjectId(idOrCodigo)
      ? await this.viajeModel
          .findById(idOrCodigo)
          .populate('buqueId')
          .populate('origenId')
          .populate('destinoId')
          .lean()
          .exec()
      : null;

    if (!viaje) {
      viaje = await this.viajeModel
        .findOne({ codigo: idOrCodigo })
        .populate('buqueId')
        .populate('origenId')
        .populate('destinoId')
        .lean()
        .exec();
    }

    if (!viaje) {
      throw new NotFoundException('Viaje marítimo no encontrado');
    }

    return viaje;
  }

  async crearViaje(dto: CreateViajeDto) {
    const existente = await this.viajeModel
      .findOne({ codigo: dto.codigo.trim() })
      .lean()
      .exec();
    if (existente) {
      throw new ConflictException(
        `Ya existe un viaje con el código ${dto.codigo}`,
      );
    }

    const puertoOrigen = await this.puertoModel
      .findById(dto.origenId)
      .lean()
      .exec();
    const coordenadasIniciales: [number, number] =
      dto.coordenadas ??
      puertoOrigen?.ubicacion?.coordinates ?? [122.065, 30.626];

    const estadoInicial = dto.estado ?? 'programado';

    const nuevoViaje = await this.viajeModel.create({
      codigo: dto.codigo.trim(),
      buqueId: new Types.ObjectId(dto.buqueId),
      origenId: new Types.ObjectId(dto.origenId),
      destinoId: new Types.ObjectId(dto.destinoId),
      fechas: {
        salida: new Date(dto.fechaSalida),
        llegadaEstimada: new Date(dto.fechaLlegadaEstimada),
      },
      estado: estadoInicial,
      ultimaPosicion: {
        type: 'Point',
        coordinates: coordenadasIniciales,
      },
      resumenCarga: {
        contenedores: dto.contenedores ?? 0,
        toneladas: dto.toneladas ?? 0,
      },
    });

    if (estadoInicial === 'retrasado') {
      await this.redisService.agregarAlerta(
        `viaje_retrasado:${nuevoViaje.codigo}`,
      );
    }

    await this.redisService.invalidarKpiResumen();
    return nuevoViaje;
  }

  async actualizarEstadoViaje(idOrCodigo: string, dto: UpdateEstadoViajeDto) {
    const viaje = isValidObjectId(idOrCodigo)
      ? await this.viajeModel.findById(idOrCodigo).exec()
      : await this.viajeModel.findOne({ codigo: idOrCodigo }).exec();

    if (!viaje) {
      throw new NotFoundException('Viaje marítimo no encontrado');
    }

    if (dto.estado) {
      viaje.estado = dto.estado;
      if (dto.estado === 'retrasado') {
        await this.redisService.agregarAlerta(
          `viaje_retrasado:${viaje.codigo}`,
        );
      } else {
        await this.redisService.eliminarAlerta(
          `viaje_retrasado:${viaje.codigo}`,
        );
      }

      if (dto.estado === 'finalizado' && !viaje.fechas.llegadaReal) {
        viaje.fechas = {
          ...viaje.fechas,
          llegadaReal: dto.fechaLlegadaReal
            ? new Date(dto.fechaLlegadaReal)
            : new Date(),
        };
      }
    }

    if (dto.fechaLlegadaReal) {
      viaje.fechas = {
        ...viaje.fechas,
        llegadaReal: new Date(dto.fechaLlegadaReal),
      };
    }

    if (dto.coordenadas) {
      viaje.ultimaPosicion = {
        type: 'Point',
        coordinates: dto.coordenadas,
      };
    }

    await viaje.save();
    await this.redisService.invalidarKpiResumen();

    return this.obtenerViajePorId(String(viaje._id));
  }
}

