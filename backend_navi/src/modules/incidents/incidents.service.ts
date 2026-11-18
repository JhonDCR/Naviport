import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  AuditoriaLog,
  AuditoriaLogDocument,
  Imagen,
  ImagenDocument,
  Incidente,
  IncidenteDocument,
  Notificacion,
  NotificacionDocument,
  Turno,
  TurnoDocument,
  Viaje,
  ViajeDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import {
  CreateIncidenteDto,
  UpdateEstadoIncidenteDto,
} from './dto/create-incidente.dto';

export interface EvidenciaArchivo {
  originalname: string;
  buffer?: Buffer;
}

@Injectable()
export class IncidentsService {
  constructor(
    @InjectModel(Incidente.name)
    private readonly incidenteModel: Model<IncidenteDocument>,
    @InjectModel(Viaje.name)
    private readonly viajeModel: Model<ViajeDocument>,
    @InjectModel(Imagen.name)
    private readonly imagenModel: Model<ImagenDocument>,
    @InjectModel(Turno.name)
    private readonly turnoModel: Model<TurnoDocument>,
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
    @InjectModel(AuditoriaLog.name)
    private readonly auditoriaLogModel: Model<AuditoriaLogDocument>,
    private readonly redisService: RedisService,
  ) {}

  async reportarIncidente(
    dto: CreateIncidenteDto,
    operadorId: string,
    archivo?: EvidenciaArchivo,
  ) {
    const nuevoIncidente = await this.incidenteModel.create({
      viajeId: new Types.ObjectId(dto.viajeId),
      buqueId: new Types.ObjectId(dto.buqueId),
      operadorId: new Types.ObjectId(operadorId),
      codigoContenedor: dto.codigoContenedor?.trim(),
      tipo: dto.tipo,
      descripcion: dto.descripcion,
      gravedad: dto.gravedad,
      estado: 'abierto',
      fecha: new Date(),
    });

    let evidenciaImagen: { id: string; rutaArchivo: string } | null = null;
    if (archivo || dto.codigoContenedor) {
      const safeName = (archivo?.originalname ?? 'evidencia-incidente.jpg').replace(
        /[^a-zA-Z0-9._-]/g,
        '_',
      );
      const fileName = `${Date.now()}-${safeName}`;
      const rutaArchivo = `/uploads/incidents/${fileName}`;

      if (archivo?.buffer) {
        const dir = join(process.cwd(), 'uploads', 'incidents');
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, fileName), archivo.buffer);
      }

      const imgDoc = await this.imagenModel.create({
        entidadId: new Types.ObjectId(String(nuevoIncidente._id)),
        tipoEntidad: 'incidente',
        operadorId: isValidObjectId(operadorId)
          ? new Types.ObjectId(operadorId)
          : undefined,
        viajeId: new Types.ObjectId(dto.viajeId),
        rutaArchivo,
        resultadoIA: {
          codigoLeido: dto.codigoContenedor ?? 'INCIDENTE-PUERTO',
          dañosDetectados: dto.tipo === 'averia',
          confianza: 90,
          estadoSello: dto.tipo === 'averia' ? 'averia' : 'ok',
        },
      });

