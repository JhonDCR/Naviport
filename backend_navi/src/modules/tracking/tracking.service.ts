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
  Notificacion,
  NotificacionDocument,
  Puerto,
  PuertoDocument,
  Usuario,
  UsuarioDocument,
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
  UpdateViajeDto,
} from './dto/tracking.dto';

interface PopulatedViaje {
  _id: Types.ObjectId;
  codigo: string;
  buqueId?: {
    _id?: Types.ObjectId;
    nombre: string;
    imo?: string;
    bandera?: string;
    capitan?: string;
  };
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
  velocidadNudos?: number;
  capitanAsignado?: string;
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
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
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

  async obtenerResumenCliente(user: JwtPayload) {
    const todas = await this.obtenerMisCargas(user);
    const enCurso = todas.filter((c) => c.viaje.estado !== 'finalizado');
    const completados = todas.filter((c) => c.viaje.estado === 'finalizado');
    const toneladasTotales = Number(
      todas.reduce((acc, c) => acc + c.pesoToneladas, 0).toFixed(2),
    );
    const proximoArriboDias =
      enCurso.length > 0
        ? Math.min(...enCurso.map((c) => c.viaje.diasRestantes))
        : 0;

    return {
      totalContenedores: todas.length,
      enCurso: enCurso.length,
      completados: completados.length,
      toneladasTotales,
      proximoArriboDias,
      cargaDestacada: enCurso[0] ?? todas[0] ?? null,
    };
  }

  async obtenerNotificacionesCliente(user: JwtPayload) {
    const leidasIds = new Set(
      await this.redisService.obtenerNotificacionesLeidas(user.sub),
    );

    const filtrosNotif: Array<Record<string, unknown>> = [
      { rolDestino: user.rol },
    ];
    if (isValidObjectId(user.sub)) {
      filtrosNotif.unshift({ usuarioId: new Types.ObjectId(user.sub) });
    }

    const persistidas = (await this.notificacionModel
      .find({ $or: filtrosNotif })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()
      .exec()) as unknown as Array<{
      _id: Types.ObjectId;
      tipo: string;
      titulo: string;
      mensaje: string;
      codigoContenedor?: string;
      leida: boolean;
      createdAt?: Date;
    }>;

    const notificaciones: Array<{
      id: string;
      tipo: string;
      titulo: string;
      mensaje: string;
      codigoContenedor: string | null;
      fecha: Date;
      leida: boolean;
    }> = persistidas.map((n) => ({
      id: String(n._id),
      tipo: n.tipo,
      titulo: n.titulo,
      mensaje: n.mensaje,
      codigoContenedor: n.codigoContenedor ?? null,
      fecha: n.createdAt ?? new Date(),
      leida: Boolean(n.leida) || leidasIds.has(String(n._id)),
    }));

    if (user.rol === RolUsuario.CLIENTE || user.rol === RolUsuario.ADMIN) {
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

      for (const c of cargas) {
        const viajePop = c.viajeId as unknown as PopulatedViaje | null;
        if (viajePop?.estado === 'retrasado') {
          const id = `notif-retraso-${String(c._id)}`;
          notificaciones.push({
            id,
            tipo: 'retraso',
            titulo: `Viaje retrasado (${viajePop.codigo})`,
            mensaje: `El contenedor ${c.codigoContenedor} en el buque ${viajePop.buqueId?.nombre ?? 'asignado'} registra retraso en ruta.`,
            codigoContenedor: c.codigoContenedor,
            fecha: new Date(),
            leida: leidasIds.has(id),
          });
        } else if (viajePop?.fechas?.llegadaEstimada) {
          const diffDias = Math.max(
            0,
            Math.ceil(
              (new Date(viajePop.fechas.llegadaEstimada).getTime() -
                Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          if (diffDias <= 7) {
            const id = `notif-arribo-${String(c._id)}`;
            notificaciones.push({
              id,
              tipo: 'arribo_proximo',
              titulo: `Arribo estimado en ${diffDias} días`,
              mensaje: `Tu contenedor ${c.codigoContenedor} llegará pronto a ${viajePop.destinoId?.ciudad ?? 'puerto de destino'}.`,
              codigoContenedor: c.codigoContenedor,
              fecha: new Date(),
              leida: leidasIds.has(id),
            });
          }
        }

        const eventosCompletados = c.historialEventos.filter(
          (ev) => ev.completado !== false,
        );
        const ultimoEvento =
          eventosCompletados[eventosCompletados.length - 1] ??
          c.historialEventos[0];

        if (ultimoEvento) {
          const id = `notif-ev-${String(c._id)}`;
          notificaciones.push({
            id,
            tipo: 'evento_timeline',
            titulo: `${c.codigoContenedor}: ${ultimoEvento.estado}`,
            mensaje: `Ubicación registrada: ${ultimoEvento.ubicacion}`,
            codigoContenedor: c.codigoContenedor,
            fecha: ultimoEvento.fecha,
            leida: leidasIds.has(id),
          });
        }
      }
    }

    return notificaciones;
  }

  async marcarNotificacionLeida(user: JwtPayload, notificacionId: string) {
    await this.redisService.marcarNotificacionLeida(user.sub, notificacionId);
    if (isValidObjectId(notificacionId)) {
      await this.notificacionModel
        .findByIdAndUpdate(notificacionId, {
          leida: true,
          fechaLectura: new Date(),
        })
        .exec();
    }
    return {
      id: notificacionId,
      leida: true,
    };
  }

  async marcarTodasNotificacionesLeidas(user: JwtPayload) {
    const notificaciones = await this.obtenerNotificacionesCliente(user);
    const ids = notificaciones.map((n) => n.id);
    await this.redisService.marcarTodasNotificacionesLeidas(user.sub, ids);

    const filtrosNotif: Array<Record<string, unknown>> = [
      { rolDestino: user.rol },
    ];
    if (isValidObjectId(user.sub)) {
      filtrosNotif.unshift({ usuarioId: new Types.ObjectId(user.sub) });
    }
    await this.notificacionModel
      .updateMany(
        { $or: filtrosNotif, leida: false },
        { leida: true, fechaLectura: new Date() },
      )
      .exec();

    return {
      totalMarcadas: ids.length,
    };
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
      numeroPrecinto: cargaPop.numeroPrecinto ?? null,
      valorFleteUSD: cargaPop.valorFleteUSD ?? 0,
      manifiestoAduanero: cargaPop.manifiestoAduanero ?? null,
      clienteId: String(cargaPop.clienteId),
      viaje: viajePop
        ? {
            id: String(viajePop._id),
            codigo: viajePop.codigo,
            buque: viajePop.buqueId?.nombre ?? 'N/A',
            imo: viajePop.buqueId?.imo ?? null,
            capitan:
              viajePop.capitanAsignado ??
              viajePop.buqueId?.capitan ??
              'Luis Andrade',
            velocidadNudos: viajePop.velocidadNudos ?? 21.4,
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
        descripcion: ev.descripcion ?? null,
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
        descripcion: ev.descripcion ?? null,
        completado: ev.completado ?? true,
      })),
    };
  }

