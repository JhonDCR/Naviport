import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BuqueDocument = HydratedDocument<Buque>;

export type EstadoBuque = 'activo' | 'mantenimiento' | 'inactivo';
export type EstadoOperativoBuque =
  | 'en_ruta'
  | 'en_puerto'
  | 'retraso'
  | 'mantenimiento'
  | 'inactivo';

@Schema({ collection: 'buques', timestamps: true })
export class Buque {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  imo: string;

  @Prop({ required: true, trim: true })
  tipo: string;

  @Prop({ required: true, min: 0 })
  capacidadToneladas: number;

  @Prop({ required: true, trim: true })
  bandera: string;

  @Prop({ default: 'Luis Andrade', trim: true })
  capitan: string;

  @Prop({
    required: true,
    type: String,
    enum: ['activo', 'mantenimiento', 'inactivo'],
    default: 'activo',
  })
  estado: EstadoBuque;

  @Prop({
    type: String,
    enum: ['en_ruta', 'en_puerto', 'retraso', 'mantenimiento', 'inactivo'],
    default: 'en_ruta',
  })
  estadoOperativo: EstadoOperativoBuque;
}

export const BuqueSchema = SchemaFactory.createForClass(Buque);
BuqueSchema.index({ estado: 1, estadoOperativo: 1 });