      evidenciaImagen = {
        id: String(imgDoc._id),
        rutaArchivo: imgDoc.rutaArchivo,
      };
    }

    const viaje = await this.viajeModel.findById(dto.viajeId).exec();
    const refViaje = viaje?.codigo ?? dto.viajeId;

    if (dto.tipo === 'retraso' || dto.gravedad === 'alta') {
      if (viaje && viaje.estado !== 'finalizado') {
        viaje.estado = 'retrasado';
        await viaje.save();
      }
      await this.redisService.agregarAlerta(`viaje_retrasado:${refViaje}`);
    } else {
      await this.redisService.agregarAlerta(
        `incidente_${dto.tipo}:${refViaje}`,
      );
    }

    await this.redisService.invalidarKpiResumen();

    const ops: Promise<unknown>[] = [
      this.notificacionModel.create({
        rolDestino: 'gerente',
        tipo: 'incidente',
        titulo: `Nuevo incidente (${dto.gravedad.toUpperCase()}) en ${refViaje}`,
        mensaje: dto.descripcion,
        codigoContenedor: dto.codigoContenedor?.trim(),
        referenciaId: String(nuevoIncidente._id),
        leida: false,
      }),
      this.redisService.registrarAuditoria({
        usuarioId: operadorId,
        accion: 'REPORTAR_INCIDENTE',
        entidad: 'incidentes',
        detalle: `Incidente ${dto.tipo} (${dto.gravedad}) en viaje ${refViaje}`,
      }),
      this.auditoriaLogModel.create({
        usuarioId: operadorId,
        accion: 'REPORTAR_INCIDENTE',
        entidad: 'incidentes',
        entidadId: String(nuevoIncidente._id),
        detalle: `Incidente ${dto.tipo} (${dto.gravedad}) en viaje ${refViaje}`,
        fecha: new Date(),
      }),
    ];

    if (isValidObjectId(operadorId)) {
      ops.push(
        this.turnoModel
          .findOneAndUpdate(
            { operadorId: new Types.ObjectId(operadorId), estado: 'activo' },
            { $inc: { incidentesReportados: 1 } },
          )
          .exec(),
      );
    }

    await Promise.all(ops);

    const plainIncidente =
      typeof nuevoIncidente.toObject === 'function'
        ? (nuevoIncidente.toObject() as unknown as Record<string, unknown>)
        : (nuevoIncidente as unknown as Record<string, unknown>);

    return {
      ...plainIncidente,
      evidenciaImagen,
    };
  }

  async listarIncidentes(estado?: string) {
    const query: Record<string, unknown> = {};
    if (estado && ['abierto', 'en_revision', 'resuelto'].includes(estado)) {
      query.estado = estado;
    }

    return this.incidenteModel
      .find(query)
      .populate('viajeId')
      .populate('buqueId')
      .populate('operadorId', '-password_hash')
      .sort({ fecha: -1 })
      .lean()
      .exec();
  }

  async actualizarEstadoIncidente(
    id: string,
    dto: UpdateEstadoIncidenteDto,
    usuarioId: string,
  ) {
    const incidente = await this.incidenteModel.findById(id).exec();
    if (!incidente) {
      throw new NotFoundException('Incidente no encontrado');
    }

    incidente.estado = dto.estado;
    if (dto.estado === 'resuelto') {
      if (isValidObjectId(usuarioId)) {
        incidente.resueltoPor = new Types.ObjectId(usuarioId);
      }
      incidente.fechaResolucion = new Date();

      const viaje = await this.viajeModel.findById(incidente.viajeId).lean().exec();
      const refViaje = viaje?.codigo ?? String(incidente.viajeId);
      await this.redisService.eliminarAlerta(`viaje_retrasado:${refViaje}`);
      await this.redisService.eliminarAlerta(
        `incidente_${incidente.tipo}:${refViaje}`,
      );
    }

    await incidente.save();
    await this.redisService.invalidarKpiResumen();
    await Promise.all([
      this.redisService.registrarAuditoria({
        usuarioId,
        accion: 'ACTUALIZAR_ESTADO_INCIDENTE',
        entidad: 'incidentes',
        detalle: `Incidente ${id} marcado como ${dto.estado}`,
      }),
      this.auditoriaLogModel.create({
        usuarioId,
        accion: 'ACTUALIZAR_ESTADO_INCIDENTE',
        entidad: 'incidentes',
        entidadId: id,
        detalle: `Incidente ${id} marcado como ${dto.estado}`,
        fecha: new Date(),
      }),
    ]);

    return this.incidenteModel
      .findById(incidente._id)
      .populate('viajeId')
      .populate('buqueId')
      .populate('operadorId', '-password_hash')
      .lean()
      .exec();
  }
}