  async obtenerManifiestoCarga(idOrCodigo: string, user?: JwtPayload) {
    const detalle = await this.obtenerDetalleCarga(idOrCodigo, user);
    const cliente = isValidObjectId(detalle.clienteId)
      ? await this.usuarioModel
          .findById(detalle.clienteId)
          .select('-password_hash')
          .lean()
          .exec()
      : null;

    const numeroDocumento =
      detalle.manifiestoAduanero?.numeroDocumento ??
      `BL-${detalle.codigoContenedor.replace('#', '')}-2026`;

    return {
      numeroDocumento,
      fechaEmision:
        detalle.manifiestoAduanero?.fechaEmision ?? new Date().toISOString(),
      partidaArancelaria:
        detalle.manifiestoAduanero?.partidaArancelaria ?? '8471.30.00.00',
      estadoAduana: detalle.manifiestoAduanero?.estadoAduana ?? 'declarado',
      consignatario: {
        nombre: cliente?.nombre ?? 'Importador',
        empresa: cliente?.detallesPerfil?.empresa ?? cliente?.nombre ?? 'N/A',
        ruc: cliente?.detallesPerfil?.ruc ?? 'N/A',
        direccionLegal:
          cliente?.detallesPerfil?.direccionLegal ?? 'Guayaquil, Ecuador',
      },
      contenedor: {
        codigo: detalle.codigoContenedor,
        tipo: detalle.tipo,
        pesoToneladas: detalle.pesoToneladas,
        numeroPrecinto: detalle.numeroPrecinto ?? '#MSK-4409',
        valorFleteUSD: detalle.valorFleteUSD,
      },
      embarque: detalle.viaje,
      eventos: detalle.eventos,
    };
  }

