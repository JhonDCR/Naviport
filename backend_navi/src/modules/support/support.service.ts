import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import {
  AuditoriaLog,
  AuditoriaLogDocument,
  Notificacion,
  NotificacionDocument,
  TicketSoporte,
  TicketSoporteDocument,
} from '../../database/schemas';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../../common/interfaces/api-response.interface';
import {
  CreateTicketSoporteDto,
  ResponderTicketSoporteDto,
} from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(TicketSoporte.name)
    private readonly ticketModel: Model<TicketSoporteDocument>,
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
    @InjectModel(AuditoriaLog.name)
    private readonly auditoriaLogModel: Model<AuditoriaLogDocument>,
    private readonly redisService: RedisService,
  ) {}

  async crearTicket(user: JwtPayload, dto: CreateTicketSoporteDto) {
    const totalPrevios = await this.ticketModel.countDocuments().exec();
    const anio = new Date().getFullYear();
    const codigo = `TKT-${anio}-${String(totalPrevios + 1).padStart(3, '0')}`;

    const usuarioObjId = isValidObjectId(user.sub)
      ? new Types.ObjectId(user.sub)
      : new Types.ObjectId();

    const nuevoTicket = await this.ticketModel.create({
      codigo,
      usuarioId: usuarioObjId,
      rolUsuario: user.rol,
      tipo: dto.tipo,
      asunto: dto.asunto.trim(),
      mensaje: dto.mensaje.trim(),
      codigoContenedor: dto.codigoContenedor?.trim(),
      prioridad: dto.prioridad ?? 'media',
      estado: 'abierto',
    });

    const rolDestino =
      dto.tipo === 'supervisor' || dto.tipo === 'agente_aduanas'
        ? 'gerente'
        : 'admin';

    await Promise.all([
      this.notificacionModel.create({
        rolDestino,
        tipo: 'soporte',
        titulo: `Nuevo ticket ${codigo}: ${dto.asunto.trim()}`,
        mensaje: `Solicitud (${dto.tipo}) enviada por ${user.nombre}.`,
        codigoContenedor: dto.codigoContenedor?.trim(),
        referenciaId: String(nuevoTicket._id),
        leida: false,
      }),
      this.redisService.registrarAuditoria({
        usuarioId: user.sub,
        accion: 'CREAR_TICKET_SOPORTE',
        entidad: 'tickets_soporte',
        detalle: `Ticket ${codigo} (${dto.tipo}) creado`,
      }),
      this.auditoriaLogModel.create({
        usuarioId: user.sub,
        accion: 'CREAR_TICKET_SOPORTE',
        entidad: 'tickets_soporte',
        entidadId: String(nuevoTicket._id),
        detalle: `Ticket ${codigo} (${dto.tipo}) creado`,
        fecha: new Date(),
      }),
    ]);

    return nuevoTicket;
  }

  async obtenerMisTickets(user: JwtPayload) {
    if (!isValidObjectId(user.sub)) {
      return [];
    }
    return this.ticketModel
      .find({ usuarioId: new Types.ObjectId(user.sub) })
      .populate('atendidoPor', '-password_hash')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async listarTickets(filtros?: { estado?: string; tipo?: string }) {
    const query: Record<string, unknown> = {};
    if (
      filtros?.estado &&
      ['abierto', 'en_proceso', 'resuelto', 'cerrado'].includes(filtros.estado)
    ) {
      query.estado = filtros.estado;
    }
    if (
      filtros?.tipo &&
      ['agente_aduanas', 'supervisor', 'fallo_app', 'consulta_general'].includes(
        filtros.tipo,
      )
    ) {
      query.tipo = filtros.tipo;
    }

    return this.ticketModel
      .find(query)
      .populate('usuarioId', '-password_hash')
      .populate('atendidoPor', '-password_hash')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async responderTicket(
    id: string,
    dto: ResponderTicketSoporteDto,
    adminUser: JwtPayload,
  ) {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) {
      throw new NotFoundException('Ticket de soporte no encontrado');
    }

    ticket.respuesta = dto.respuesta.trim();
    ticket.estado = dto.estado ?? 'resuelto';
    ticket.fechaRespuesta = new Date();
    if (isValidObjectId(adminUser.sub)) {
      ticket.atendidoPor = new Types.ObjectId(adminUser.sub);
    }

    await ticket.save();

    await Promise.all([
      this.notificacionModel.create({
        usuarioId: ticket.usuarioId,
        tipo: 'soporte',
        titulo: `Respuesta a ticket ${ticket.codigo}`,
        mensaje: dto.respuesta.trim(),
        codigoContenedor: ticket.codigoContenedor,
        referenciaId: String(ticket._id),
        leida: false,
      }),
      this.redisService.registrarAuditoria({
        usuarioId: adminUser.sub,
        accion: 'RESPONDER_TICKET_SOPORTE',
        entidad: 'tickets_soporte',
        detalle: `Ticket ${ticket.codigo} actualizado a ${ticket.estado}`,
      }),
      this.auditoriaLogModel.create({
        usuarioId: adminUser.sub,
        accion: 'RESPONDER_TICKET_SOPORTE',
        entidad: 'tickets_soporte',
        entidadId: String(ticket._id),
        detalle: `Ticket ${ticket.codigo} actualizado a ${ticket.estado}`,
        fecha: new Date(),
      }),
    ]);

    return this.ticketModel
      .findById(ticket._id)
      .populate('usuarioId', '-password_hash')
      .populate('atendidoPor', '-password_hash')
      .lean()
      .exec();
  }
}
