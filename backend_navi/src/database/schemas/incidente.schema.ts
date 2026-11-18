import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type IncidenteDocument = HydratedDocument<Incidente>;

export type TipoIncidente = 'retraso' | 'averia' | 'clima';
export type GravedadIncidente = 'alta' | 'media' | 'baja';
export type EstadoIncidente = 'abierto' | 'en_revision' | 'resuelto';

@Schema({ collection: 'incidentes', timestamps: true })
export class Incidente {
  @Prop({ type: Types.ObjectId, ref: 'Viaje', required: true, index: true })
  viajeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Buque', required: true, index: true })
  buqueId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  operadorId: Types.ObjectId;

  @Prop({ trim: true })
  codigoContenedor?: string;

  @Prop({
    required: true,
    type: String,
    enum: ['retraso', 'averia', 'clima'],
  })
  tipo: TipoIncidente;

  @Prop({ required: true, trim: true })
  descripcion: string;

  @Prop({
    required: true,
    type: String,
    enum: ['alta', 'media', 'baja'],
    default: 'media',
  })
  gravedad: GravedadIncidente;

  @Prop({
    type: String,
    enum: ['abierto', 'en_revision', 'resuelto'],
    default: 'abierto',
  })
  estado: EstadoIncidente;

  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  resueltoPor?: Types.ObjectId;

  @Prop()
  fechaResolucion?: Date;

  @Prop({ default: () => new Date() })
  fecha: Date;
}

export const IncidenteSchema = SchemaFactory.createForClass(Incidente);
IncidenteSchema.index({ estado: 1, gravedad: 1, fecha: -1 });