  async listarTodasCargas(filtros?: {
    viajeId?: string;
    clienteId?: string;
    q?: string;
  }) {
    const query: Record<string, unknown> = {};
    if (filtros?.viajeId && isValidObjectId(filtros.viajeId)) {
      query.viajeId = new Types.ObjectId(filtros.viajeId);
    }
    if (filtros?.clienteId && isValidObjectId(filtros.clienteId)) {
      query.clienteId = new Types.ObjectId(filtros.clienteId);
    }

    const cargas = await this.cargaModel
      .find(query)
      .populate('clienteId', '-password_hash')
      .populate({
        path: 'viajeId',
        populate: [
          { path: 'buqueId', model: this.buqueModel },
          { path: 'origenId', model: this.puertoModel },
          { path: 'destinoId', model: this.puertoModel },
        ],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (filtros?.q && filtros.q.trim().length > 0) {
      const term = filtros.q.trim().toLowerCase();
      return cargas.filter((c) => {
        const viaje = c.viajeId as unknown as PopulatedViaje | null;
        return (
          c.codigoContenedor.toLowerCase().includes(term) ||
          (viaje?.codigo ?? '').toLowerCase().includes(term) ||
          (viaje?.buqueId?.nombre ?? '').toLowerCase().includes(term)
        );
      });
    }

    return cargas;
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

    const numeroDoc = `BL-${codigoNormalizado.replace('#', '')}-${new Date().getFullYear()}`;
    const nuevaCarga = await this.cargaModel.create({
      viajeId: new Types.ObjectId(dto.viajeId),
      clienteId: new Types.ObjectId(dto.clienteId),
      codigoContenedor: codigoNormalizado,
      tipo: dto.tipo,
      pesoToneladas: dto.pesoToneladas,
      numeroPrecinto: dto.numeroPrecinto?.trim() ?? '#MSK-0001',
      valorFleteUSD: dto.valorFleteUSD ?? 0,
      manifiestoAduanero: {
        numeroDocumento: numeroDoc,
        fechaEmision: new Date(),
        partidaArancelaria: dto.partidaArancelaria ?? '8471.30.00.00',
        estadoAduana: 'declarado',
      },
      historialEventos: [
        {
          estado: 'Registrado en terminal de origen',
          fecha: new Date(),
          ubicacion: dto.ubicacionInicial ?? 'Puerto de Origen',
          descripcion: `Contenedor ${codigoNormalizado} ingresado y manifestado en terminal.`,
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

  async agregarEventoTimeline(
    idOrCodigo: string,
    dto: AddEventoTimelineDto,
    operadorId?: string,
  ) {
    const carga = await this.buscarCargaDocumento(idOrCodigo);

    carga.historialEventos.push({
      estado: dto.estado.trim(),
      ubicacion: dto.ubicacion.trim(),
      descripcion: dto.descripcion?.trim(),
      registradoPor:
        operadorId && isValidObjectId(operadorId)
          ? new Types.ObjectId(operadorId)
          : undefined,
      fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
      completado: dto.completado ?? true,
    });

    await carga.save();

    await this.notificacionModel.create({
      usuarioId: carga.clienteId,
      tipo: 'evento_timeline',
      titulo: `${carga.codigoContenedor}: ${dto.estado.trim()}`,
      mensaje: `Ubicación registrada: ${dto.ubicacion.trim()}`,
      codigoContenedor: carga.codigoContenedor,
      referenciaId: String(carga._id),
      leida: false,
    });

    return {
      codigoContenedor: carga.codigoContenedor,
      eventos: carga.historialEventos,
    };
  }

  private async notificarRetrasoAClientes(
    viajeId: Types.ObjectId,
    codigoViaje: string,
  ): Promise<void> {
    const cargas = await this.cargaModel
      .find({ viajeId })
      .select('clienteId codigoContenedor')
      .lean()
      .exec();

    if (cargas.length === 0) return;

    await this.notificacionModel.insertMany(
      cargas.map((c) => ({
        usuarioId: c.clienteId,
        tipo: 'retraso',
        titulo: `Viaje retrasado (${codigoViaje})`,
        mensaje: `El contenedor ${c.codigoContenedor} registra una actualización de retraso en su ruta marítima.`,
        codigoContenedor: c.codigoContenedor,
        referenciaId: String(viajeId),
        leida: false,
      })),
    );
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

    const buque = await this.buqueModel.findById(dto.buqueId).lean().exec();

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
      velocidadNudos: dto.velocidadNudos ?? 21.4,
      capitanAsignado: dto.capitanAsignado ?? buque?.capitan ?? 'Luis Andrade',
      ultimaPosicion: {
        type: 'Point',
        coordinates: coordenadasIniciales,
      },
      resumenCarga: {
        contenedores: dto.contenedores ?? 0,
        toneladas: dto.toneladas ?? 0,
      },
      finanzas: {
        ingresosEstimadosUSD: dto.ingresosEstimadosUSD ?? 0,
        costoOperativoUSD: dto.costoOperativoUSD ?? 0,
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
        await this.notificarRetrasoAClientes(viaje._id, viaje.codigo);
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

    if (dto.velocidadNudos !== undefined) {
      viaje.velocidadNudos = dto.velocidadNudos;
    }

    await viaje.save();
    await this.redisService.invalidarKpiResumen();

    return this.obtenerViajePorId(String(viaje._id));
  }

  async actualizarViaje(idOrCodigo: string, dto: UpdateViajeDto) {
    const viaje = isValidObjectId(idOrCodigo)
      ? await this.viajeModel.findById(idOrCodigo).exec()
      : await this.viajeModel.findOne({ codigo: idOrCodigo }).exec();

    if (!viaje) {
      throw new NotFoundException('Viaje marítimo no encontrado');
    }

    if (dto.buqueId) viaje.buqueId = new Types.ObjectId(dto.buqueId);
    if (dto.origenId) viaje.origenId = new Types.ObjectId(dto.origenId);
    if (dto.destinoId) viaje.destinoId = new Types.ObjectId(dto.destinoId);
    if (dto.velocidadNudos !== undefined)
      viaje.velocidadNudos = dto.velocidadNudos;
    if (dto.capitanAsignado !== undefined)
      viaje.capitanAsignado = dto.capitanAsignado;

    if (dto.fechaSalida || dto.fechaLlegadaEstimada || dto.fechaLlegadaReal) {
      viaje.fechas = {
        salida: dto.fechaSalida ? new Date(dto.fechaSalida) : viaje.fechas.salida,
        llegadaEstimada: dto.fechaLlegadaEstimada
          ? new Date(dto.fechaLlegadaEstimada)
          : viaje.fechas.llegadaEstimada,
        llegadaReal: dto.fechaLlegadaReal
          ? new Date(dto.fechaLlegadaReal)
          : viaje.fechas.llegadaReal,
      };
    }

    if (
      dto.ingresosEstimadosUSD !== undefined ||
      dto.costoOperativoUSD !== undefined
    ) {
      viaje.finanzas = {
        ingresosEstimadosUSD:
          dto.ingresosEstimadosUSD ?? viaje.finanzas?.ingresosEstimadosUSD ?? 0,
        costoOperativoUSD:
          dto.costoOperativoUSD ?? viaje.finanzas?.costoOperativoUSD ?? 0,
      };
    }

    if (dto.coordenadas) {
      viaje.ultimaPosicion = {
        type: 'Point',
        coordinates: dto.coordenadas,
      };
    }

    if (dto.estado) {
      viaje.estado = dto.estado;
      if (dto.estado === 'retrasado') {
        await this.redisService.agregarAlerta(
          `viaje_retrasado:${viaje.codigo}`,
        );
        await this.notificarRetrasoAClientes(viaje._id, viaje.codigo);
      } else {
        await this.redisService.eliminarAlerta(
          `viaje_retrasado:${viaje.codigo}`,
        );
      }
    }

    await viaje.save();
    await this.redisService.invalidarKpiResumen();

    return this.obtenerViajePorId(String(viaje._id));
  }

  async eliminarViaje(idOrCodigo: string) {
    const viaje = isValidObjectId(idOrCodigo)
      ? await this.viajeModel.findById(idOrCodigo).exec()
      : await this.viajeModel.findOne({ codigo: idOrCodigo }).exec();

    if (!viaje) {
      throw new NotFoundException('Viaje marítimo no encontrado');
    }

    const cargasAsociadas = await this.cargaModel
      .countDocuments({ viajeId: viaje._id })
      .exec();
    if (cargasAsociadas > 0) {
      throw new ConflictException(
        'No se puede eliminar un viaje que ya tiene contenedores asignados',
      );
    }

    await this.redisService.eliminarAlerta(`viaje_retrasado:${viaje.codigo}`);
    await this.viajeModel.findByIdAndDelete(viaje._id).exec();
    await this.redisService.invalidarKpiResumen();

    return {
      eliminado: true,
      codigo: viaje.codigo,
    };
  }
}

