import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditoriaLogDocument = HydratedDocument<AuditoriaLog>;

@Schema({ collection: 'auditoria_logs', timestamps: true })
export class AuditoriaLog {
  @Prop({ required: true, trim: true, index: true })
  usuarioId: string;

  @Prop({ required: true, trim: true, index: true })
  accion: string;

  @Prop({ required: true, trim: true })
  entidad: string;

  @Prop({ trim: true })
  entidadId?: string;

  @Prop({ trim: true })
  detalle?: string;

  @Prop({ default: () => new Date(), index: true })
  fecha: Date;
}

export const AuditoriaLogSchema = SchemaFactory.createForClass(AuditoriaLog);
AuditoriaLogSchema.index({ entidad: 1, accion: 1, fecha: -1 });
