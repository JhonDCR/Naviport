import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TicketSoporteDocument = HydratedDocument<TicketSoporte>;

export type TipoTicketSoporte =
  | 'agente_aduanas'
  | 'supervisor'
  | 'fallo_app'
  | 'consulta_general';

export type PrioridadTicket = 'baja' | 'media' | 'alta';
export type EstadoTicket = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';

@Schema({ collection: 'tickets_soporte', timestamps: true })
export class TicketSoporte {
  @Prop({ required: true, unique: true, trim: true, index: true })
  codigo: string;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true, index: true })
  usuarioId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  rolUsuario: string;

  @Prop({
    required: true,
    type: String,
    enum: ['agente_aduanas', 'supervisor', 'fallo_app', 'consulta_general'],
  })
  tipo: TipoTicketSoporte;

  @Prop({ required: true, trim: true })
  asunto: string;

  @Prop({ required: true, trim: true })
  mensaje: string;

  @Prop({ trim: true })
  codigoContenedor?: string;

  @Prop({
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media',
  })
  prioridad: PrioridadTicket;

  @Prop({
    type: String,
    enum: ['abierto', 'en_proceso', 'resuelto', 'cerrado'],
    default: 'abierto',
  })
  estado: EstadoTicket;

  @Prop({ trim: true })
  respuesta?: string;

  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  atendidoPor?: Types.ObjectId;

  @Prop()
  fechaRespuesta?: Date;
}

export const TicketSoporteSchema = SchemaFactory.createForClass(TicketSoporte);
TicketSoporteSchema.index({ usuarioId: 1, estado: 1, createdAt: -1 });
TicketSoporteSchema.index({ estado: 1, prioridad: 1 });
