import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificacionDocument = HydratedDocument<Notificacion>;

export type TipoNotificacion =
  | 'retraso'
  | 'arribo_proximo'
  | 'evento_timeline'
  | 'incidente'
  | 'escaner'
  | 'turno'
  | 'soporte'
  | 'sistema';

@Schema({ collection: 'notificaciones', timestamps: true })
export class Notificacion {
  @Prop({ type: Types.ObjectId, ref: 'Usuario', index: true })
  usuarioId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['cliente', 'operador', 'gerente', 'admin'],
    index: true,
  })
  rolDestino?: string;

  @Prop({
    required: true,
    type: String,
    enum: [
      'retraso',
      'arribo_proximo',
      'evento_timeline',
      'incidente',
      'escaner',
      'turno',
      'soporte',
      'sistema',
    ],
  })
  tipo: TipoNotificacion;

  @Prop({ required: true, trim: true })
  titulo: string;

  @Prop({ required: true, trim: true })
  mensaje: string;

  @Prop({ trim: true })
  codigoContenedor?: string;

  @Prop({ trim: true })
  referenciaId?: string;

  @Prop({ default: false })
  leida: boolean;

  @Prop()
  fechaLectura?: Date;
}

export const NotificacionSchema = SchemaFactory.createForClass(Notificacion);
NotificacionSchema.index({ usuarioId: 1, leida: 1, createdAt: -1 });
NotificacionSchema.index({ rolDestino: 1, leida: 1, createdAt: -1 });
